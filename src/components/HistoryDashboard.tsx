import React, { useState, useEffect } from 'react';
import { History, Search, FileText, BookOpen, HelpCircle, Trash2, ExternalLink, Calendar, Hourglass, FolderOpen, AlertCircle, Loader2, Database, Check, Copy, Code2, X } from 'lucide-react';
import { getHistoryItems, deleteHistoryItem, checkSupabaseTableReady, HistoryItem } from '../lib/historyStore';

interface HistoryDashboardProps {
  userEmail: string;
  onViewItem: (item: HistoryItem) => void;
  onNavigateTab: (tab: 'modul' | 'lkpd' | 'hots') => void;
}

const SUPABASE_SETUP_SQL = `-- 1. BUAT TABEL RIWAYAT DOKUMEN MODUL AJAR, LKPD, & HOTS
CREATE TABLE IF NOT EXISTS public.history_items (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    type TEXT NOT NULL, -- 'modul', 'lkpd', 'hots'
    title TEXT NOT NULL,
    subject TEXT,
    topic TEXT,
    grade TEXT,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data JSONB NOT NULL
);

-- 2. INDEX UNTUK KECEPATAN QUERY & PENGHAPUSAN KEDALUWARSA 30 HARI
CREATE INDEX IF NOT EXISTS idx_history_user_email ON public.history_items(user_email);
CREATE INDEX IF NOT EXISTS idx_history_created_date ON public.history_items(created_date);

-- 3. AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.history_items ENABLE ROW LEVEL SECURITY;

-- 4. KEBIJAKAN KEAMANAN (Setiap user hanya bisa akses datanya sendiri)
DROP POLICY IF EXISTS "Users can view own history" ON public.history_items;
CREATE POLICY "Users can view own history" 
ON public.history_items FOR SELECT 
USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = user_email);

DROP POLICY IF EXISTS "Users can insert own history" ON public.history_items;
CREATE POLICY "Users can insert own history" 
ON public.history_items FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'email' = user_email);

DROP POLICY IF EXISTS "Users can delete own history" ON public.history_items;
CREATE POLICY "Users can delete own history" 
ON public.history_items FOR DELETE 
USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = user_email);

-- 5. TRIGGER OTOMATIS BERSIHKAN FILE > 30 HARI DI SISI SUPABASE DATABASE
CREATE OR REPLACE FUNCTION purge_old_history_items()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.history_items 
  WHERE created_date < NOW() - INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_purge_30_days ON public.history_items;
CREATE TRIGGER trigger_auto_purge_30_days
AFTER INSERT ON public.history_items
EXECUTE FUNCTION purge_old_history_items();`;

export const HistoryDashboard: React.FC<HistoryDashboardProps> = ({
  userEmail,
  onViewItem,
  onNavigateTab
}) => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'semua' | 'modul' | 'lkpd' | 'hots'>('semua');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState<boolean | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load items on mount and filter out expired
  const loadItems = async () => {
    setIsLoadingHistory(true);
    try {
      const [fetched, tableCheck] = await Promise.all([
        getHistoryItems(userEmail),
        checkSupabaseTableReady()
      ]);
      setItems(fetched);
      setSupabaseReady(tableCheck.ready);
    } catch (error) {
      console.error('Failed to load history items:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [userEmail]);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus riwayat "${title}"?`)) {
      setIsLoadingHistory(true);
      try {
        await deleteHistoryItem(id);
        await loadItems();
      } catch (error) {
        console.error('Failed to delete history item:', error);
        setIsLoadingHistory(false);
      }
    }
  };

  // Filter items based on type and search query
  const filteredItems = items.filter(item => {
    const matchesType = selectedType === 'semua' || item.type === selectedType;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      item.title.toLowerCase().includes(searchLower) ||
      item.subject.toLowerCase().includes(searchLower) ||
      item.topic.toLowerCase().includes(searchLower) ||
      item.grade.toLowerCase().includes(searchLower);
    
    return matchesType && matchesSearch;
  });

  // Calculate days remaining before auto-purging (30 days limit, calendar day based)
  const getDaysRemaining = (createdDateStr: string): number => {
    try {
      const created = new Date(createdDateStr);
      if (isNaN(created.getTime())) return 30;

      const now = new Date();

      // Normalisasi ke awal hari (midnight 00:00:00) agar selisih hari berkurang setiap pergantian tanggal
      const createdMidnight = new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      // Jumlah hari kalender yang telah berlalu
      const daysElapsed = Math.floor((todayMidnight - createdMidnight) / (24 * 60 * 60 * 1000));
      
      const remainingDays = 30 - daysElapsed;
      return remainingDays > 0 ? remainingDays : 0;
    } catch (e) {
      return 30;
    }
  };

  // Helper for formatting date in Indonesian style
  const formatDateIndo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getDocTypeInfo = (type: 'modul' | 'lkpd' | 'hots') => {
    switch (type) {
      case 'modul':
        return {
          label: 'Modul Ajar',
          color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
          icon: <BookOpen className="w-4 h-4 text-emerald-400" />
        };
      case 'lkpd':
        return {
          label: 'LKPD',
          color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
          icon: <FileText className="w-4 h-4 text-purple-400" />
        };
      case 'hots':
        return {
          label: 'Soal HOTS',
          color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
          icon: <HelpCircle className="w-4 h-4 text-blue-400" />
        };
    }
  };

  // Summary statistics
  const totalCount = items.length;
  const modulCount = items.filter(i => i.type === 'modul').length;
  const lkpdCount = items.filter(i => i.type === 'lkpd').length;
  const hotsCount = items.filter(i => i.type === 'hots').length;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Upper Title Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <History className="w-8 h-8 text-blue-500" />
            Riwayat Pembuatan AI
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            Akses, edit, cetak, dan unduh ulang dokumen Kurikulum Merdeka Anda yang tersimpan selama 30 hari.
          </p>
        </div>

        {/* Temporary Storage Info Box */}
        <div className="bg-amber-950/20 border border-amber-500/20 p-3.5 rounded-2xl flex items-start gap-2.5 max-w-md">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200">
            <span className="font-bold block mb-0.5">Siklus Simpan 30 Hari</span>
            Setiap file dokumen otomatis tersimpan selama <strong className="underline">30 hari</strong> sejak tanggal pembuatan dan akan terhapus otomatis setelah lewat 30 hari demi menjaga performa penyimpanan.
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0f1524] border border-gray-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs text-gray-400">Total Terbuat</span>
          <span className="text-3xl font-black text-white mt-1">{totalCount} <span className="text-xs font-normal text-gray-400">dokumen</span></span>
        </div>
        <div className="bg-[#0f1524] border border-gray-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs text-gray-400 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-emerald-400" /> Modul Ajar</span>
          <span className="text-3xl font-black text-emerald-400 mt-1">{modulCount} <span className="text-xs font-normal text-gray-400">unit</span></span>
        </div>
        <div className="bg-[#0f1524] border border-gray-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs text-gray-400 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-purple-400" /> LKPD</span>
          <span className="text-3xl font-black text-purple-400 mt-1">{lkpdCount} <span className="text-xs font-normal text-gray-400">paket</span></span>
        </div>
        <div className="bg-[#0f1524] border border-gray-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs text-gray-400 flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5 text-blue-400" /> Soal HOTS</span>
          <span className="text-3xl font-black text-blue-400 mt-1">{hotsCount} <span className="text-xs font-normal text-gray-400">bank</span></span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 bg-[#0f1524] p-1.5 rounded-xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setSelectedType('semua')}
            className={`text-xs px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedType === 'semua' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setSelectedType('modul')}
            className={`text-xs px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedType === 'modul' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Modul Ajar
          </button>
          <button
            onClick={() => setSelectedType('lkpd')}
            className={`text-xs px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedType === 'lkpd' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            LKPD
          </button>
          <button
            onClick={() => setSelectedType('hots')}
            className={`text-xs px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedType === 'hots' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Soal HOTS
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari riwayat dokumen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0f1524] border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* Main Grid List */}
      {isLoadingHistory ? (
        <div className="text-center py-24 bg-[#090e1a] border border-gray-800 rounded-3xl flex flex-col items-center justify-center p-6">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">Menyelaraskan Riwayat...</h3>
          <p className="text-sm text-gray-400">Sedang mengambil data terbaru secara aman dari database Supabase Anda.</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-[#090e1a] border border-gray-800 rounded-3xl flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center text-gray-500 mb-4 border border-gray-700/50">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Belum ada riwayat</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
            {searchQuery || selectedType !== 'semua'
              ? 'Tidak ditemukan dokumen yang cocok dengan filter atau pencarian Anda.'
              : 'Silakan gunakan salah satu fitur pembuat di atas untuk mulai memproduksi modul, LKPD, atau soal berteknologi AI.'}
          </p>
          {(!searchQuery && selectedType === 'semua') && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onNavigateTab('modul')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition"
              >
                Buat Modul Ajar
              </button>
              <button
                onClick={() => onNavigateTab('lkpd')}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition"
              >
                Buat LKPD
              </button>
              <button
                onClick={() => onNavigateTab('hots')}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition"
              >
                Buat Soal HOTS
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const docInfo = getDocTypeInfo(item.type);
            const daysLeft = getDaysRemaining(item.createdDate);
            const isClosingIn = daysLeft <= 7;

            return (
              <div
                key={item.id}
                className="bg-[#0f1524] border border-gray-800 hover:border-gray-700 hover:shadow-xl transition-all duration-300 rounded-2xl p-5 flex flex-col justify-between relative group overflow-hidden"
              >
                <div>
                  {/* Top Badge & Expiry countdown */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 border rounded-full inline-flex items-center gap-1.5 ${docInfo.color}`}>
                      {docInfo.icon}
                      {docInfo.label}
                    </span>
                    
                    {/* Remaining Days Counter */}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                      isClosingIn 
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                    }`}>
                      <Hourglass className="w-3 h-3 shrink-0" />
                      {daysLeft} hari lagi
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-white line-clamp-2 mb-2 group-hover:text-blue-400 transition">
                    {item.title}
                  </h3>

                  {/* Details block */}
                  <div className="space-y-1.5 text-xs text-gray-400 border-t border-gray-800/80 pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Mata Pelajaran:</span>
                      <span className="font-medium text-gray-300 max-w-[150px] truncate">{item.subject}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Materi Pokok:</span>
                      <span className="font-medium text-gray-300 max-w-[150px] truncate">{item.topic}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Kelas/Tingkat:</span>
                      <span className="font-medium text-gray-300">{item.grade}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="border-t border-gray-800/80 pt-4 mt-5 flex items-center justify-between gap-2 text-xs">
                  {/* Create date info */}
                  <span className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3 shrink-0" />
                    {new Date(item.createdDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                  </span>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* Trash Button */}
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-2 text-gray-500 hover:text-red-400 bg-gray-800/30 hover:bg-red-500/10 border border-gray-800 hover:border-red-500/20 rounded-xl cursor-pointer transition-all"
                      title="Hapus dari Riwayat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* View Button */}
                    <button
                      onClick={() => onViewItem(item)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl inline-flex items-center gap-1 cursor-pointer transition shadow-md hover:shadow-blue-600/20"
                    >
                      <span>Buka & Unduh</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Skrip SQL Setup Supabase */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f1524] border border-gray-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <Database className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-white">Setup Tabel Riwayat Supabase</h2>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-gray-300 leading-relaxed">
                Jalankan skrip SQL di bawah ini di <strong>Supabase SQL Editor</strong> agar semua riwayat Modul, LKPD, dan Soal tersimpan di database cloud Supabase Anda dengan sistem <strong>penghapusan otomatis setelah 30 hari</strong>.
              </p>

              <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside bg-gray-900/60 p-3 rounded-xl border border-gray-800">
                <li>Buka dashboard Supabase Anda di <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-400 underline">supabase.com/dashboard</a></li>
                <li>Pilih project Anda, lalu klik menu <strong>SQL Editor</strong> di bilah kiri.</li>
                <li>Klik <strong>New Query</strong>, tempelkan skrip di bawah ini, lalu klik <strong>Run</strong>.</li>
              </ol>

              <div className="relative">
                <pre className="bg-black/70 border border-gray-800 rounded-xl p-4 text-[11px] text-gray-300 font-mono max-h-60 overflow-y-auto leading-relaxed">
                  {SUPABASE_SETUP_SQL}
                </pre>
                <button
                  onClick={handleCopySql}
                  className="absolute top-2.5 right-2.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Skrip SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setShowSqlModal(false);
                    loadItems();
                  }}
                  className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition"
                >
                  Saya Sudah Menjalankannya / Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
