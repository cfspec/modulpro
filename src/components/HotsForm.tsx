import React, { useState } from 'react';
import { HelpCircle, Sparkles, Loader2, AlertCircle, Download, BookOpen, CheckCircle, Award, KeyRound, FileText, Printer } from 'lucide-react';
import { SoalHOTSFormData, SoalHOTSGenerated } from '../types';
import { downloadElementAsPdf } from '../lib/pdfUtils';
import { SafeQueueLoading } from './SafeQueueLoading';
import { saveHistoryItem } from '../lib/historyStore';

interface HotsFormProps {
  quotaHots?: number;
  onDeductQuota?: (type: 'modulAjar' | 'lkpd' | 'soalHots') => void;
  onOpenUpgrade?: () => void;
  initialResult?: SoalHOTSGenerated | null;
  initialFormData?: SoalHOTSFormData | null;
  userEmail?: string;
}

export const HotsForm: React.FC<HotsFormProps> = ({
  quotaHots = 25,
  onDeductQuota,
  onOpenUpgrade,
  initialResult = null,
  initialFormData = null,
  userEmail = '',
}) => {
  const [formData, setFormData] = React.useState<SoalHOTSFormData>(initialFormData || {
    mataPelajaran: '',
    tingkatSekolah: 'SMP/MTs',
    kelas: '8',
    materiPokok: '',
    tingkatKesulitan: 'HOTS (C4 - C6)',
    jenisSoal: 'Pilihan Ganda',
    jumlahSoal: 5,
    tujuanPembelajaran: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SoalHOTSGenerated | null>(initialResult);
  const [error, setError] = useState<string | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isQueueActive, setIsQueueActive] = useState(false);

  React.useEffect(() => {
    if (initialResult !== undefined) {
      setResult(initialResult);
    }
    if (initialFormData) {
      setFormData(initialFormData);
    }
  }, [initialResult, initialFormData]);

  // Download PDF directly via html2pdf
  const handleDownloadPdf = async () => {
    const element = document.getElementById("soal-printable-content");
    if (!element) {
      alert("Dokumen tidak ditemukan.");
      return;
    }

    setIsPdfGenerating(true);
    try {
      const safeSubject = (formData.mataPelajaran || 'Soal').replace(/\s+/g, '_');
      const safeMateri = (formData.materiPokok || 'Ujian').replace(/\s+/g, '_');
      const filename = `Paket_Soal_${safeSubject}_${safeMateri}.pdf`;

      await downloadElementAsPdf(element, filename);
    } catch (err: any) {
      console.error("Gagal generate Soal PDF:", err);
      handlePrint();
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // Print function
  const handlePrint = () => {
    const printContent = document.getElementById("soal-printable-content");
    if (!printContent) {
      window.print();
      return;
    }

    try {
      const safeSubject = (formData.mataPelajaran || 'Soal').replace(/\s+/g, ' ');
      const title = `Paket Soal HOTS - ${safeSubject}`;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${title}</title>
              <meta charset="utf-8" />
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                body {
                  font-family: 'Plus Jakarta Sans', Arial, sans-serif;
                  padding: 24px;
                  background: #ffffff !important;
                  color: #111827 !important;
                }
                table { border-collapse: collapse; width: 100%; margin-top: 8px; margin-bottom: 8px; }
                th, td { border: 1px solid #374151; padding: 6px; font-size: 11px; }
                @page { size: A4 portrait; margin: 12mm 15mm; }
                @media print {
                  body { padding: 0; }
                  .no-print { display: none !important; }
                }
              </style>
            </head>
            <body>
              <div>
                ${printContent.innerHTML}
              </div>
              <script>
                setTimeout(() => {
                  window.focus();
                  window.print();
                  setTimeout(() => { window.close(); }, 800);
                }, 500);
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        return;
      }
    } catch (e) {
      console.warn("Print popup fallback to window.print()", e);
    }

    window.print();
  };

  // Export to Word (.doc)
  const handleExportWord = () => {
    if (!result) return;
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='utf-8'><title>" + (result.judul || 'Paket_Soal') + "</title>" +
      "<style>body{font-family:Arial,sans-serif;line-height:1.5;color:#111;} table{border-collapse:collapse;width:100%;margin-top:10px;} td,th{border:1px solid #333;padding:8px;font-size:12px;}</style>" +
      "</head><body>";
    const footer = "</body></html>";
    const element = document.getElementById("soal-printable-content");
    if (!element) return;
    const sourceHTML = header + element.innerHTML + footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    const safeSubject = (formData.mataPelajaran || 'Soal').replace(/\s+/g, '_');
    const safeMateri = (formData.materiPokok || 'Ujian').replace(/\s+/g, '_');
    fileDownload.download = `Paket_Soal_${safeSubject}_${safeMateri}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  // Helper for option counts display
  const getOptionCountInfo = () => {
    const { tingkatSekolah, kelas } = formData;
    const kelasNum = parseInt(kelas) || 1;
    if (tingkatSekolah === 'SD/MI') {
      if (kelasNum <= 3) {
        return 'SD/MI Kelas 1–3: 3 Opsi Jawaban (A, B, C)';
      }
      return 'SD/MI Kelas 4–6: 4 Opsi Jawaban (A, B, C, D)';
    } else if (tingkatSekolah === 'SMP/MTs') {
      return 'SMP/MTs: 4 Opsi Jawaban (A, B, C, D)';
    } else {
      return 'SMA/MA/SMK: 5 Opsi Jawaban (A, B, C, D, E)';
    }
  };

  const handleJenjangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newJenjang = e.target.value;
    let defaultKelas = '1';
    if (newJenjang === 'SMP/MTs') defaultKelas = '7';
    if (newJenjang === 'SMA/MA/SMK') defaultKelas = '10';
    setFormData({
      ...formData,
      tingkatSekolah: newJenjang,
      kelas: defaultKelas,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mataPelajaran || !formData.materiPokok) {
      alert("Harap lengkapi Mata Pelajaran dan Topik / Materi Ujian.");
      return;
    }

    if (quotaHots <= 0) {
      if (onOpenUpgrade) {
        onOpenUpgrade();
      } else {
        alert("Kuota generate Soal Anda telah habis. Silakan Top Up kuota!");
      }
      return;
    }

    setIsQueueActive(true);
    setIsLoading(true);
    setError(null);
  };

  const handleStartHotsRequest = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const res = await fetch(`${apiUrl}/api/generate-hots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Gagal membuat Paket Soal.');
    }

    return await res.json();
  };

  const handleHotsSuccess = (data: any) => {
    setResult(data);
    setIsQueueActive(false);
    setIsLoading(false);

    // Save to history
    saveHistoryItem(
      userEmail,
      'hots',
      `Paket Soal HOTS - ${data.judul || 'Paket Soal'}`,
      formData.mataPelajaran,
      formData.materiPokok,
      formData.kelas ? `Kelas ${formData.kelas}` : 'Semua Kelas',
      data
    );

    if (onDeductQuota) {
      onDeductQuota('soalHots');
    }
  };

  const handleHotsError = (errMessage: string) => {
    setError(errMessage);
    setIsQueueActive(false);
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight font-serif-display leading-tight">
          Generator Soal & Bank Ujian AI
        </h1>
        <p className="text-gray-400 text-sm md:text-base mt-2 max-w-2xl mx-auto">
          silakan isi kolom dibawah ini untuk membuat soal
        </p>
      </div>

      {!result ? (
        <form
          onSubmit={handleSubmit}
          className="bg-[#101524] border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6"
        >
          {error && (
            <div className="bg-red-950/80 border border-red-500/50 rounded-xl p-4 flex items-start gap-3 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Mata Pelajaran & Topik / Materi Ujian */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">
                Mata Pelajaran <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.mataPelajaran}
                onChange={(e) => setFormData({ ...formData, mataPelajaran: e.target.value })}
                placeholder="misal: Pendidikan Pancasila, PAI & BP, IPA, Matematika"
                className="w-full bg-[#181f32] border border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">
                Topik / Materi Ujian <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.materiPokok}
                onChange={(e) => setFormData({ ...formData, materiPokok: e.target.value })}
                placeholder="misal: Pancasila dalam Kehidupan, Sistem Pernapasan"
                className="w-full bg-[#181f32] border border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Jenjang & Kelas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">
                Jenjang Sekolah / Madrasah <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.tingkatSekolah}
                onChange={handleJenjangChange}
                className="w-full bg-[#181f32] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="SD/MI">SD / MI (Sekolah Dasar / Madrasah Ibtidaiyah)</option>
                <option value="SMP/MTs">SMP / MTs (Sekolah Menengah Pertama / Madrasah Tsanawiyah)</option>
                <option value="SMA/MA/SMK">SMA / MA / SMK (Sekolah Menengah Atas / Madrasah Aliyah / Kejuruan)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">
                Kelas <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.kelas}
                onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                className="w-full bg-[#181f32] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {formData.tingkatSekolah === 'SD/MI' && (
                  <>
                    <option value="1">Kelas 1 (Fase A)</option>
                    <option value="2">Kelas 2 (Fase A)</option>
                    <option value="3">Kelas 3 (Fase B)</option>
                    <option value="4">Kelas 4 (Fase B)</option>
                    <option value="5">Kelas 5 (Fase C)</option>
                    <option value="6">Kelas 6 (Fase C)</option>
                  </>
                )}
                {formData.tingkatSekolah === 'SMP/MTs' && (
                  <>
                    <option value="7">Kelas 7 (Fase D)</option>
                    <option value="8">Kelas 8 (Fase D)</option>
                    <option value="9">Kelas 9 (Fase D)</option>
                  </>
                )}
                {formData.tingkatSekolah === 'SMA/MA/SMK' && (
                  <>
                    <option value="10">Kelas 10 (Fase E)</option>
                    <option value="11">Kelas 11 (Fase F)</option>
                    <option value="12">Kelas 12 (Fase F)</option>
                  </>
                )}
              </select>
            </div>
          </div>


          {/* Row 3: Tingkat Kesulitan & Jenis Soal & Jumlah Soal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Tingkat Kesulitan</label>
              <select
                value={formData.tingkatKesulitan}
                onChange={(e) => setFormData({ ...formData, tingkatKesulitan: e.target.value })}
                className="w-full bg-[#181f32] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="HOTS (C4 - C6)">HOTS (C4 Analisis, C5 Evaluasi, C6 Kreasi)</option>
                <option value="Sedang (C3)">Sedang (C3 Penerapan/Aplikasi)</option>
                <option value="Mudah (C1 - C2)">Mudah (C1 Pemahaman, C2 Mengingat)</option>
                <option value="Campuran Bertingkat">Campuran (Proporsional LotS, MotS & HotS)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Jenis Soal</label>
              <select
                value={formData.jenisSoal}
                onChange={(e) => setFormData({ ...formData, jenisSoal: e.target.value })}
                className="w-full bg-[#181f32] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="Pilihan Ganda">Pilihan Ganda</option>
                <option value="Uraian / Isian">Uraian / Isian / Essay</option>
                <option value="Pilihan Ganda Kompleks">Pilihan Ganda Kompleks (Benar/Salah)</option>
                <option value="Campuran (PG & Uraian)">Campuran (Pilihan Ganda & Uraian)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Jumlah Soal</label>
              <select
                value={formData.jumlahSoal}
                onChange={(e) => setFormData({ ...formData, jumlahSoal: Number(e.target.value) })}
                className="w-full bg-[#181f32] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value={5}>5 Soal</option>
                <option value={10}>10 Soal</option>
                <option value={15}>15 Soal</option>
                <option value={20}>20 Soal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Tujuan Pembelajaran (Opsional)</label>
            <textarea
              rows={2}
              value={formData.tujuanPembelajaran || ''}
              onChange={(e) => setFormData({ ...formData, tujuanPembelajaran: e.target.value })}
              placeholder="Contoh: Menganalisis peran dan fungsi Pancasila dalam menjaga keutuhan NKRI"
              className="w-full bg-[#181f32] border border-gray-700 rounded-xl p-3.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30 transition"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span>{isLoading ? 'Menyusun Soal Sesuai Standar Kemendikbud/Kemenag...' : 'Generate Sekarang'}</span>
          </button>
        </form>
      ) : (
        <div className="bg-white text-gray-900 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
            <div>
              <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded uppercase">
                {result.mataPelajaran || formData.mataPelajaran} — {formData.tingkatSekolah} Kelas {formData.kelas}
              </span>
              <h2 className="text-xl md:text-2xl font-bold uppercase text-gray-900 mt-1">
                {result.judul || `PAKET SOAL: ${formData.materiPokok}`}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPdfGenerating}
                onClick={handleDownloadPdf}
                className="bg-red-600 hover:bg-red-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition disabled:opacity-50"
              >
                {isPdfGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isPdfGenerating ? 'Proses PDF...' : 'Simpan PDF (.pdf)'}</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="bg-gray-900 text-white hover:bg-gray-800 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Print</span>
              </button>
              <button
                type="button"
                onClick={handleExportWord}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition"
              >
                <FileText className="w-4 h-4" />
                <span>Download Word (.doc)</span>
              </button>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs cursor-pointer transition"
              >
                Buat Paket Lain
              </button>
            </div>
          </div>

          {/* Printable / Export Word Content */}
          <div id="soal-printable-content" className="space-y-8">
            {/* Header Document */}
            <div className="border-b-2 border-gray-800 pb-4 text-center space-y-1">
              <h1 className="text-2xl font-extrabold text-gray-900 uppercase">
                {result.judul || `PAKET SOAL: ${formData.materiPokok}`}
              </h1>
              <p className="text-xs font-semibold text-gray-700">
                Mata Pelajaran: {result.mataPelajaran || formData.mataPelajaran} | Jenjang: {formData.tingkatSekolah} Kelas {formData.kelas}
              </p>
              <p className="text-xs text-gray-600">
                Topik/Materi: {formData.materiPokok} | Bentuk: {formData.jenisSoal} | Tingkat: {formData.tingkatKesulitan}
              </p>
            </div>

            {/* BAGIAN 1: DAFTAR SOAL UJIAN */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider border-b pb-1.5 border-gray-300">
                BAGIAN I: NASKAH SOAL UJIAN
              </h3>
              <div className="space-y-6">
                {result.soalList?.map((soal, idx) => (
                  <div key={idx} className="border border-gray-300 rounded-xl p-5 bg-gray-50/50 text-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="font-extrabold text-blue-900">Soal No. {soal.no || idx + 1}</span>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                        {soal.levelKognitif || formData.tingkatKesulitan}
                      </span>
                    </div>

                    {soal.stimulus && (
                      <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-lg text-xs leading-relaxed text-gray-800">
                        <strong className="text-amber-900 block mb-1">Stimulus / Wacana Kontekstual:</strong>
                        {soal.stimulus}
                      </div>
                    )}

                    <p className="font-semibold text-gray-900 leading-snug text-sm">{soal.pertanyaan}</p>

                    {/* Render Pilihan Ganda Dynamically (A, B, C for SD 1-3; A-D for SD 4-6 & SMP; A-E for SMA) */}
                    {soal.pilihanGanda && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2 text-xs text-gray-800">
                        {soal.pilihanGanda.A && <div className="p-2 bg-white rounded border border-gray-200"><strong className="text-blue-700">A.</strong> {soal.pilihanGanda.A}</div>}
                        {soal.pilihanGanda.B && <div className="p-2 bg-white rounded border border-gray-200"><strong className="text-blue-700">B.</strong> {soal.pilihanGanda.B}</div>}
                        {soal.pilihanGanda.C && <div className="p-2 bg-white rounded border border-gray-200"><strong className="text-blue-700">C.</strong> {soal.pilihanGanda.C}</div>}
                        {soal.pilihanGanda.D && <div className="p-2 bg-white rounded border border-gray-200"><strong className="text-blue-700">D.</strong> {soal.pilihanGanda.D}</div>}
                        {soal.pilihanGanda.E && <div className="p-2 bg-white rounded border border-gray-200"><strong className="text-blue-700">E.</strong> {soal.pilihanGanda.E}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* BAGIAN 2: KUNCI JAWABAN & PEMBAHASAN (BAGIAN AKHIR SETELAH SELURUH SOAL) */}
            <div className="pt-6 border-t-2 border-dashed border-gray-400 space-y-4">
              <div className="flex items-center gap-2 bg-emerald-100 text-emerald-900 p-3.5 rounded-xl border border-emerald-300">
                <KeyRound className="w-5 h-5 text-emerald-700 shrink-0" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  BAGIAN II: KUNCI JAWABAN, LEVEL KOGNITIF & PEMBAHASAN LENGKAP
                </h3>
              </div>

              <div className="space-y-4">
                {result.soalList?.map((soal, idx) => (
                  <div key={idx} className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950 space-y-2">
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5 font-bold">
                      <span className="text-emerald-900 font-extrabold text-sm">Soal No. {soal.no || idx + 1}</span>
                      <span className="bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                        Level: {soal.levelKognitif || formData.tingkatKesulitan}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <strong className="text-emerald-950">Kunci Jawaban:</strong>
                      <span className="font-extrabold text-blue-900 bg-white px-2.5 py-1 rounded border border-emerald-300 text-xs shadow-xs">
                        {soal.kunciJawaban}
                      </span>
                    </div>
                    <div className="text-gray-800 leading-relaxed">
                      <strong className="text-emerald-950 block mb-0.5">Pembahasan / Rubrik Skor:</strong>
                      <p className="bg-white/80 p-2.5 rounded border border-emerald-200 text-xs">{soal.rubrikAtauPembahasan}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safe Queue Loading Overlay */}
      <SafeQueueLoading
        isOpen={isQueueActive}
        title="Antrean Pembuatan Paket Soal HOTS AI"
        onStartRequest={handleStartHotsRequest}
        onSuccess={handleHotsSuccess}
        onError={handleHotsError}
        onClose={() => {
          setIsQueueActive(false);
          setIsLoading(false);
        }}
      />
    </div>
  );
};

