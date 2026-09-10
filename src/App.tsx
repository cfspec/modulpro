import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LKPDForm } from './components/LKPDForm';
import { LKPDView } from './components/LKPDView';
import { ModulForm } from './components/ModulForm';
import { HotsForm } from './components/HotsForm';
import { AuthPage } from './components/AuthPage';
import { UserDashboardModal } from './components/UserDashboardModal';
import { UpgradeModal } from './components/UpgradeModal';
import { LegalModal } from './components/LegalModal';
import { HistoryDashboard } from './components/HistoryDashboard';
import { TabType, LKPDFormData, LKPDGenerated, UserProfile } from './types';
import { SafeQueueLoading } from './components/SafeQueueLoading';
import { getUserProfileFromCloud, deductQuotaInCloud, addQuotaInCloud } from './lib/userStore';
import { saveHistoryItem } from './lib/historyStore';

const INITIAL_MOCK_USER: UserProfile = {
  id: 'usr_default_guru',
  name: 'Bapak/Ibu Guru Indonesia',
  email: 'guru.pro@sekolah.sch.id',
  schoolName: 'SMP Negeri 1 Nusantara',
  statusPlan: 'Free Trial',
  joinedDate: '24 Juli 2026',
  quota: {
    modulAjar: 2,
    maxModulAjar: 2,
    lkpd: 2,
    maxLkpd: 2,
    soalHots: 0,
    maxSoalHots: 0,
  }
};

// @ts-ignore
import { supabase } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      return hash.includes('type=recovery') || search.includes('type=recovery');
    }
    return false;
  });

  // Protect private pages with supabase.auth.getSession() — if no session, redirect to /login
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        if (supabase) {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.warn('Supabase getSession error:', error);
          }

          const isRecovery = typeof window !== 'undefined' && (
            window.location.hash.includes('type=recovery') ||
            window.location.search.includes('type=recovery')
          );

          if (isRecovery) {
            if (isMounted) {
              setIsPasswordRecovery(true);
            }
          } else if (data?.session?.user) {
            const profile = await getUserProfileFromCloud(data.session.user);

            if (isMounted) {
              setUser(profile);
              // Jika sebelumnya di halaman /login, redirect ke halaman utama ("/")
              if (window.location.pathname === '/login') {
                window.history.replaceState({}, '', '/');
              }
            }
          } else {
            // Tidak ada sesi nyata -> lindungi halaman privat, redirect ke /login
            if (isMounted) {
              setUser(null);
              localStorage.removeItem('lkpd_pro_user');
              if (window.location.pathname !== '/login') {
                window.history.replaceState({}, '', '/login');
              }
            }
          }
        } else {
          if (isMounted) {
            setUser(null);
            if (window.location.pathname !== '/login') {
              window.history.replaceState({}, '', '/login');
            }
          }
        }
      } catch (err) {
        console.error('Session check failed:', err);
        if (isMounted) {
          setUser(null);
          if (window.location.pathname !== '/login') {
            window.history.replaceState({}, '', '/login');
          }
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    checkSession();

    let authSubscription: any = null;
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event: string, session: any) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }
        if (!session) {
          setUser(null);
          localStorage.removeItem('lkpd_pro_user');
          if (window.location.pathname !== '/login') {
            window.history.replaceState({}, '', '/login');
          }
        }
      });
      authSubscription = authListener?.subscription;
    }

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  const [activeTab, setActiveTab] = useState<TabType>('lkpd');
  const [generatedLKPD, setGeneratedLKPD] = useState<LKPDGenerated | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queue states for staggered serverless delay
  const [isQueueActive, setIsQueueActive] = useState(false);
  const [queueFormData, setQueueFormData] = useState<LKPDFormData | null>(null);

  // States to hold historical documents to view in native forms
  const [historyModulResult, setHistoryModulResult] = useState<any>(null);
  const [historyModulFormData, setHistoryModulFormData] = useState<any>(null);
  const [historyHotsResult, setHistoryHotsResult] = useState<any>(null);
  const [historyHotsFormData, setHistoryHotsFormData] = useState<any>(null);

  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'disclaimer' | 'privacy' | 'refund'>('disclaimer');

  useEffect(() => {
    if (user) {
      localStorage.setItem('lkpd_pro_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('lkpd_pro_user');
    }
  }, [user]);

  const handleDeductQuota = async (type: 'modulAjar' | 'lkpd' | 'soalHots') => {
    if (!user) return;
    try {
      const updated = await deductQuotaInCloud(user, type);
      setUser(updated);
    } catch (e) {
      console.warn('deductQuotaInCloud error:', e);
    }
  };

  const handleAddQuota = async (amountModul: number, amountLKPD: number, amountHOTS: number) => {
    if (!user) return;
    try {
      const updated = await addQuotaInCloud(user, amountModul, amountLKPD, amountHOTS, 'Pro Member');
      setUser(updated);
    } catch (e) {
      console.warn('addQuotaInCloud error:', e);
    }
  };

  const handleGenerateLKPD = (formData: LKPDFormData) => {
    if (!user) {
      alert("Silakan masuk akun terlebih dahulu.");
      return;
    }

    if (user.quota.lkpd <= 0) {
      setIsUpgradeOpen(true);
      return;
    }

    setQueueFormData(formData);
    setIsQueueActive(true);
    setIsLoading(true);
    setError(null);
  };

  const handleStartLKPDRequest = async () => {
    if (!queueFormData) {
      throw new Error("Data form tidak ditemukan.");
    }
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/generate-lkpd`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queueFormData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Terjadi kesalahan saat memproses data.');
    }

    return await response.json();
  };

  const handleLKPDSuccess = (data: LKPDGenerated) => {
    setGeneratedLKPD(data);
    setIsQueueActive(false);
    setIsLoading(false);
    
    // Save to history
    if (queueFormData) {
      saveHistoryItem(
        user?.email || '',
        'lkpd',
        `LKPD - ${data.identitas?.judul || 'Lembar Kerja'}`,
        queueFormData.mataPelajaran,
        queueFormData.materiPokok,
        queueFormData.kelas ? `Kelas ${queueFormData.kelas}` : 'Semua Kelas',
        data
      );
    }

    handleDeductQuota('lkpd');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLKPDError = (errMessage: string) => {
    setError(errMessage);
    setIsQueueActive(false);
    setIsLoading(false);
  };

  const handleResetLKPD = () => {
    setGeneratedLKPD(null);
    setError(null);
  };

  const handleViewHistoryItem = (item: any) => {
    if (item.type === 'modul') {
      setHistoryModulResult(item.data);
      const info = item.data.informasiUmum;
      setHistoryModulFormData({
        namaGuru: info?.penyusun || '',
        sekolah: info?.instansi || '',
        tahunPembuatan: info?.tahun || '2026',
        mataPelajaran: item.subject || '',
        tingkatSekolah: info?.jenjang || '',
        kelas: info?.kelas || item.grade || '',
        fase: info?.fase || '',
        alokasiWaktu: info?.alokasiWaktu || '2 x 45 menit',
        elemenCPPAI: info?.elemen || '',
        materiPokok: item.topic || '',
        tujuanPembelajaran: info?.tujuanPembelajaran?.join('\n') || '',
        modelPembelajaran: info?.modelPembelajaran || '',
      });
      setActiveTab('modul');
    } else if (item.type === 'hots') {
      setHistoryHotsResult(item.data);
      setHistoryHotsFormData({
        mataPelajaran: item.subject || '',
        tingkatSekolah: 'SMP/MTs',
        kelas: item.grade?.replace(/[^0-9]/g, '') || '8',
        materiPokok: item.topic || '',
        tingkatKesulitan: 'HOTS (C4 - C6)',
        jenisSoal: 'Pilihan Ganda',
        jumlahSoal: item.data.soalList?.length || 5,
        tujuanPembelajaran: '',
      });
      setActiveTab('hots');
    } else if (item.type === 'lkpd') {
      setGeneratedLKPD(item.data);
      setActiveTab('lkpd');
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
    setGeneratedLKPD(null);
    localStorage.removeItem('lkpd_pro_user');
    if (window.location.pathname !== '/login') {
      window.history.pushState({}, '', '/login');
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#070a12] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-gray-400 font-medium">Memverifikasi sesi akun...</span>
        </div>
      </div>
    );
  }

  if (isPasswordRecovery) {
    return (
      <AuthPage
        initialMode="reset_password"
        onLoginSuccess={(loggedInUser) => {
          setIsPasswordRecovery(false);
          setUser(loggedInUser);
        }}
        onPasswordResetComplete={() => {
          setIsPasswordRecovery(false);
        }}
      />
    );
  }

  if (!user) {
    if (window.location.pathname !== '/login') {
      window.history.replaceState({}, '', '/login');
    }
    return <AuthPage onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <div className="min-h-screen bg-[#080b13] text-gray-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'lkpd') {
            handleResetLKPD();
          }
          if (tab !== 'modul') {
            setHistoryModulResult(null);
            setHistoryModulFormData(null);
          }
          if (tab !== 'hots') {
            setHistoryHotsResult(null);
            setHistoryHotsFormData(null);
          }
        }}
        user={user}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        onOpenUpgrade={() => setIsUpgradeOpen(true)}
        onLogout={handleLogout}
        onResetLKPD={handleResetLKPD}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'lkpd' && (
          <>
            {!generatedLKPD ? (
              <LKPDForm
                onGenerate={handleGenerateLKPD}
                isLoading={isLoading}
                error={error}
                quotaLkpd={user.quota.lkpd}
                onOpenUpgrade={() => setIsUpgradeOpen(true)}
              />
            ) : (
              <LKPDView
                lkpd={generatedLKPD}
                onBackToForm={handleResetLKPD}
              />
            )}
          </>
        )}

        {activeTab === 'modul' && (
          <ModulForm
            quotaModul={user.quota.modulAjar}
            onDeductQuota={handleDeductQuota}
            onOpenUpgrade={() => setIsUpgradeOpen(true)}
            initialResult={historyModulResult}
            initialFormData={historyModulFormData}
            userEmail={user.email}
          />
        )}

        {activeTab === 'hots' && (
          <HotsForm
            quotaHots={user.quota.soalHots}
            onDeductQuota={handleDeductQuota}
            onOpenUpgrade={() => setIsUpgradeOpen(true)}
            initialResult={historyHotsResult}
            initialFormData={historyHotsFormData}
            userEmail={user.email}
          />
        )}

        {activeTab === 'riwayat' && (
          <HistoryDashboard
            userEmail={user.email}
            onViewItem={handleViewHistoryItem}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
            }}
          />
        )}
      </main>

      {/* User Dashboard & Quota Modal */}
      <UserDashboardModal
        user={user}
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        onLogout={handleLogout}
        onOpenUpgrade={() => setIsUpgradeOpen(true)}
      />

      {/* Top Up / Upgrade Pro Modal */}
      <UpgradeModal
        user={user}
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        onAddQuota={handleAddQuota}
        onOpenTerms={() => {
          setLegalTab('refund');
          setIsLegalOpen(true);
        }}
      />

      {/* Legal & Privacy Policy Modal */}
      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        defaultTab={legalTab}
      />

      {/* Safe Queue Loading Overlay */}
      <SafeQueueLoading
        isOpen={isQueueActive}
        title="Antrean Pembuatan LKPD AI"
        onStartRequest={handleStartLKPDRequest}
        onSuccess={handleLKPDSuccess}
        onError={handleLKPDError}
        onClose={() => {
          setIsQueueActive(false);
          setIsLoading(false);
        }}
      />

      {/* Footer */}
      <footer className="no-print border-t border-gray-800/80 bg-[#06080e] py-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 CF Digitals - All Rights Reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-gray-400">
            <span
              onClick={() => {
                setLegalTab('disclaimer');
                setIsLegalOpen(true);
              }}
              className="hover:text-white cursor-pointer underline underline-offset-2 transition"
            >
              Disclaimer
            </span>
            <span>•</span>
            <span
              onClick={() => {
                setLegalTab('privacy');
                setIsLegalOpen(true);
              }}
              className="hover:text-white cursor-pointer underline underline-offset-2 transition"
            >
              Kebijakan Privasi
            </span>
            <span>•</span>
            <span
              onClick={() => {
                setLegalTab('refund');
                setIsLegalOpen(true);
              }}
              className="hover:text-white cursor-pointer underline underline-offset-2 font-semibold text-amber-400 hover:text-amber-300 transition"
            >
              Kebijakan Pembelian & Refund
            </span>
            <span>•</span>
            <span
              onClick={() => setIsUpgradeOpen(true)}
              className="hover:text-white cursor-pointer hover:underline transition"
            >
              Membership Pro
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
