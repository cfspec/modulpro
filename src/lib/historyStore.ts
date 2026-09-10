// @ts-ignore
import { supabase } from '../supabaseClient';

export interface HistoryItem {
  id: string;
  userEmail: string;
  type: 'modul' | 'lkpd' | 'hots';
  title: string;
  subject: string;
  topic: string;
  grade: string;
  createdDate: string; // ISO String
  data: any; // The full JSON payload
}

// Key for localStorage
const STORAGE_KEY = 'generator_merdeka_history_v1';

// 30 hari dalam milidetik (30 * 24 * 60 * 60 * 1000)
export const EXPIRY_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Filter items that are older than 30 days (client-side safety check)
 */
export const purgeExpiredItems = (items: HistoryItem[]): HistoryItem[] => {
  const thirtyDaysAgo = Date.now() - EXPIRY_PERIOD_MS;
  return items.filter(item => {
    const itemTime = new Date(item.createdDate).getTime();
    return itemTime >= thirtyDaysAgo;
  });
};

/**
 * Otomatis menghapus file / record yang sudah lewat 30 hari langsung di Supabase
 */
const purgeSupabaseExpiredItems = async (): Promise<void> => {
  if (!supabase) return;
  try {
    const thirtyDaysAgoIso = new Date(Date.now() - EXPIRY_PERIOD_MS).toISOString();
    await supabase
      .from('history_items')
      .delete()
      .lt('created_date', thirtyDaysAgoIso);
  } catch (err) {
    // Abaikan jika tabel belum dibuat atau sedang offline
  }
};

/**
 * Cek apakah tabel history_items sudah tersedia dan dapat diakses di Supabase
 */
export const checkSupabaseTableReady = async (): Promise<{ ready: boolean; error?: string }> => {
  if (!supabase) return { ready: false, error: 'Supabase client belum terkonfigurasi.' };
  try {
    const { error } = await supabase.from('history_items').select('id').limit(1);
    if (error) {
      return { ready: false, error: error.message };
    }
    return { ready: true };
  } catch (err: any) {
    return { ready: false, error: err.message || 'Koneksi ke Supabase terputus.' };
  }
};

/**
 * Save a new generated item to history (both LocalStorage and Supabase with 30-day lifecycle)
 */
export const saveHistoryItem = async (
  userEmail: string,
  type: 'modul' | 'lkpd' | 'hots',
  title: string,
  subject: string,
  topic: string,
  grade: string,
  data: any
): Promise<HistoryItem> => {
  const finalEmail = userEmail || 'anonymous';

  const newItem: HistoryItem = {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    userEmail: finalEmail,
    type,
    title,
    subject,
    topic,
    grade,
    createdDate: new Date().toISOString(),
    data
  };

  // 1. Simpan ke LocalStorage terlebih dahulu (offline fallback & respons cepat)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let items: HistoryItem[] = raw ? JSON.parse(raw) : [];
    items.unshift(newItem);
    items = purgeExpiredItems(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save history item to localStorage:', error);
  }

  // 2. Simpan ke Database Supabase & jalankan pembersihan file kadaluarsa 30 hari
  if (supabase && finalEmail !== 'anonymous') {
    try {
      // Jalankan pembersihan kadaluarsa 30 hari di Supabase
      purgeSupabaseExpiredItems().catch(() => {});

      // Dapatkan data sesi atau user login yang valid
      let currentUserId: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          currentUserId = session.user.id;
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) {
            currentUserId = user.id;
          }
        }
      } catch (authErr) {
        console.warn('Could not retrieve user session for Supabase history save:', authErr);
      }

      // Masukkan ke tabel history_items
      const insertPayload: any = {
        id: newItem.id,
        user_email: finalEmail,
        type: newItem.type,
        title: newItem.title,
        subject: newItem.subject,
        topic: newItem.topic,
        grade: newItem.grade,
        created_date: newItem.createdDate,
        data: newItem.data
      };

      if (currentUserId) {
        insertPayload.user_id = currentUserId;
      }

      const { error } = await supabase.from('history_items').insert(insertPayload);

      if (error) {
        console.warn('Catatan: Riwayat gagal disimpan ke Supabase (pastikan tabel history_items sudah dibuat):', error.message);
      }
    } catch (e: any) {
      console.error('Supabase save error:', e);
    }
  }

  return newItem;
};

/**
 * Get all history items, syncing from Supabase if online and authenticated
 */
export const getHistoryItems = async (userEmail: string): Promise<HistoryItem[]> => {
  const emailToQuery = userEmail || 'anonymous';
  
  // 1. Ambil dari local storage terlebih dahulu
  let localItems: HistoryItem[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      localItems = JSON.parse(raw);
      localItems = purgeExpiredItems(localItems);
    }
  } catch (error) {
    console.error('Failed to fetch history items from localStorage:', error);
  }

  // 2. Jika user login, sinkronisasikan dan ambil data dari Supabase
  if (supabase && emailToQuery !== 'anonymous') {
    try {
      // Jalankan pembersihan 30 hari langsung di Supabase
      await purgeSupabaseExpiredItems();

      const { data: sbData, error } = await supabase
        .from('history_items')
        .select('*')
        .eq('user_email', emailToQuery)
        .order('created_date', { ascending: false });

      if (!error && sbData) {
        // Map ke bentuk HistoryItem
        const mappedSbItems: HistoryItem[] = sbData.map((row: any) => ({
          id: row.id,
          userEmail: row.user_email,
          type: row.type,
          title: row.title,
          subject: row.subject,
          topic: row.topic,
          grade: row.grade,
          createdDate: row.created_date,
          data: row.data
        }));

        // Pastikan hanya item aktif yang belum lewat 30 hari
        const activeSbItems = purgeExpiredItems(mappedSbItems);

        // Gabungkan dengan LocalStorage (prioritaskan item dari database Supabase)
        const merged = [...activeSbItems];
        const seenIds = new Set(merged.map(i => i.id));
        
        for (const item of localItems) {
          if (!seenIds.has(item.id) && item.userEmail === emailToQuery) {
            merged.push(item);
            seenIds.add(item.id);
          }
        }

        // Urutkan dari yang paling baru
        merged.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());

        // Perbarui localStorage agar data lokal tetap segar
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      } else if (error) {
        console.warn('Catatan: Query riwayat Supabase belum dapat diproses:', error.message);
      }
    } catch (e) {
      console.error('Supabase query error:', e);
    }
  }

  // Fallback lokal jika Supabase belum terhubung
  return localItems.filter(item => item.userEmail === emailToQuery);
};

/**
 * Delete a specific history item
 */
export const deleteHistoryItem = async (id: string): Promise<void> => {
  // 1. Hapus dari localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      let items: HistoryItem[] = JSON.parse(raw);
      const filtered = items.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (error) {
    console.error('Failed to delete history item from localStorage:', error);
  }

  // 2. Hapus dari Supabase
  if (supabase) {
    try {
      const { error } = await supabase
        .from('history_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Catatan: Gagal menghapus dari Supabase:', error.message);
      }
    } catch (e) {
      console.error('Supabase delete error:', e);
    }
  }
};
