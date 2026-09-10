import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, FileText, AlertTriangle, Lock, Coins, HelpCircle, PhoneCall } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'disclaimer' | 'privacy' | 'refund';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, defaultTab = 'disclaimer' }) => {
  const [activeTab, setActiveTab] = useState<'disclaimer' | 'privacy' | 'refund'>(defaultTab);

  // Sync state if defaultTab prop changes after mount
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#101524] border border-gray-800 rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-2 rounded-xl bg-gray-800/60 hover:bg-gray-800 transition cursor-pointer"
          id="btn-close-legal-modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 pb-4 mb-6">
          <button
            id="tab-btn-disclaimer"
            onClick={() => setActiveTab('disclaimer')}
            className={`flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl font-bold text-[10px] sm:text-xs transition cursor-pointer ${
              activeTab === 'disclaimer'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-[#182033] text-gray-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Disclaimer (Sanggahan)</span>
          </button>

          <button
            id="tab-btn-privacy"
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl font-bold text-[10px] sm:text-xs transition cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-[#182033] text-gray-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Privacy Policy (Privasi)</span>
          </button>

          <button
            id="tab-btn-refund"
            onClick={() => setActiveTab('refund')}
            className={`flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl font-bold text-[10px] sm:text-xs transition cursor-pointer ${
              activeTab === 'refund'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-[#182033] text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Pembelian & Refund Policy</span>
          </button>
        </div>

        {/* Scrollable Container Content */}
        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          
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

          {/* Tab Content: Terms & Refund Policy */}
          {activeTab === 'refund' && (
            <div className="space-y-4 text-xs text-gray-300 leading-relaxed animate-in fade-in duration-200">
              <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-2xl text-blue-300">
                <Coins className="w-5 h-5 shrink-0" />
                <p className="font-semibold">
                  Mohon membaca kebijakan ini dengan saksama sebelum melakukan transaksi pembayaran.
                </p>
              </div>

              <p className="text-gray-400">
                Selamat datang di <strong>Situs Generator Modul Ajar Premium</strong>. Dengan melakukan pembelian atau top-up kuota, Anda dianggap telah memahami, menyetujui, dan sepakat untuk terikat oleh seluruh ketentuan Kebijakan Pembelian & Pengembalian Dana di bawah ini.
              </p>

              <h3 className="font-bold text-sm text-white font-serif-display mt-4 flex items-center gap-2 border-b border-gray-800 pb-1">
                <span className="text-blue-500">1.</span> Sistem Pembelian & Kuota Premium
              </h3>
              <p>
                <strong>Paket Kuota Pro:</strong> Pembayaran tunggal sebesar <strong>Rp 25.000</strong> akan memberikan pengguna total <strong>45 Kuota Premium</strong> yang terdiri dari:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-gray-300">
                <li><strong>15 kali</strong> proses generate Modul Ajar Kurikulum Merdeka.</li>
                <li><strong>15 kali</strong> proses generate LKPD (Lembar Kerja Peserta Didik).</li>
                <li><strong>15 kali</strong> proses generate Soal Asesmen HOTS.</li>
              </ul>
              <p>
                <strong>Masa Aktif Kuota:</strong> Kuota premium yang telah dibeli <strong>tidak memiliki batas waktu (tidak akan hangus)</strong>. Kuota Anda akan tetap tersimpan aman dan dapat digunakan kapan saja selama situs ini beroperasi secara online.
              </p>
              <p>
                <strong>Akumulasi Pembelian (Top-Up):</strong> Pengguna dapat melakukan top-up paket Pro kapan saja, baik saat kuota aktif masih tersisa maupun saat sudah habis. Kuota baru yang dibeli akan otomatis diakumulasikan (ditambahkan) ke sisa kuota lama Anda secara instan.
              </p>

              <h3 className="font-bold text-sm text-white font-serif-display mt-4 flex items-center gap-2 border-b border-gray-800 pb-1">
                <span className="text-blue-500">2.</span> Kebijakan Batas Penggunaan Wajar (FUP)
              </h3>
              <p>
                Demi menjaga kestabilan kinerja server AI dan menjamin kenyamanan akses bagi seluruh guru lainnya, sistem kami menerapkan batasan teknis berikut:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-gray-300">
                <li>
                  <strong>Fitur Jeda (Cooldown):</strong> Pengguna wajib memberikan jeda waktu minimal <strong>30 detik</strong> setelah melakukan satu kali proses generate bahan ajar sebelum memulai proses generate berikutnya.
                </li>
                <li>
                  <strong>Larangan Otomatisasi:</strong> Pengguna dilarang keras menggunakan bot, skrip otomatis, crawler, scraping, atau alat bantu pihak ketiga untuk menghabiskan kuota atau menyerang sistem. Pelanggaran terhadap ketentuan ini akan mengakibatkan <strong>pemblokiran akun secara permanen</strong> tanpa adanya pengembalian dana dalam bentuk apa pun.
                </li>
              </ul>

              <h3 className="font-bold text-sm text-white font-serif-display mt-4 flex items-center gap-2 border-b border-gray-800 pb-1">
                <span className="text-blue-500">3.</span> Kebijakan Pengembalian Dana (Refund) & Kompensasi
              </h3>
              <p>
                Karena produk yang kami sediakan berupa barang digital instan yang langsung dikonsumsi, maka semua transaksi bersifat final. Namun, kami menerapkan pengecualian pengembalian dana sebagai berikut:
              </p>
              
              <div className="bg-[#182033] rounded-2xl p-4 border border-gray-800 space-y-3">
                <p className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                  A. Kondisi Refund / Kompensasi yang DITERIMA:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-gray-300">
                  <li>
                    <strong>Gagal Sistem / Pendebetan Ganda:</strong> Saldo Anda sudah terpotong oleh bank/e-wallet namun kuota akun tidak bertambah dalam waktu 1x24 jam akibat kegagalan jaringan atau sinkronisasi data Midtrans.
                  </li>
                  <li>
                    <strong>Kompensasi Error Server:</strong> Jika proses generate gagal di tengah jalan akibat masalah teknis/server timeout, sistem kami tidak akan memotong jumlah kuota Anda. Jika kuota terlanjur terpotong namun modul gagal terbentuk, kami akan mengembalikan kuota tersebut ke akun Anda.
                  </li>
                </ul>

                <p className="font-bold text-red-400 text-xs flex items-center gap-1.5 pt-1">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                  B. Kondisi Refund yang DITOLAK:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-gray-300">
                  <li>Pengguna berubah pikiran setelah transaksi berhasil (misalnya: salah membeli, salah pilih paket, atau ternyata tidak jadi memerlukan modul tersebut).</li>
                  <li>Kuota telah digunakan sebagian atau seluruhnya untuk melakukan proses generate bahan ajar.</li>
                  <li>Akun ditangguhkan atau diblokir secara permanen akibat melanggar ketentuan layanan (penggunaan bot, spamming, dsb).</li>
                </ul>
              </div>

              <h3 className="font-bold text-sm text-white font-serif-display mt-4 flex items-center gap-2 border-b border-gray-800 pb-1">
                <span className="text-blue-500">4.</span> Mekanisme Klaim Kendala Pembayaran
              </h3>
              <p>
                Jika Anda mengalami kendala pembayaran (saldo terpotong tetapi kuota belum masuk), harap ikuti prosedur verifikasi ketat berikut agar tim dukungan kami dapat memproses penambahan kuota manual Anda:
              </p>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-3">
                <p className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  Persyaratan Dokumen Verifikasi Wajib (Harus Dikirimkan):
                </p>
                <ol className="list-decimal list-inside space-y-2 pl-1 text-gray-300">
                  <li>
                    <strong>Bukti Pembayaran Sah:</strong> Resi transfer, bukti potong saldo, atau struk resmi dari aplikasi m-banking atau e-wallet (GoPay, OVO, dsb) Anda yang menampilkan <strong>Nomor Referensi (Transaction ID)</strong> dengan sangat jelas.
                  </li>
                  <li>
                    <strong>Foto Layar Monitor (BUKAN Screenshot):</strong> Untuk mencegah kecurangan manipulasi gambar, Anda wajib mengambil foto langsung menggunakan kamera HP lain yang diarahkan ke layar komputer/perangkat Anda saat membuka halaman kuota situs kami. Foto tersebut harus menampilkan:
                    <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-gray-400">
                      <li>Jumlah kuota Anda saat ini yang belum bertambah.</li>
                      <li>Tampilan utuh situs beserta Jam & Tanggal (Timestamp) pada sudut kanan/kiri sistem operasi komputer Anda yang terlihat utuh tanpa sensor/terpotong.</li>
                    </ul>
                  </li>
                </ol>
                <p className="text-[10px] text-amber-300/80 leading-relaxed italic">
                  *Catatan Penting: CF Digitals berhak menolak klaim penambahan kuota manual jika bukti yang dikirimkan berupa tangkapan layar (screenshot) biasa atau jika data transaksi tidak tercatat sama sekali pada log dashboard server sistem Midtrans kami.
                </p>
              </div>

              <p>
                <strong>Durasi Verifikasi:</strong> Tim teknis kami akan mencocokkan bukti foto Anda dengan log database kami dalam waktu maksimal <strong>1x24 jam (Fast Response)</strong>.
              </p>

              <div className="flex items-center gap-3 bg-blue-600/10 border border-blue-600/30 p-4 rounded-2xl text-blue-300 mt-6">
                <PhoneCall className="w-5 h-5 shrink-0 text-emerald-400 animate-pulse" />
                <div>
                  <p className="font-bold text-xs text-white">Hubungi Hubungan Layanan Pelanggan (WhatsApp):</p>
                  <a href="https://wa.me/6287726378446" target="_blank" rel="noopener noreferrer" className="font-extrabold text-sm text-emerald-400 hover:underline">
                    0877-2637-8446
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-800 flex justify-between items-center text-[11px] text-gray-500">
          <span>© 2026 CF Digitals — All Rights Reserved.</span>
          <button
            id="btn-close-legal-action"
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
