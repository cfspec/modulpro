import React, { useState } from 'react';
import { X, ShieldCheck, FileText, AlertTriangle, Lock } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'disclaimer' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, defaultTab = 'disclaimer' }) => {
  const [activeTab, setActiveTab] = useState<'disclaimer' | 'privacy'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#101524] border border-gray-800 rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-2 rounded-xl bg-gray-800/60 hover:bg-gray-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Tabs */}
        <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
          <button
            onClick={() => setActiveTab('disclaimer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'disclaimer'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-[#182033] text-gray-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Disclaimer (Sanggahan)</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-[#182033] text-gray-400 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Privacy Policy (Kebijakan Privasi)</span>
          </button>
        </div>

        {/* Tab Content: Disclaimer */}
        {activeTab === 'disclaimer' && (
          <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="font-semibold">
                Penting: Selalu lakukan penelaahan kembali terhadap bahan ajar yang dihasilkan oleh AI sebelum digunakan di kelas.
              </p>
            </div>

            <h3 className="font-bold text-sm text-white font-serif-display mt-4">
              1. Peran Generatif Artificial Intelligence (AI)
            </h3>
            <p>
              Generator Modul Ajar Pro menggunakan teknologi AI mutakhir (Google Gemini AI) untuk membantu Bapak/Ibu Guru menyusun rancangan Modul Ajar, Lembar Kerja Peserta Didik (LKPD), serta Soal HOTS Kurikulum Merdeka secara praktis dan hemat waktu.
            </p>

            <h3 className="font-bold text-sm text-white font-serif-display mt-4">
              2. Tanggung Jawab Profesional Pendidik
            </h3>
            <p>
              Hasil keluaran berupa teks, struktur materi, maupun rubrik penilaian berfungsi sebagai <strong>draf atau referensi awal</strong>. Bapak/Ibu Guru tetap memegang kendali dan tanggung jawab penuh untuk memeriksa ketepatan materi, keselarasan dengan CP/TP sekolah, serta kearifan lokal peserta didik.
            </p>

            <h3 className="font-bold text-sm text-white font-serif-display mt-4">
              3. Batasan Tanggung Jawab
            </h3>
            <p>
              <strong>CF Digitals</strong> tidak bertanggung jawab atas ketidaksesuaian teknis, kekeliruan konsep, atau dampak dari penggunaan bahan ajar tanpa adanya telaah dan penyesuaian mandiri oleh guru yang bersangkutan.
            </p>
          </div>
        )}

        {/* Tab Content: Privacy Policy */}
        {activeTab === 'privacy' && (
          <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl text-emerald-300">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <p className="font-semibold">
                Komitmen Kami: Kerahasiaan data guru dan keamanan transaksi adalah prioritas utama CF Digitals.
              </p>
            </div>

            <h3 className="font-bold text-sm text-white font-serif-display mt-4">
              1. Pengumpulan Informasi
            </h3>
            <p>
              Kami mengumpulkan data pribadi terbatas seperti Nama Lengkap Guru, Alamat Email, dan Nama Satuan Pendidikan/Sekolah saat Anda mendaftar akun.
            </p>

            <h3 className="font-bold text-sm text-white font-serif-display mt-4">
              2. Penggunaan Data & Keamanan
            </h3>
            <p>
              Data Anda hanya digunakan untuk kebutuhan autentikasi akun, sinkronisasi kuota pemuatan bahan ajar, serta layanan transaksi Midtrans. Password Anda disimpan terenkripsi secara aman dan kami tidak akan pernah menjual data pribadi Anda kepada pihak ketiga mana pun.
            </p>

            <h3 className="font-bold text-sm text-white font-serif-display mt-4">
              3. Keamanan Transaksi Midtrans
            </h3>
            <p>
              Seluruh pembayaran top up kuota diproses secara langsung oleh <strong>Midtrans Payment Gateway</strong> melalui koneksi SSL 256-bit terenkripsi. Kami tidak menyimpan detail kartu kredit/debit atau pin e-wallet Anda.
            </p>

            <h3 className="font-bold text-sm text-white font-serif-display mt-4">
              4. Hak Pengguna
            </h3>
            <p>
              Bapak/Ibu Guru berhak untuk memperbarui data profil atau mengajukan penghapusan akun kapan saja dengan menghubungi tim dukungan resmi CF Digitals.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-800 flex justify-between items-center text-[11px] text-gray-500">
          <span>© 2026 CF Digitals — All Rights Reserved.</span>
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
