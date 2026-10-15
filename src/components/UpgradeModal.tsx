import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  QrCode, 
  ArrowRight, 
  Copy, 
  ExternalLink, 
  Clock 
} from 'lucide-react';
import { PaymentPackage, UserProfile } from '../types';

interface UpgradeModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onRefreshUser?: (updated: UserProfile) => void;
  onOpenTerms?: () => void;
}

const ADMIN_WHATSAPP_NUMBER = '6287726378446';
const ADMIN_WHATSAPP_DISPLAY = '0877-2637-8446';

const singlePackage: PaymentPackage = {
  id: 'pkg_ketengan_6k',
  name: 'Paket Ketengan Guru',
  price: 6000,
  priceLabel: 'Rp 6.000',
  quotaModul: 3,
  quotaLKPD: 3,
  quotaHOTS: 0,
  popular: true,
  features: [
    '3x Generate Modul Ajar Kurikulum Merdeka Lengkap',
    '3x Generate LKPD Interaktif & Siap Cetak',
    'Akses Format Lengkap (Cetak PDF & Export Word .doc)',
    'Kuota Tidak Hangus (Permanen & Tanpa Kedaluwarsa)',
    'Aktivasi Instan & Diproses Langsung via WhatsApp QRIS',
  ],
};

// SVG Icon WhatsApp Resmi
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.37 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.03C9.35 7.03 9.06 7.1 8.82 7.36C8.58 7.62 7.89 8.26 7.89 9.57C7.89 10.87 8.84 12.13 8.97 12.31C9.11 12.48 10.84 15.15 13.48 16.29C14.11 16.56 14.6 16.72 14.98 16.84C15.61 17.04 16.19 17.01 16.65 16.94C17.16 16.87 18.22 16.3 18.44 15.68C18.66 15.06 18.66 14.53 18.6 14.42C18.53 14.31 18.36 14.24 18.1 14.11C17.84 13.98 16.53 13.34 16.29 13.25C16.05 13.16 15.88 13.12 15.7 13.38C15.53 13.65 15.03 14.24 14.88 14.42C14.73 14.59 14.58 14.61 14.32 14.48C14.06 14.36 13.22 14.08 12.22 13.19C11.45 12.5 10.92 11.64 10.77 11.38C10.63 11.12 10.75 10.98 10.88 10.85C11 10.73 11.15 10.54 11.28 10.38C11.42 10.22 11.46 10.11 11.55 9.93C11.64 9.76 11.59 9.61 11.53 9.48C11.46 9.35 10.96 8.13 10.75 7.63C10.55 7.14 10.35 7.21 10.2 7.2C10.05 7.19 9.87 7.19 9.7 7.19L9.53 7.03Z"/>
  </svg>
);

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ user, isOpen, onClose, onOpenTerms }) => {
  const [paymentStep, setPaymentStep] = useState<'details' | 'pending_whatsapp'>('details');
  const [hasAgreed, setHasAgreed] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPaymentStep('details');
      setHasAgreed(false);
      setCopiedMessage(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Format pesan WhatsApp otomatis
  const buildWhatsAppMessage = () => {
    const userName = user?.name || 'Bapak/Ibu Guru';
    const userEmail = user?.email || '-';
    const school = user?.schoolName || '-';

    return `Halo Admin Generator Modul Ajar PRO,
Saya ingin memesan *Paket Ketengan Guru (Rp 6.000)*.

📋 *Rincian Akun Pemesan:*
• Nama: ${userName}
• Email Akun: ${userEmail}
• Asal Sekolah: ${school}
• Paket: Paket Ketengan (+3 Modul Ajar & +3 LKPD)
• Total Biaya: Rp 6.000

Mohon kirimkan kode QRIS pembayarannya ya Admin. Setelah saya transfer dan kirim bukti bayar, mohon bantu aktifkan kuota akun saya. Terima kasih!`;
  };

  const getWhatsAppUrl = () => {
    const text = buildWhatsAppMessage();
    return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  };

  const handleStartWhatsAppOrder = () => {
    const waUrl = getWhatsAppUrl();
    window.open(waUrl, '_blank');
    setPaymentStep('pending_whatsapp');
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(buildWhatsAppMessage());
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#101524] border border-gray-800 rounded-2xl w-full max-w-lg p-4 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-gray-400 hover:text-white p-1 rounded-full bg-gray-800/60 hover:bg-gray-800 transition cursor-pointer z-10"
          title="Tutup Dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Scrollable Content Container */}
        <div className="overflow-y-auto pr-0.5 sm:pr-1 space-y-3.5">
          {/* STEP 1: DETAILS & ORDER */}
          {paymentStep === 'details' && (
            <div>
              <div className="text-center mb-3 sm:mb-4 pr-6 sm:pr-0">
                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1 mb-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Top Up Kuota Hemat Ketengan
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-serif-display tracking-tight">
                  Paket Ketengan Guru
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 max-w-sm sm:max-w-md mx-auto leading-relaxed">
                  Isi ulang kuota pembuatan bahan ajar hemat dengan pembayaran QRIS resmi via WhatsApp Admin.
                </p>
              </div>

              {/* Single Package Card */}
              <div className="border border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 via-[#141b2d] to-[#101524] rounded-xl p-4 sm:p-4.5 shadow-xl relative">
                <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-gray-800/80">
                  <div>
                    <span className="bg-emerald-600/90 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mb-0.5">
                      PAKET KETENGAN
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white">{singlePackage.name}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                      {singlePackage.priceLabel}
                    </div>
                    <span className="text-[10px] text-gray-400 block">Sekali Bayar • Permanen</span>
                  </div>
                </div>

                {/* Kuota Highlights */}
                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  <div className="bg-[#0c101b] border border-blue-500/30 rounded-xl py-2 px-3 flex items-center gap-2.5">
                    <span className="text-xl sm:text-2xl font-black text-blue-400 shrink-0">+3</span>
                    <div className="text-left leading-tight">
                      <div className="text-xs font-bold text-white">Modul Ajar</div>
                      <div className="text-[10px] text-gray-400">Kurikulum Merdeka</div>
                    </div>
                  </div>
                  <div className="bg-[#0c101b] border border-purple-500/30 rounded-xl py-2 px-3 flex items-center gap-2.5">
                    <span className="text-xl sm:text-2xl font-black text-purple-400 shrink-0">+3</span>
                    <div className="text-left leading-tight">
                      <div className="text-xs font-bold text-white">LKPD Interaktif</div>
                      <div className="text-[10px] text-gray-400">Siap Cetak & Word</div>
                    </div>
                  </div>
                </div>

                {/* Key Features */}
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] text-gray-300 mb-3 bg-[#0c101b]/60 p-2.5 rounded-lg border border-gray-800/60">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Format Word (.doc) & PDF</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Kuota Permanen Tanpa Kedaluwarsa</span>
                  </li>
                  <li className="flex items-center gap-1.5 sm:col-span-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Aktivasi instan via WhatsApp QRIS resmi</span>
                  </li>
                </ul>

                {/* User Target Account Info */}
                <div className="bg-[#0c101b] px-3 py-1.5 rounded-lg border border-gray-800/80 mb-3 flex flex-wrap items-center justify-between text-[11px] gap-1">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Akun penerima kuota:
                  </span>
                  <span className="text-gray-200 font-medium truncate max-w-[280px]">
                    <strong className="text-white">{user?.email || '(Belum Masuk)'}</strong>
                    {user?.name && <span className="text-gray-400"> • {user.name}</span>}
                  </span>
                </div>

                {/* Quick 3-Step Ordering Flow */}
                <div className="bg-[#0b0f19] border border-gray-800/80 rounded-xl p-2.5 sm:p-3 mb-3 text-[11px]">
                  <p className="text-[11px] font-bold text-gray-300 mb-2 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                    Alur Pemesanan Cepat (3 Langkah):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10.5px]">
                    <div className="bg-[#121929] p-2 rounded-lg border border-gray-800/80">
                      <span className="font-bold text-emerald-400 block mb-0.5">1. Chat WA</span>
                      <span className="text-gray-400 leading-tight block">Klik tombol pesan, format otomatis langsung siap kirim.</span>
                    </div>
                    <div className="bg-[#121929] p-2 rounded-lg border border-gray-800/80">
                      <span className="font-bold text-emerald-400 block mb-0.5">2. Scan QRIS</span>
                      <span className="text-gray-400 leading-tight block">Admin kirim kode QRIS Rp 6.000 (GoPay, Dana, m-Banking).</span>
                    </div>
                    <div className="bg-[#121929] p-2 rounded-lg border border-gray-800/80">
                      <span className="font-bold text-emerald-400 block mb-0.5">3. Kuota Aktif</span>
                      <span className="text-gray-400 leading-tight block">Kirim bukti bayar, kuota +3 langsung diaktifkan Admin.</span>
                    </div>
                  </div>
                </div>

                {/* Terms & Refund Policy Box */}
                <div className="bg-[#0b0f19] border border-gray-800/80 rounded-xl p-2.5 sm:p-3 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Ketentuan & Refund
                    </span>
                    {onOpenTerms && (
                      <button
                        type="button"
                        onClick={onOpenTerms}
                        className="text-[10px] sm:text-[10.5px] text-blue-400 hover:text-blue-300 underline underline-offset-2 font-medium transition cursor-pointer"
                      >
                        Baca Kebijakan Lengkap →
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[10.5px] text-gray-400 leading-relaxed">
                    Kuota permanen. Layanan resmi via WhatsApp Admin (<strong className="text-white">{ADMIN_WHATSAPP_DISPLAY}</strong>).
                  </p>
                  
                  <label className="flex items-start gap-2 pt-1 cursor-pointer select-none border-t border-gray-800/60">
                    <input
                      type="checkbox"
                      checked={hasAgreed}
                      onChange={(e) => setHasAgreed(e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 rounded border-gray-700 text-emerald-600 focus:ring-emerald-500 bg-gray-900 cursor-pointer shrink-0"
                    />
                    <span className="text-[10.5px] sm:text-[11px] text-gray-300 leading-normal">
                      Saya menyetujui pemesanan via WhatsApp Admin resmi & ketentuan di atas.
                    </span>
                  </label>
                </div>

                {/* Order Button via WhatsApp */}
                <button
                  type="button"
                  disabled={!hasAgreed}
                  onClick={handleStartWhatsAppOrder}
                  className={`w-full mt-3 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                    hasAgreed
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 cursor-pointer'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <WhatsAppIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Pesan Paket Ketengan via WhatsApp — Rp 6.000</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PENDING WHATSAPP CHAT */}
          {paymentStep === 'pending_whatsapp' && (
            <div className="py-1">
              <div className="text-center mb-4">
                <div className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center mx-auto mb-2 text-emerald-400 shadow-md shadow-emerald-500/10">
                  <WhatsAppIcon className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Pemesanan Dibuka di WhatsApp</h3>
                <p className="text-xs text-gray-400 mt-0.5 max-w-sm mx-auto">
                  Admin siap melayani di nomor <strong className="text-emerald-400 font-bold">{ADMIN_WHATSAPP_DISPLAY}</strong>.
                </p>
              </div>

              <div className="bg-[#141b2d] border border-gray-800 rounded-xl p-3 sm:p-3.5 mb-3.5">
                <p className="text-xs font-bold text-gray-200 mb-2 border-b border-gray-800 pb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Petunjuk Penyelesaian:
                </p>
                <ol className="space-y-1.5 text-[11px] text-gray-300 list-decimal pl-4 leading-relaxed">
                  <li>
                    Pastikan pesan yang otomatis terisi sudah Anda <strong>Kirim</strong> di chat WhatsApp ke Admin.
                  </li>
                  <li>
                    Admin akan membalas gambar barcode <strong>QRIS</strong> resmi senilai <strong>Rp 6.000</strong>.
                  </li>
                  <li>
                    Bayar via e-wallet (GoPay, OVO, Dana, ShopeePay) atau m-Banking (BCA, BRI, Mandiri, BNI, dll).
                  </li>
                  <li>
                    Kirimkan <strong>foto / bukti transfer</strong> ke Admin di WhatsApp.
                  </li>
                  <li>
                    Setelah konfirmasi Admin, cek kuota di <strong className="text-blue-400">Dashboard Profil ➔ Sinkronkan Kuota</strong> atau muat ulang (refresh) halaman.
                  </li>
                </ol>
              </div>

              <div className="space-y-2">
                <a
                  href={getWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-emerald-600/20 text-center"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>Buka Ulang Chat WhatsApp ({ADMIN_WHATSAPP_DISPLAY})</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="w-full bg-[#141b2d] hover:bg-[#1a233a] border border-gray-700/80 text-gray-300 font-medium text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedMessage ? "Teks Pesan Berhasil Tersalin!" : "Salin Pesan Pemesanan"}</span>
                </button>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-xs py-2 rounded-xl transition cursor-pointer"
                  >
                    Tutup Dialog
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
