import React, { useState } from 'react';
import { X, Check, Sparkles, ShieldCheck, QrCode, CreditCard, ArrowRight, CheckCircle2, Shield, Lock, Wallet } from 'lucide-react';
import { PaymentPackage } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddQuota: (amountModul: number, amountLKPD: number, amountHOTS: number) => void;
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
    'Diproses Instan via Midtrans Payment Gateway',
  ],
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onAddQuota }) => {
  const [paymentStep, setPaymentStep] = useState<'details' | 'midtrans' | 'success'>('details');
  const [selectedMethod, setSelectedMethod] = useState<'qris' | 'va_bca' | 'gopay' | 'va_mandiri'>('qris');

  if (!isOpen) return null;

  const handlePaySuccess = () => {
    onAddQuota(singlePackage.quotaModul, singlePackage.quotaLKPD, singlePackage.quotaHOTS);
    setPaymentStep('success');
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
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>Diproses Resmi oleh <strong>Midtrans</strong></span>
                </div>
                <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono">
                  Snap Gateway
                </span>
              </div>

              <button
                type="button"
                onClick={() => setPaymentStep('midtrans')}
                className="w-full mt-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <span>Bayar Sekarang — Rp 25.000</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {paymentStep === 'midtrans' && (
          <div>
            <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black text-xs">
                  M
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Midtrans Snap Payment</h3>
                  <p className="text-[10px] text-gray-400">Order ID: #MDT-{Date.now().toString().slice(-6)}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 block">Total Pembayaran</span>
                <span className="text-base font-black text-amber-400">Rp 25.000</span>
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-300 mb-3">Pilih Metode Pembayaran Midtrans:</p>

            <div className="space-y-2.5 mb-6">
              
              {/* Option 1: QRIS */}
              <div
                onClick={() => setSelectedMethod('qris')}
                className={`p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition ${
                  selectedMethod === 'qris'
                    ? 'border-blue-500 bg-blue-950/40 text-white'
                    : 'border-gray-800 bg-[#182033] text-gray-300 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <QrCode className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-xs font-bold">QRIS Instant (GoPay, OVO, Dana, ShopeePay, BCA, dll)</p>
                    <p className="text-[10px] text-gray-400">Scan otomatis terverifikasi secara langsung</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'qris' ? 'border-blue-500 bg-blue-500' : 'border-gray-600'}`}>
                  {selectedMethod === 'qris' && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>

              {/* Option 2: BCA Virtual Account */}
              <div
                onClick={() => setSelectedMethod('va_bca')}
                className={`p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition ${
                  selectedMethod === 'va_bca'
                    ? 'border-blue-500 bg-blue-950/40 text-white'
                    : 'border-gray-800 bg-[#182033] text-gray-300 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-xs font-bold">BCA Virtual Account (Midtrans VA)</p>
                    <p className="text-[10px] text-gray-400">Transfer m-BCA / KlikBCA / ATM BCA</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'va_bca' ? 'border-blue-500 bg-blue-500' : 'border-gray-600'}`}>
                  {selectedMethod === 'va_bca' && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>

              {/* Option 3: Mandiri Virtual Account */}
              <div
                onClick={() => setSelectedMethod('va_mandiri')}
                className={`p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition ${
                  selectedMethod === 'va_mandiri'
                    ? 'border-blue-500 bg-blue-950/40 text-white'
                    : 'border-gray-800 bg-[#182033] text-gray-300 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-xs font-bold">Mandiri Bill Payment / VA (Midtrans)</p>
                    <p className="text-[10px] text-gray-400">Transfer Livin' by Mandiri</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'va_mandiri' ? 'border-blue-500 bg-blue-500' : 'border-gray-600'}`}>
                  {selectedMethod === 'va_mandiri' && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>

            </div>

            {/* Display Simulated Midtrans Payment Frame */}
            {selectedMethod === 'qris' ? (
              <div className="bg-white p-5 rounded-2xl text-center shadow-lg mb-6 border border-gray-200">
                <QrCode className="w-40 h-40 text-gray-900 mx-auto" />
                <p className="text-[11px] font-bold text-gray-800 mt-2">QRIS MIDTRANS — SIMULASI</p>
                <p className="text-[10px] text-gray-500">Bisa di-scan semua E-Wallet & M-Banking</p>
              </div>
            ) : (
              <div className="bg-[#182033] p-4 rounded-2xl border border-gray-700 mb-6 text-center">
                <p className="text-xs text-gray-400 mb-1">Nomor Virtual Account Midtrans:</p>
                <p className="text-lg font-mono font-bold text-blue-400 tracking-wider">
                  88012 0895 2341 9012
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Berlaku selama 24 jam</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setPaymentStep('details')}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs py-3 rounded-xl transition cursor-pointer"
              >
                Kembali
              </button>
              <button
                onClick={handlePaySuccess}
                className="flex-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simulasi Lunas (Callback Midtrans)</span>
              </button>
            </div>
          </div>
        )}

        {paymentStep === 'success' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Pembayaran Midtrans Berhasil!
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

