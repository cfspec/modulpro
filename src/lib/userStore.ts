import { UserProfile, UserQuota } from '../types';
// @ts-ignore
import { supabase } from '../supabaseClient';

export interface SavedQuotaData {
  quota: UserProfile['quota'];
  statusPlan: UserProfile['statusPlan'];
}

export const DEFAULT_TRIAL_QUOTA: UserQuota = {
  modulAjar: 2,
  maxModulAjar: 2,
  lkpd: 2,
  maxLkpd: 2,
  soalHots: 0,
  maxSoalHots: 0,
};

export const USER_PROFILES_SETUP_SQL = `-- 1. BUAT TABEL PROFIL & KUOTA TERPUSAT (MULTI-DEVICE & MIDTRANS READY)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    school_name TEXT,
    status_plan TEXT NOT NULL DEFAULT 'Free Trial',
    modul_ajar INTEGER NOT NULL DEFAULT 2,
    max_modul_ajar INTEGER NOT NULL DEFAULT 2,
    lkpd INTEGER NOT NULL DEFAULT 2,
    max_lkpd INTEGER NOT NULL DEFAULT 2,
    soal_hots INTEGER NOT NULL DEFAULT 0,
    max_soal_hots INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. INDEX UNTUK KECEPATAN AKSES & SEARCH EMAIL
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 3. AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. KEBIJAKAN KEAMANAN (Akses data per pengguna terotentikasi)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = id OR auth.jwt() ->> 'email' = email);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" 
ON public.user_profiles FOR UPDATE 
USING (auth.uid() = id OR auth.jwt() ->> 'email' = email);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" 
ON public.user_profiles FOR INSERT 
WITH CHECK (auth.uid() = id OR auth.jwt() ->> 'email' = email);

-- 5. TRIGGER OTOMATIS: SAAT USER BARU DAFTAR AKUN
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    school_name,
    status_plan,
    modul_ajar,
    max_modul_ajar,
    lkpd,
    max_lkpd,
    soal_hots,
    max_soal_hots
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'school_name', 'Sekolah Kurikulum Merdeka'),
    'Free Trial',
    2, -- Jatah awal Modul Ajar
    2,
    2, -- Jatah awal LKPD
    2,
    0, -- Jatah awal Soal HOTS
    0
  )
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. MIGRASIKAN USER YANG SUDAH TERDAFTAR SEBELUMNYA KE TABEL BARU
INSERT INTO public.user_profiles (
  id, email, full_name, school_name, status_plan,
  modul_ajar, max_modul_ajar, lkpd, max_lkpd, soal_hots, max_soal_hots
)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'school_name', 'Sekolah Kurikulum Merdeka'),
  COALESCE(raw_user_meta_data->>'status_plan', 'Free Trial'),
  COALESCE((raw_user_meta_data->'quota'->>'modulAjar')::int, 2),
  COALESCE((raw_user_meta_data->'quota'->>'maxModulAjar')::int, 2),
  COALESCE((raw_user_meta_data->'quota'->>'lkpd')::int, 2),
  COALESCE((raw_user_meta_data->'quota'->>'maxLkpd')::int, 2),
  COALESCE((raw_user_meta_data->'quota'->>'soalHots')::int, 0),
  COALESCE((raw_user_meta_data->'quota'->>'maxSoalHots')::int, 0)
FROM auth.users
ON CONFLICT (email) DO NOTHING;

-- 7. BUAT TABEL TRANSAKSI MIDTRANS UNTUK VERIFIKASI PENDING & TRANSAKSI LUNAS
CREATE TABLE IF NOT EXISTS public.midtrans_transactions (
    order_id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. AKTIFKAN RLS UNTUK TRANSAKSI MIDTRANS
ALTER TABLE public.midtrans_transactions ENABLE ROW LEVEL SECURITY;

-- 9. KEBIJAKAN KEAMANAN: Pengguna hanya bisa melihat riwayat transaksi mereka sendiri
DROP POLICY IF EXISTS "Users can view own transactions" ON public.midtrans_transactions;
CREATE POLICY "Users can view own transactions" 
ON public.midtrans_transactions FOR SELECT 
USING (email = auth.jwt() ->> 'email');`;

/**
 * Cek apakah tabel user_profiles sudah dibuat di Supabase
 */
export async function checkUserProfilesTableReady(): Promise<{ ready: boolean; error?: string }> {
  if (!supabase) return { ready: false, error: 'Supabase client belum terkonfigurasi.' };
  try {
    const { error } = await supabase.from('user_profiles').select('id').limit(1);
    if (error) {
      return { ready: false, error: error.message };
    }
    return { ready: true };
  } catch (err: any) {
    return { ready: false, error: err.message || 'Koneksi ke Supabase terputus.' };
  }
}

/**
 * Ambil kuota dari LocalStorage cache
 */
export function getStoredQuotaForEmail(email: string): SavedQuotaData | null {
  if (!email) return null;
  const saved = localStorage.getItem(`lkpd_pro_quota_${email.toLowerCase().trim()}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Simpan kuota ke LocalStorage cache
 */
export function saveLocalCache(email: string, quota: UserProfile['quota'], statusPlan: UserProfile['statusPlan']) {
  if (!email) return;
  const quotaData: SavedQuotaData = { quota, statusPlan };
  localStorage.setItem(`lkpd_pro_quota_${email.toLowerCase().trim()}`, JSON.stringify(quotaData));
}

/**
 * Fungsi utama untuk mengambil UserProfile terpusat dari Cloud (Supabase).
 * Mencegah celah kuota reset saat berpindah perangkat (laptop, tablet, hp).
 */
export async function getUserProfileFromCloud(sUser: any): Promise<UserProfile> {
  if (!sUser) throw new Error('Pengguna tidak valid');
  const userEmail = (sUser.email || '').toLowerCase().trim();
  const userId = sUser.id;

  // 1. Coba ambil dari tabel public.user_profiles di database Supabase (AUTHORITATIVE)
  if (supabase) {
    try {
      const { data: dbProfile, error: dbError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();

      if (!dbError && dbProfile) {
        // Data ditemukan di tabel user_profiles
        const profile: UserProfile = {
          id: dbProfile.id || userId,
          name: dbProfile.full_name || sUser.user_metadata?.full_name || userEmail.split('@')[0] || 'Bapak/Ibu Guru',
          email: userEmail,
          schoolName: dbProfile.school_name || sUser.user_metadata?.school_name || 'Sekolah Kurikulum Merdeka',
          statusPlan: (dbProfile.status_plan || 'Free Trial') as any,
          joinedDate: new Date(dbProfile.created_at || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          quota: {
            modulAjar: typeof dbProfile.modul_ajar === 'number' ? dbProfile.modul_ajar : 2,
            maxModulAjar: typeof dbProfile.max_modul_ajar === 'number' ? dbProfile.max_modul_ajar : 2,
            lkpd: typeof dbProfile.lkpd === 'number' ? dbProfile.lkpd : 2,
            maxLkpd: typeof dbProfile.max_lkpd === 'number' ? dbProfile.max_lkpd : 2,
            soalHots: typeof dbProfile.soal_hots === 'number' ? dbProfile.soal_hots : 0,
            maxSoalHots: typeof dbProfile.max_soal_hots === 'number' ? dbProfile.max_soal_hots : 0,
          }
        };

        saveLocalCache(userEmail, profile.quota, profile.statusPlan);
        return profile;
      } else if (!dbError && !dbProfile) {
        // Tabel user_profiles ada, tapi baris user ini belum ada: buatkan baris baru
        const metaQuota = sUser.user_metadata?.quota;
        const initialQuota: UserQuota = {
          modulAjar: typeof metaQuota?.modulAjar === 'number' ? metaQuota.modulAjar : 2,
          maxModulAjar: typeof metaQuota?.maxModulAjar === 'number' ? metaQuota.maxModulAjar : 2,
          lkpd: typeof metaQuota?.lkpd === 'number' ? metaQuota.lkpd : 2,
          maxLkpd: typeof metaQuota?.maxLkpd === 'number' ? metaQuota.maxLkpd : 2,
          soalHots: typeof metaQuota?.soalHots === 'number' ? metaQuota.soalHots : 0,
          maxSoalHots: typeof metaQuota?.maxSoalHots === 'number' ? metaQuota.maxSoalHots : 0,
        };
        const statusPlan = sUser.user_metadata?.status_plan || sUser.user_metadata?.statusPlan || 'Free Trial';
        const fullName = sUser.user_metadata?.full_name || userEmail.split('@')[0] || 'Bapak/Ibu Guru';
        const schoolName = sUser.user_metadata?.school_name || 'Sekolah Kurikulum Merdeka';

        try {
          await supabase.from('user_profiles').insert({
            id: userId,
            email: userEmail,
            full_name: fullName,
            school_name: schoolName,
            status_plan: statusPlan,
            modul_ajar: initialQuota.modulAjar,
            max_modul_ajar: initialQuota.maxModulAjar,
            lkpd: initialQuota.lkpd,
            max_lkpd: initialQuota.maxLkpd,
            soal_hots: initialQuota.soalHots,
            max_soal_hots: initialQuota.maxSoalHots,
          });
        } catch (insertErr) {
          console.warn('Gagal insert user_profiles awal:', insertErr);
        }

        const profile: UserProfile = {
          id: userId,
          name: fullName,
          email: userEmail,
          schoolName: schoolName,
          statusPlan: statusPlan as any,
          joinedDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          quota: initialQuota,
        };
        saveLocalCache(userEmail, profile.quota, profile.statusPlan);
        return profile;
      }
    } catch (err) {
      console.warn('Supabase user_profiles query error:', err);
    }
  }

  // 2. Fallback jika tabel user_profiles belum dibuat:
  // Ambil dari user_metadata (dengan proteksi ketat: jika nilainya 0, tetap 0! Jangan diubah jadi 2)
  const metaQuota = sUser.user_metadata?.quota;
  const localSaved = getStoredQuotaForEmail(userEmail);

  let quota: UserQuota;
  if (typeof metaQuota?.modulAjar === 'number') {
    quota = {
      modulAjar: metaQuota.modulAjar,
      maxModulAjar: typeof metaQuota.maxModulAjar === 'number' ? metaQuota.maxModulAjar : 2,
      lkpd: typeof metaQuota.lkpd === 'number' ? metaQuota.lkpd : 2,
      maxLkpd: typeof metaQuota.maxLkpd === 'number' ? metaQuota.maxLkpd : 2,
      soalHots: typeof metaQuota.soalHots === 'number' ? metaQuota.soalHots : 0,
      maxSoalHots: typeof metaQuota.maxSoalHots === 'number' ? metaQuota.maxSoalHots : 0,
    };
  } else if (localSaved && typeof localSaved.quota?.modulAjar === 'number') {
    quota = localSaved.quota;
  } else {
    quota = { ...DEFAULT_TRIAL_QUOTA };
  }

  const profile: UserProfile = {
    id: userId,
    name: sUser.user_metadata?.full_name || userEmail.split('@')[0] || 'Bapak/Ibu Guru',
    email: userEmail,
    schoolName: sUser.user_metadata?.school_name || 'Sekolah Kurikulum Merdeka',
    statusPlan: sUser.user_metadata?.status_plan || sUser.user_metadata?.statusPlan || localSaved?.statusPlan || 'Free Trial',
    joinedDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    quota
  };

  saveLocalCache(userEmail, profile.quota, profile.statusPlan);
  return profile;
}

/**
 * Kurangi kuota langsung di Cloud Database Supabase & Auth Metadata
 */
export async function deductQuotaInCloud(
  currentUser: UserProfile,
  type: 'modulAjar' | 'lkpd' | 'soalHots'
): Promise<UserProfile> {
  const currentVal = currentUser.quota[type];
  if (currentVal <= 0) return currentUser;

  const newVal = currentVal - 1;
  const updatedQuota: UserQuota = {
    ...currentUser.quota,
    [type]: newVal,
  };

  const updatedProfile: UserProfile = {
    ...currentUser,
    quota: updatedQuota,
  };

  const userEmail = currentUser.email.toLowerCase().trim();

  // 1. Simpan ke cache lokal
  saveLocalCache(userEmail, updatedQuota, currentUser.statusPlan);

  // 2. Update langsung ke tabel user_profiles di Supabase
  if (supabase) {
    try {
      const colName = type === 'modulAjar' ? 'modul_ajar' : type === 'lkpd' ? 'lkpd' : 'soal_hots';
      await supabase
        .from('user_profiles')
        .update({
          [colName]: newVal,
          updated_at: new Date().toISOString()
        })
        .eq('email', userEmail);
    } catch (dbErr) {
      console.warn('Gagal update user_profiles di database:', dbErr);
    }

    // 3. Sinkronisasikan ke Supabase Auth user_metadata
    try {
      await supabase.auth.updateUser({
        data: {
          quota: updatedQuota,
          status_plan: currentUser.statusPlan
        }
      });
    } catch (authErr) {
      console.warn('Gagal sync kuota ke auth user_metadata:', authErr);
    }
  }

  return updatedProfile;
}

/**
 * Tambah kuota saat pembelian / transaksi Midtrans berhasil
 */
export async function addQuotaInCloud(
  currentUser: UserProfile,
  amountModul: number,
  amountLKPD: number,
  amountHOTS: number,
  newPlan: UserProfile['statusPlan'] = 'Pro Member'
): Promise<UserProfile> {
  const updatedQuota: UserQuota = {
    ...currentUser.quota,
    modulAjar: currentUser.quota.modulAjar + amountModul,
    maxModulAjar: currentUser.quota.maxModulAjar + amountModul,
    lkpd: currentUser.quota.lkpd + amountLKPD,
    maxLkpd: currentUser.quota.maxLkpd + amountLKPD,
    soalHots: currentUser.quota.soalHots + amountHOTS,
    maxSoalHots: currentUser.quota.maxSoalHots + amountHOTS,
  };

  const updatedProfile: UserProfile = {
    ...currentUser,
    statusPlan: newPlan,
    quota: updatedQuota,
  };

  const userEmail = currentUser.email.toLowerCase().trim();

  // 1. Simpan ke cache lokal
  saveLocalCache(userEmail, updatedQuota, newPlan);

  // 2. Update tabel user_profiles di Supabase
  if (supabase) {
    try {
      await supabase
        .from('user_profiles')
        .update({
          status_plan: newPlan,
          modul_ajar: updatedQuota.modulAjar,
          max_modul_ajar: updatedQuota.maxModulAjar,
          lkpd: updatedQuota.lkpd,
          max_lkpd: updatedQuota.maxLkpd,
          soal_hots: updatedQuota.soalHots,
          max_soal_hots: updatedQuota.maxSoalHots,
          updated_at: new Date().toISOString()
        })
        .eq('email', userEmail);
    } catch (dbErr) {
      console.warn('Gagal update user_profiles saat top up:', dbErr);
    }

    // 3. Update auth user_metadata
    try {
      await supabase.auth.updateUser({
        data: {
          quota: updatedQuota,
          status_plan: newPlan
        }
      });
    } catch (authErr) {
      console.warn('Gagal update auth user_metadata saat top up:', authErr);
    }
  }

  return updatedProfile;
}

// Backward compatibility helper
export function saveQuotaForEmail(email: string, quota: UserProfile['quota'], statusPlan: UserProfile['statusPlan']) {
  saveLocalCache(email, quota, statusPlan);
}
