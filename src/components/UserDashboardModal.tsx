import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { X, User, ShieldCheck, Sparkles, BookOpen, FileText, HelpCircle, LogOut, Zap, Database, Copy, Check, Shield } from 'lucide-react';
import { checkUserProfilesTableReady, USER_PROFILES_SETUP_SQL } from '../lib/userStore';

interface UserDashboardModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onOpenUpgrade: () => void;
}

export const UserDashboardModal: React.FC<UserDashboardModalProps> = ({
  user,
  isOpen,
  onClose,
  onLogout,
  onOpenUpgrade,
}) => {
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTableReady, setIsTableReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkUserProfilesTableReady().then(res => {
        setIsTableReady(res.ready);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const { quota } = user;

  const getPercentage = (current: number, max: number) => {
    return Math.round((current / max) * 100);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(USER_PROFILES_SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#101524] border border-gray-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-full bg-gray-800/50 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* User Info Header */}
        <div className="flex items-center gap-4 border-b border-gray-800/80 pb-5 mb-5">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/30">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{user.name}</h2>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {user.statusPlan}
              </span>
            </div>
            <p className="text-xs text-gray-400">{user.email}</p>
            {user.schoolName && (
              <p className="text-xs text-blue-400 mt-0.5 font-medium">{user.schoolName}</p>
            )}
          </div>
        </div>

        {/* Quota Status Card */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Sisa Kuota
            </h3>
          </div>

          <div className="space-y-4 bg-[#182033] border border-gray-700/80 rounded-2xl p-4">
            
            {/* Quota 1: Modul Ajar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  Modul Ajar Kurikulum Merdeka
                </span>
                <span className="font-bold text-blue-400">
                  {quota.modulAjar} / {quota.maxModulAjar} Kali
                </span>
              </div>
              <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${getPercentage(quota.modulAjar, quota.maxModulAjar)}%` }}
                ></div>
              </div>
            </div>

            {/* Quota 2: LKPD */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  LKPD Interaktif & Cetak
                </span>
                <span className="font-bold text-purple-400">
                  {quota.lkpd} / {quota.maxLkpd} Kali
                </span>
              </div>
              <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${getPercentage(quota.lkpd, quota.maxLkpd)}%` }}
                ></div>
              </div>
            </div>

            {/* Quota 3: Soal HOTS */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Paket Soal HOTS
                </span>
                <span className="font-bold text-emerald-400">
                  {quota.soalHots} / {quota.maxSoalHots} Kali
                </span>
              </div>
              <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${getPercentage(quota.soalHots, quota.maxSoalHots)}%` }}
                ></div>
              </div>
            </div>

          </div>
        </div>

        {/* Multi-Device Cloud Sync Notice / SQL Helper */}
        {isTableReady === false && (
          <div className="mb-5 p-3 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-blue-300">
              <Shield className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Kunci kuota multi-perangkat via Supabase SQL</span>
            </div>
            <button
              onClick={() => setShowSqlModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shrink-0"
            >
              Lihat SQL
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenUpgrade();
            }}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-amber-600/20 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Tambah / Top Up Kuota</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="bg-red-950/80 hover:bg-red-900 border border-red-500/30 text-red-300 font-semibold py-3 px-4 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>

      </div>

      {/* SQL Setup Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f1422] border border-blue-500/40 rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowSqlModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1.5 rounded-full bg-gray-800/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Setup Tabel Kuota Multi-Perangkat</h3>
                <p className="text-xs text-gray-400">Jalankan SQL ini di Supabase SQL Editor agar kuota akun terkunci di cloud.</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto my-2 rounded-xl border border-gray-800 bg-[#080b13] p-4 text-xs font-mono text-gray-300">
              <pre className="whitespace-pre-wrap">{USER_PROFILES_SETUP_SQL}</pre>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-gray-800">
              <button
                onClick={handleCopySql}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-blue-600/20"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Semua SQL'}</span>
              </button>

              <button
                onClick={() => {
                  setShowSqlModal(false);
                  checkUserProfilesTableReady().then(res => setIsTableReady(res.ready));
                }}
                className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                Tutup & Cek Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
