import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  QrCode, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  RefreshCw,
  Copy,
  ExternalLink,
  MessageCircle,
  Clock
} from 'lucide-react';
import { PaymentPackage, UserProfile } from '../types';
// @ts-ignore
import { supabase } from '../supabaseClient';
import { getUserProfileFromCloud } from '../lib/userStore';

interface UpgradeModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onAddQuota: (amountModul: number, amountLKPD: number, amountHOTS: number) => void;
  onOpenTerms?: () => void;
}

const ADMIN_WHATSAPP_NUMBER = '6287726378446';
const ADMIN_WHATSAPP_DISPLAY = '0877-2637-8446';

const singlePackage: PaymentPackage = {
  id: 'pkg_pro_35k',
  name: 'Paket Pro Top Up Guru',
  price: 35000,
  priceLabel: 'Rp 35.000',
  quotaModul: 15,
  quotaLKPD: 15,
  quotaHOTS: 15,
  popular: true,
  features: [
    '15x Generate Modul Ajar Kurikulum Merdeka',
    '15x Generate LKPD Interaktif & Siap Cetak',
    '15x Generate & Download Soal HOTS',
    'Akses Kunci Jawaban & Rubrik Penilaian Lengkap',
    'Export Format Word (.doc) & PDF Siap Cetak',
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

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ user, isOpen, onClose, onAddQuota, onOpenTerms }) => {
  const [paymentStep, setPaymentStep] = useState<'details' | 'pending_whatsapp' | 'success'>('details');
  const [hasAgreed, setHasAgreed] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Format pesan WhatsApp otomatis
  const buildWhatsAppMessage = () => {
    const userName = user?.name || 'Bapak/Ibu Guru';
    const userEmail = user?.email || '-';
    const school = user?.schoolName || '-';

    return `Halo Admin Generator Modul Ajar PRO,
Saya ingin memesan *Paket Pro Top Up Guru (Rp 35.000)*.

📋 *Rincian Akun Pemesan:*
• Nama: ${userName}
• Email Akun: ${userEmail}
• Asal Sekolah: ${school}
• Paket: Paket Pro Guru (+15 Modul, +15 LKPD, +15 Soal HOTS)
• Total Biaya: Rp 35.000

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
    setStatusMessage(null);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(buildWhatsAppMessage());
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  // Cek apakah kuota di Supabase sudah ditambahkan oleh admin
  const handleCheckQuotaUpdated = async () => {
    setCheckingStatus(true);
    setStatusMessage(null);
    try {
      if (!supabase) {
        setStatusMessage("Silakan segarkan halaman browser untuk mengecek kuota terbaru.");
        return;
      }

      const { data: { user: sUser } } = await supabase.auth.getUser();
      if (!sUser) {
        setStatusMessage("Sesi login tidak ditemukan. Silakan segarkan halaman atau masuk kembali.");
        return;
      }

      const updatedProfile = await getUserProfileFromCloud(sUser);

      // Cek apakah kuota lebih besar dari kuota awal saat modal dibuka
      const currentModul = user?.quota.modulAjar || 0;
      const currentLkpd = user?.quota.lkpd || 0;
      const currentHots = user?.quota.soalHots || 0;

      const hasIncreased = 
        updatedProfile.quota.modulAjar > currentModul ||
        updatedProfile.quota.lkpd > currentLkpd ||
        updatedProfile.quota.soalHots > currentHots ||
        updatedProfile.statusPlan.toLowerCase().includes('pro');

      if (hasIncreased) {
        onAddQuota(15, 15, 15);
        setPaymentStep('success');
      } else {
        setStatusMessage("Kuota belum bertambah di sistem. Jika Anda baru saja mengirimkan bukti transfer, harap tunggu 1-2 menit selagi Admin memprosesnya di WhatsApp.");
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage("Terjadi kendala saat memeriksa kuota ke server. Anda juga bisa langsung memuat ulang (refresh) halaman.");
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleFinish = () => {
    setPaymentStep('details');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#101524] border border-gray-800 rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-full bg-gray-800/50 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: DETAILS & ORDER */}
        {paymentStep === 'details' && (
          <div>
            <div className="text-center mb-6">
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Top Up Kuota Generator Pro
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-serif-display">
                Paket Tambahan Kuota
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-md mx-auto">
                Isi ulang kuota pembuatan bahan ajar & soal dengan pembayaran QRIS resmi via WhatsApp Admin.
              </p>
            </div>

            {/* Single Package Card */}
            <div className="border border-emerald-500/50 bg-gradient-to-b from-emerald-950/20 to-[#182033] rounded-2xl p-6 shadow-xl relative mb-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block">
                    PRO MEMBER
                  </span>
                  <h3 className="text-xl font-bold text-white">{singlePackage.name}</h3>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-amber-400">
                    {singlePackage.priceLabel}
                  </div>
                  <span className="text-[11px] text-gray-400">Sekali Bayar • Permanen</span>
                </div>
              </div>

              <div className="my-4 border-t border-b border-gray-800/80 py-4">
                <p className="text-xs font-semibold text-gray-300 mb-3">
                  Rincian Total Kuota Tambahan yang Didapatkan:
                </p>
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div className="bg-[#101524] border border-gray-700/60 rounded-xl p-2.5">
                    <span className="block text-lg font-extrabold text-blue-400">+15</span>
                    <span className="text-[10px] text-gray-400 font-medium">Modul Ajar</span>
                  </div>
                  <div className="bg-[#101524] border border-gray-700/60 rounded-xl p-2.5">
                    <span className="block text-lg font-extrabold text-purple-400">+15</span>
                    <span className="text-[10px] text-gray-400 font-medium">LKPD</span>
                  </div>
                  <div className="bg-[#101524] border border-gray-700/60 rounded-xl p-2.5">
                    <span className="block text-lg font-extrabold text-emerald-400">+15</span>
                    <span className="text-[10px] text-gray-400 font-medium">Soal HOTS</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-gray-300">
                  {singlePackage.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Data Akun Pemesan Info */}
              <div className="bg-[#101524] p-3 rounded-xl border border-gray-800 mb-4 text-xs">
                <p className="text-gray-400 font-semibold mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                  Akun yang akan ditambahkan kuota:
                </p>
                <div className="flex flex-wrap items-center justify-between text-gray-300 font-medium gap-1">
                  <span>Email: <strong className="text-white">{user?.email || '(Belum Masuk Akun)'}</strong></span>
                  {user?.name && <span className="text-gray-400">Nama: {user.name}</span>}
                </div>
              </div>

              {/* Alur Pemesanan 3 Langkah Ringkas */}
              <div className="bg-[#0c101b] border border-gray-800 rounded-xl p-3.5 mb-4 text-xs">
                <p className="text-[11px] font-bold text-gray-300 mb-2 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  Alur Pemesanan Mudah & Cepat:
                </p>
                <ol className="list-decimal pl-4 space-y-1.5 text-gray-400 text-[11px] leading-relaxed">
                  <li>Klik tombol <strong className="text-emerald-400">Pesan via WhatsApp</strong> di bawah untuk membuka chat dengan pesan otomatis.</li>
                  <li>Admin akan membalas dengan mengirimkan barcode <strong className="text-white">QRIS</strong> resmi (Bisa dibayar via GoPay, OVO, Dana, ShopeePay, BCA, BRI, Mandiri, dll).</li>
                  <li>Kirim bukti bayar ke WhatsApp Admin, kuota <strong className="text-emerald-400">45 kuota Pro</strong> akan langsung diaktifkan ke akun Anda!</li>
                </ol>
              </div>

              {/* Terms & Refund Policy Box */}
              <div className="bg-[#0c101b] border border-gray-800 rounded-xl p-3.5 space-y-2.5">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Ketentuan Penting & Kebijakan Refund
                </p>
                <p className="text-[10.5px] text-gray-400 leading-relaxed">
                  Kuota tidak memiliki masa kedaluwarsa. Transaksi dilayani langsung oleh Admin resmi WhatsApp (<strong className="text-white">{ADMIN_WHATSAPP_DISPLAY}</strong>). Konfirmasi & bantuan kendala dilayani dengan fast-response.
                </p>
                {onOpenTerms && (
                  <button
                    type="button"
                    onClick={onOpenTerms}
                    className="text-[10.5px] text-blue-400 hover:text-blue-300 underline underline-offset-2 font-semibold transition inline-block cursor-pointer text-left"
                  >
                    Baca Selengkapnya Kebijakan Pembelian & Refund Lengkap →
                  </button>
                )}
                
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasAgreed}
                    onChange={(e) => setHasAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-700 text-emerald-600 focus:ring-emerald-500 bg-gray-900 cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] text-gray-300 leading-normal">
                    Saya menyetujui pemesanan via WhatsApp Admin resmi & kebijakan di atas.
                  </span>
                </label>
              </div>

              {/* Order Button via WhatsApp */}
              <button
                type="button"
                disabled={!hasAgreed}
                onClick={handleStartWhatsAppOrder}
                className={`w-full mt-4 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition ${
                  hasAgreed
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 cursor-pointer'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-60'
                }`}
              >
                <WhatsAppIcon className="w-5 h-5" />
                <span>Pesan Sekarang via WhatsApp — Rp 35.000</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PENDING WHATSAPP CHAT */}
        {paymentStep === 'pending_whatsapp' && (
          <div className="py-2">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-400 shadow-lg shadow-emerald-500/10">
                <WhatsAppIcon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white">Pemesanan Dibuka di WhatsApp</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Admin siap menerima pesanan Anda di nomor <strong className="text-emerald-400 font-bold">{ADMIN_WHATSAPP_DISPLAY}</strong>.
              </p>
            </div>

            <div className="bg-[#182033] border border-gray-800 rounded-2xl p-4 mb-5">
              <p className="text-xs font-bold text-gray-300 mb-3 border-b border-gray-800 pb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Petunjuk Penyelesaian:
              </p>
              <ol className="space-y-2.5 text-xs text-gray-300 list-decimal pl-4 leading-relaxed">
                <li>
                  Pastikan pesan pemesanan yang otomatis terbuat sudah Anda <strong>Kirim</strong> di aplikasi WhatsApp ke Admin.
                </li>
                <li>
                  Admin akan membalas dengan gambar kode <strong>QRIS</strong> pembayaran resmi senilai <strong>Rp 35.000</strong>.
                </li>
                <li>
                  Pindai & bayar melalui e-wallet pilihan Anda (GoPay, OVO, Dana, ShopeePay) atau m-Banking (BCA, BRI, Mandiri, BNI, dll).
                </li>
                <li>
                  Kirimkan <strong>foto / struk bukti transfer</strong> ke Admin di WhatsApp.
                </li>
                <li>
                  Setelah admin mengonfirmasi, klik tombol <strong>Cek / Sinkronkan Kuota</strong> di bawah untuk langsung memperbarui akun Anda.
                </li>
              </ol>
            </div>

            {statusMessage && (
              <div className="mb-5 bg-blue-950/50 border border-blue-500/30 text-blue-300 p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="space-y-2.5">
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-600/20 text-center"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span>Buka Ulang Chat WhatsApp ({ADMIN_WHATSAPP_DISPLAY})</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="flex-1 bg-[#141b2d] hover:bg-[#1a233a] border border-gray-700/80 text-gray-300 font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedMessage ? "Teks Tersalin!" : "Salin Pesan Otomatis"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCheckQuotaUpdated}
                  disabled={checkingStatus}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-600/20"
                >
                  {checkingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>{checkingStatus ? "Memeriksa..." : "Cek / Sinkronkan Kuota"}</span>
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="text-xs text-gray-400 hover:text-white transition cursor-pointer"
                >
                  Kembali ke Halaman Utama
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {paymentStep === 'success' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Kuota Berhasil Aktif!
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mb-6 max-w-md mx-auto leading-relaxed">
              Selamat! Kuota pembuatan Modul Ajar (+15), LKPD (+15), dan Soal HOTS (+15) telah berhasil ditambahkan ke akun Anda. Selamat menyusun perangkat ajar terbaik!
            </p>
            <button
              onClick={handleFinish}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-8 py-3 rounded-xl shadow-lg shadow-emerald-600/30 cursor-pointer transition"
            >
              Mulai Generate Bahan Ajar
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
