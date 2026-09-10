import React from 'react';
import { FileText, LogOut, Sparkles, BookOpen, HelpCircle, User, Zap, ShieldCheck, History } from 'lucide-react';
import { TabType, UserProfile } from '../types';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  user: UserProfile | null;
  onOpenDashboard: () => void;
  onOpenUpgrade: () => void;
  onLogout: () => void;
  onResetLKPD?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  user,
  onOpenDashboard,
  onOpenUpgrade,
  onLogout,
  onResetLKPD,
}) => {
  return (
    <header className="no-print bg-[#0a0e1a] border-b border-gray-800/80 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        
        {/* Left Logo */}
        <div 
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          onClick={() => {
            setActiveTab('lkpd');
            if (onResetLKPD) onResetLKPD();
          }}
        >
          <div className="w-9 h-9 bg-blue-600 group-hover:bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30 transition-all">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-extrabold text-base md:text-xl tracking-tight font-sans">
              Generator Modul Ajar
            </span>
            <span className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              PRO
            </span>
          </div>
        </div>

        {/* Middle Navigation */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-4">
          <button
            onClick={() => setActiveTab('modul')}
            className={`text-xs lg:text-sm font-medium transition-all flex items-center gap-1.5 py-1.5 px-3 rounded-xl cursor-pointer ${
              activeTab === 'modul'
                ? 'text-white font-bold bg-blue-600/20 border border-blue-500/30 text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Modul Ajar</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('lkpd');
            }}
            className={`text-xs lg:text-sm transition-all flex items-center gap-1.5 py-1.5 px-3 rounded-xl cursor-pointer ${
              activeTab === 'lkpd'
                ? 'text-white font-extrabold bg-blue-600/20 border border-blue-500/30 text-blue-400'
                : 'text-gray-400 hover:text-white font-medium'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>LKPD</span>
          </button>

          <button
            onClick={() => setActiveTab('hots')}
            className={`text-xs lg:text-sm font-medium transition-all flex items-center gap-1.5 py-1.5 px-3 rounded-xl cursor-pointer ${
              activeTab === 'hots'
                ? 'text-white font-bold bg-blue-600/20 border border-blue-500/30 text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Soal HOTS</span>
          </button>

          <button
            onClick={() => setActiveTab('riwayat')}
            className={`text-xs lg:text-sm font-medium transition-all flex items-center gap-1.5 py-1.5 px-3 rounded-xl cursor-pointer ${
              activeTab === 'riwayat'
                ? 'text-white font-bold bg-blue-600/20 border border-blue-500/30 text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat</span>
          </button>
        </nav>

        {/* Right Section: User Quotas & Profile */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick Quota Pill */}
            <button
              onClick={onOpenDashboard}
              title="Klik untuk lihat rincian kuota"
              className="hidden sm:flex items-center gap-2 bg-[#141b2d] border border-gray-700/80 hover:border-gray-600 px-3 py-1.5 rounded-xl text-xs cursor-pointer transition"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <div className="flex items-center gap-2 text-gray-300 font-semibold">
                <span title="Kuota Modul">M: <strong className="text-blue-400">{user.quota.modulAjar}</strong></span>
                <span>•</span>
                <span title="Kuota LKPD">L: <strong className="text-purple-400">{user.quota.lkpd}</strong></span>
                <span>•</span>
                <span title="Kuota Soal HOTS">H: <strong className="text-emerald-400">{user.quota.soalHots}</strong></span>
              </div>
            </button>

            {/* Top Up Button */}
            <button
              onClick={onOpenUpgrade}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl flex items-center gap-1 shadow-md cursor-pointer transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tambah Kuota</span>
            </button>

            {/* User Profile Avatar */}
            <button
              onClick={onOpenDashboard}
              className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md cursor-pointer hover:ring-2 hover:ring-blue-400 transition"
              title="Dashboard Profile Guru"
            >
              {user.name.charAt(0)}
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            className="text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Masuk Akun
          </button>
        )}
      </div>

      {/* Mobile Sub Nav bar */}
      <div className="md:hidden border-t border-gray-800/80 bg-[#0d1220] px-4 py-2 flex items-center justify-around text-xs">
        <button
          onClick={() => setActiveTab('modul')}
          className={`py-1 px-2 rounded-lg font-medium ${
            activeTab === 'modul' ? 'text-blue-400 font-bold bg-blue-950/50' : 'text-gray-400'
          }`}
        >
          Modul Ajar
        </button>
        <button
          onClick={() => setActiveTab('lkpd')}
          className={`py-1 px-2 rounded-lg font-medium ${
            activeTab === 'lkpd' ? 'text-blue-400 font-bold bg-blue-950/50' : 'text-gray-400'
          }`}
        >
          LKPD
        </button>
        <button
          onClick={() => setActiveTab('hots')}
          className={`py-1 px-2 rounded-lg font-medium ${
            activeTab === 'hots' ? 'text-blue-400 font-bold bg-blue-950/50' : 'text-gray-400'
          }`}
        >
          Soal HOTS
        </button>
        <button
          onClick={() => setActiveTab('riwayat')}
          className={`py-1 px-2 rounded-lg font-medium ${
            activeTab === 'riwayat' ? 'text-blue-400 font-bold bg-blue-950/50' : 'text-gray-400'
          }`}
        >
          Riwayat
        </button>
      </div>
    </header>
  );
};
