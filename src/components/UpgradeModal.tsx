import React, { useState } from 'react';
import { X, Check, Sparkles, ShieldCheck, QrCode, ArrowRight, CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { PaymentPackage, UserProfile } from '../types';

interface UpgradeModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onAddQuota: (amountModul: number, amountLKPD: number, amountHOTS: number) => void;
  onOpenTerms?: () => void;
}

const singlePackage: PaymentPackage = {
  id: 'pkg_pro_25k',
  name: 'Paket Pro Top Up Guru',
  price: 25000,
  priceLabel: 'Rp 25.000',
  quotaModul: 15,
  quotaLKPD: 15,
  quotaHOTS: 15,
  popular: true,
  features: [
    '15x Generate Modul Ajar Kurikulum Merdeka',
    '15x Generate LKPD Interaktif & Siap Cetak',
    '15x Generate & Download Soal HOTS',
    'Akses Kunci Jawaban & Rubrik Penilaian',
    'Export Format Word (.doc) & PDF Pro',
    'Diproses Instan via Midtrans Payment Gateway (QRIS Only)',
  ],
};

// Helper function to load script
const loadSnapScript = (isProduction: boolean, clientKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const scriptId = 'midtrans-snap-script';
    const existingScript = document.getElementById(scriptId);
    
    const expectedSrc = isProduction 
      ? 'https://app.midtrans.com/snap/snap.js' 
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
      
    if (existingScript) {
      if ((existingScript as HTMLScriptElement).src === expectedSrc) {
        resolve();
        return;
      } else {
        existingScript.remove();
      }
    }
    
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = expectedSrc;
    script.setAttribute('data-client-key', clientKey);
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ user, isOpen, onClose, onAddQuota, onOpenTerms }) => {
  const [paymentStep, setPaymentStep] = useState<'details' | 'loading' | 'pending' | 'success'>('details');
  const [orderId, setOrderId] = useState<string>('');
  const [redirectUrl, setRedirectUrl] = useState<string>('');
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartPayment = async () => {
    if (!user) {
      alert("Silakan masuk akun terlebih dahulu sebelum melakukan pembelian.");
      return;
    }
    
    setIsLoadingPayment(true);
    setPaymentStep('loading');
    setStatusMessage(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/midtrans/create-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          name: user.fullName || user.email.split('@')[0],
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal membuat transaksi ke Midtrans");
      }

      const data = await response.json();
      const { token, clientKey, isProduction, redirectUrl: rUrl } = data;
      setRedirectUrl(rUrl || '');

      // 1. Load Snap Script
      try {
        await loadSnapScript(isProduction, clientKey);
      } catch (scriptErr) {
        console.warn("Gagal memuat snap script secara langsung. Akan menggunakan direct redirect.", scriptErr);
      }

      // 2. Open Snap Pay
      // @ts-ignore
      if (window.snap) {
        // @ts-ignore
        window.snap.pay(token, {
          onSuccess: function (result: any) {
            console.log('payment success!', result);
            onAddQuota(15, 15, 15);
            setPaymentStep('success');
            setIsLoadingPayment(false);
          },
          onPending: function (result: any) {
            console.log('payment pending!', result);
            setOrderId(result.order_id || token);
            setPaymentStep('pending');
            setIsLoadingPayment(false);
          },
          onError: function (result: any) {
            console.error('payment error!', result);
            alert('Terjadi kesalahan pembayaran. Silakan coba lagi.');
            setPaymentStep('details');
            setIsLoadingPayment(false);
          },
          onClose: function () {
            console.log('customer closed the popup without finishing the payment');
            // Store token as orderId for fallback verification
            setOrderId(token);
            setPaymentStep('pending');
            setIsLoadingPayment(false);
          }
        });
      } else if (rUrl) {
        // Fallback langsung buka link pembayaran di tab baru jika script Snap terblokir / gagal dimuat
        console.log("Snap library tidak termuat, mengalihkan ke redirect URL:", rUrl);
        setOrderId(token);
        setPaymentStep('pending');
        setIsLoadingPayment(false);
        window.open(rUrl, '_blank');
      } else {
        throw new Error("Snap library tidak termuat.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal menghubungkan ke Midtrans. Silakan coba beberapa saat lagi.");
      setPaymentStep('details');
      setIsLoadingPayment(false);
    }
  };

  const checkPaymentStatus = async () => {
    setCheckingStatus(true);
    setStatusMessage(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      // If we don't have orderId, we can search for the last orderId
      const url = orderId 
        ? `${apiUrl}/api/midtrans/status/${orderId}`
        : `${apiUrl}/api/midtrans/status/latest?email=${user?.email}`;
        
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Gagal memverifikasi status pembayaran.");
      }
      const data = await response.json();
      if (data.success) {
        onAddQuota(15, 15, 15);
        setPaymentStep('success');
      } else {
        let msg = "Pembayaran belum terdeteksi. Silakan scan QRIS Anda dan selesaikan pembayaran.";
        if (data.status === 'pending') {
          msg = "Pembayaran Anda masih berstatus PENDING. Silakan selesaikan transaksi Anda.";
        } else if (data.status === 'expire') {
          msg = "Transaksi telah KADALUARSA. Silakan buat transaksi baru.";
        } else if (data.status === 'deny' || data.status === 'cancel') {
          msg = "Transaksi ditolak atau dibatalkan.";
        }
        setStatusMessage(msg);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage("Koneksi bermasalah saat memverifikasi pembayaran.");
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

        {paymentStep === 'details' && (
          <div>
            <div className="text-center mb-6">
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Top Up Kuota Generator Pro
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-serif-display">
                Paket Tambahan Kuota
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-md mx-auto">
                Isi ulang kuota pembuatan bahan ajar & soal dengan pembayaran aman Midtrans.
              </p>
            </div>

            {/* Single Package Card */}
            <div className="border border-blue-500/60 bg-gradient-to-b from-blue-950/40 to-[#182033] rounded-2xl p-6 shadow-xl relative mb-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block">
                    PRO MEMBER
                  </span>
                  <h3 className="text-xl font-bold text-white">{singlePackage.name}</h3>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-amber-400">
                    {singlePackage.priceLabel}
                  </div>
                  <span className="text-[11px] text-gray-400">Sekali Bayar</span>
                </div>
              </div>

              <div className="my-4 border-t border-b border-gray-800/80 py-4">
                <p className="text-xs font-semibold text-gray-300 mb-3">
                  Rincian Kuota Tambahan yang Didapat:
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

              {/* Midtrans Info Badge */}
              <div className="flex items-center justify-between text-xs text-gray-400 bg-[#101524] p-3 rounded-xl border border-gray-800">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-400" />
                  <span>Metode Pembayaran Resmi: <strong className="text-emerald-400 font-bold">QRIS</strong></span>
                </div>
                <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-2.5 py-1 rounded-full font-bold border border-emerald-500/20">
                  Instant QRIS
                </span>
              </div>

              {/* Terms & Refund Policy Box */}
              <div className="mt-4 bg-[#0c101b] border border-gray-800 rounded-xl p-3.5 space-y-2.5">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Ketentuan Penting & Kebijakan Refund
                </p>
                <p className="text-[10.5px] text-gray-400 leading-relaxed">
                  Kuota tidak hangus. Refund ganda/gagal sistem diproses 1x24 jam. Klaim kendala wajib mengirimkan bukti transfer asli dan <strong className="text-gray-300">foto layar monitor utuh</strong> (bukan screenshot biasa) melalui WhatsApp Customer Care.
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
                    className="mt-0.5 w-4 h-4 rounded border-gray-700 text-blue-600 focus:ring-blue-500 bg-gray-900 cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] text-gray-300 leading-normal">
                    Saya memahami dan menyetujui seluruh <strong className="text-amber-400">Kebijakan Pembelian & Pengembalian Dana</strong> di atas.
                  </span>
                </label>
              </div>

              <button
                type="button"
                disabled={!hasAgreed}
                onClick={handleStartPayment}
                className={`w-full mt-4 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${
                  hasAgreed
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 cursor-pointer'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-60'
                }`}
              >
                <span>Bayar Sekarang (QRIS) — Rp 25.000</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {paymentStep === 'loading' && (
          <div className="text-center py-12 flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Membuat Transaksi Aman</h3>
            <p className="text-xs text-gray-400 max-w-xs">
              Menghubungkan ke gerbang pembayaran Midtrans QRIS. Mohon tunggu sebentar...
            </p>
          </div>
        )}

        {paymentStep === 'pending' && (
          <div className="py-2">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <QrCode className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Menunggu Pembayaran QRIS</h3>
              <p className="text-xs text-gray-400 mt-1">
                Silakan selesaikan pembayaran Anda menggunakan aplikasi m-banking atau e-wallet pilihan Anda.
              </p>
            </div>

            <div className="bg-[#182033] border border-gray-800 rounded-2xl p-4 mb-6">
              <p className="text-xs font-bold text-gray-300 mb-3 border-b border-gray-800 pb-2">
                Panduan Pembayaran QRIS:
              </p>
              <ol className="space-y-2.5 text-xs text-gray-400 list-decimal pl-4">
                <li>Buka pop-up pembayaran Snap Midtrans (jika tertutup, silakan klik tombol <strong>Buka Ulang Gerbang Snap</strong>).</li>
                <li>Pindai (scan) kode QRIS yang tampil di layar menggunakan GoPay, OVO, Dana, LinkAja, BCA Mobile, atau aplikasi bank lain.</li>
                <li>Selesaikan transaksi sebesar <strong className="text-white">Rp 25.000</strong> di aplikasi e-wallet / m-banking Anda.</li>
                <li>Setelah Anda melihat konfirmasi pembayaran berhasil di aplikasi Anda, silakan kembali ke halaman ini dan klik tombol <strong className="text-emerald-400">Verifikasi Pembayaran</strong> di bawah.</li>
              </ol>
            </div>

            {statusMessage && (
              <div className="mb-5 bg-blue-950/40 border border-blue-500/30 text-blue-400 p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="space-y-2.5">
              {redirectUrl && (
                <a
                  href={redirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer text-center"
                >
                  <QrCode className="w-5 h-5" />
                  <span>KLIK DI SINI UNTUK SCAN / BAYAR QRIS</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}

              <button
                onClick={checkPaymentStatus}
                disabled={checkingStatus}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {checkingStatus ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sedang Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>CEK STATUS PEMBAYARAN SEKARANG</span>
                  </>
                )}
              </button>

              <div className="flex gap-3">
                <button
                  onClick={handleStartPayment}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs py-3 rounded-xl transition cursor-pointer"
                >
                  Buka Ulang Gerbang Snap
                </button>
                <button
                  onClick={() => setPaymentStep('details')}
                  className="flex-1 bg-red-950/20 hover:bg-red-950/30 text-red-400 border border-red-900/30 font-semibold text-xs py-3 rounded-xl transition cursor-pointer"
                >
                  Ubah / Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {paymentStep === 'success' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Pembayaran Berhasil!
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mb-6 max-w-md mx-auto">
              Terima kasih! Kuota pembuatan Modul Ajar (+15), LKPD (+15), dan Soal HOTS (+15) telah berhasil ditambahkan ke akun Anda.
            </p>
            <button
              onClick={handleFinish}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-8 py-3 rounded-xl shadow-lg cursor-pointer transition"
            >
              Kembali Mengajar & Generate
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
