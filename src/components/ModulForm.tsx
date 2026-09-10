import React, { useState } from 'react';
import { BookOpen, Sparkles, Loader2, AlertCircle, Printer, Download, FileText, Award, CheckCircle, Edit3 } from 'lucide-react';
import { ModulAjarFormData, ModulAjarGenerated } from '../types';
import { downloadElementAsPdf } from '../lib/pdfUtils';
import { SafeQueueLoading } from './SafeQueueLoading';
import { saveHistoryItem } from '../lib/historyStore';

interface ModulFormProps {
  quotaModul?: number;
  onDeductQuota?: (type: 'modulAjar' | 'lkpd' | 'soalHots') => void;
  onOpenUpgrade?: () => void;
  initialResult?: ModulAjarGenerated | null;
  initialFormData?: ModulAjarFormData | null;
  userEmail?: string;
}

export const ModulForm: React.FC<ModulFormProps> = ({
  quotaModul = 25,
  onDeductQuota,
  onOpenUpgrade,
  initialResult = null,
  initialFormData = null,
  userEmail = '',
}) => {
  const [formData, setFormData] = React.useState<ModulAjarFormData>(initialFormData || {
    namaGuru: '',
    sekolah: '',
    tahunPembuatan: '2026',
    mataPelajaran: '',
    tingkatSekolah: '',
    kelas: '',
    fase: '',
    alokasiWaktu: '2 x 45 menit',
    elemenCPPAI: '',
    materiPokok: '',
    tujuanPembelajaran: '',
    modelPembelajaran: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ModulAjarGenerated | null>(initialResult);
  const [error, setError] = useState<string | null>(null);
  const [isQueueActive, setIsQueueActive] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  React.useEffect(() => {
    if (initialResult !== undefined) {
      setResult(initialResult);
    }
    if (initialFormData) {
      setFormData(initialFormData);
    }
  }, [initialResult, initialFormData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mataPelajaran || !formData.materiPokok) {
      alert("Harap lengkapi Mata Pelajaran dan Topik Pembelajaran.");
      return;
    }

    if (quotaModul <= 0) {
      if (onOpenUpgrade) {
        onOpenUpgrade();
      } else {
        alert("Kuota generate Modul Ajar Anda telah habis. Silakan Top Up kuota!");
      }
      return;
    }

    setIsQueueActive(true);
    setIsLoading(true);
    setError(null);
  };

  const handleStartModulRequest = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const res = await fetch(`${apiUrl}/api/generate-modul`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Gagal membuat Modul Ajar.');
    }

    return await res.json();
  };

  const handleModulSuccess = (data: any) => {
    setResult(data);
    setIsQueueActive(false);
    setIsLoading(false);
    
    // Save to history
    saveHistoryItem(
      userEmail,
      'modul',
      `Modul Ajar - ${data.informasiUmum?.mapel || formData.mataPelajaran || 'Tanpa Mapel'}`,
      formData.mataPelajaran,
      formData.materiPokok,
      formData.kelas || data.informasiUmum?.kelas || 'Semua Kelas',
      data
    );

    if (onDeductQuota) {
      onDeductQuota('modulAjar');
    }
  };

  const handleModulError = (errMessage: string) => {
    setError(errMessage);
    setIsQueueActive(false);
    setIsLoading(false);
  };

  // Export to Word (.doc / .docx)
  const handleExportWord = () => {
    if (!result) return;
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='utf-8'><title>Modul Ajar Kurikulum Merdeka</title>" +
      "<style>body{font-family:Arial,sans-serif;line-height:1.5;color:#111;} table{border-collapse:collapse;width:100%;margin-top:10px;} td,th{border:1px solid #333;padding:6px;font-size:11px;} .blue-bar{background-color:#0f3860;color:#ffffff;padding:6px;font-weight:bold;margin-top:15px;}</style>" +
      "</head><body>";
    const footer = "</body></html>";
    const element = document.getElementById("modul-printable-content");
    if (!element) return;
    const sourceHTML = header + element.innerHTML + footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    const safeMatpel = (formData.mataPelajaran || 'Modul').replace(/\s+/g, '_');
    const safeTopik = (formData.materiPokok || 'Ajar').replace(/\s+/g, '_');
    fileDownload.download = `Modul_Ajar_${safeMatpel}_${safeTopik}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  // Download PDF directly via html2pdf
  const handleDownloadPdf = async () => {
    const element = document.getElementById("modul-printable-content");
    if (!element) {
      alert("Dokumen tidak ditemukan.");
      return;
    }

    setIsPdfGenerating(true);
    try {
      const safeMatpel = (formData.mataPelajaran || 'Modul').replace(/\s+/g, '_');
      const safeTopik = (formData.materiPokok || 'Ajar').replace(/\s+/g, '_');
      const filename = `Modul_Ajar_${safeMatpel}_${safeTopik}.pdf`;

      await downloadElementAsPdf(element, filename);
    } catch (err: any) {
      console.error("Gagal generate PDF:", err);
      handlePrint();
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // Print function (opens clean printable window with A4 formatting)
  const handlePrint = () => {
    const printContent = document.getElementById("modul-printable-content");
    if (!printContent) {
      window.print();
      return;
    }

    try {
      const safeMatpel = (formData.mataPelajaran || 'Modul').replace(/\s+/g, ' ');
      const title = `Modul Ajar - ${safeMatpel}`;

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
                .bg-\\[\\#0f3860\\] { background-color: #0f3860 !important; color: #ffffff !important; }
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

  const renderArrayOrParagraph = (data: any) => {
    if (Array.isArray(data)) {
      return (
        <ul className="list-disc list-inside space-y-1 pl-1">
          {data.map((item, idx) => (
            <li key={idx} className="leading-relaxed">{item}</li>
          ))}
        </ul>
      );
    }
    return <p className="leading-relaxed">{data || '-'}</p>;
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight font-serif-display leading-tight">
          Generator Modul Ajar Kurikulum Merdeka
        </h1>
        <p className="text-gray-400 text-sm md:text-base mt-2 max-w-2xl mx-auto">
          Mari buat modul ajar sekarang yuk!
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

          {/* Row 1: Nama Guru & Sekolah */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Nama Guru</label>
              <input
                type="text"
                value={formData.namaGuru}
                onChange={(e) => setFormData({ ...formData, namaGuru: e.target.value })}
                placeholder="Masukkan nama lengkap"
                className="w-full bg-[#181f32] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Sekolah</label>
              <input
                type="text"
                value={formData.sekolah}
                onChange={(e) => setFormData({ ...formData, sekolah: e.target.value })}
                placeholder="Nama sekolah"
                className="w-full bg-[#181f32] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Row 2: Tahun Pembuatan & Mata Pelajaran */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Tahun Pembuatan</label>
              <input
                type="text"
                value={formData.tahunPembuatan}
                onChange={(e) => setFormData({ ...formData, tahunPembuatan: e.target.value })}
                placeholder="2026"
                className="w-full bg-[#181f32] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">
                Mata Pelajaran <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.mataPelajaran}
                onChange={(e) => setFormData({ ...formData, mataPelajaran: e.target.value })}
                placeholder="Matematika, Fisika, PAI, dll"
                className="w-full bg-[#181f32] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Row 3: Jenjang, Kelas, Fase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Jenjang</label>
              <select
                value={formData.tingkatSekolah}
                onChange={(e) => setFormData({ ...formData, tingkatSekolah: e.target.value })}
                className="w-full bg-[#181f32] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="">Pilih Jenjang</option>
                <option value="SD/MI">SD / MI</option>
                <option value="SMP/MTs">SMP / MTs</option>
                <option value="SMA/MA/SMK">SMA / MA / SMK</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Kelas</label>
              <select
                value={formData.kelas}
                onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                className="w-full bg-[#181f32] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="">Pilih Kelas</option>
                <option value="1">Kelas 1</option>
                <option value="2">Kelas 2</option>
                <option value="3">Kelas 3</option>
                <option value="4">Kelas 4</option>
                <option value="5">Kelas 5</option>
                <option value="6">Kelas 6</option>
                <option value="7">Kelas 7</option>
                <option value="8">Kelas 8</option>
                <option value="9">Kelas 9</option>
                <option value="10">Kelas 10</option>
                <option value="11">Kelas 11</option>
                <option value="12">Kelas 12</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Fase</label>
              <select
                value={formData.fase}
                onChange={(e) => setFormData({ ...formData, fase: e.target.value })}
                className="w-full bg-[#181f32] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="">Pilih Fase</option>
                <option value="Fase A (Kelas 1-2 SD)">Fase A (Kelas 1-2 SD/MI)</option>
                <option value="Fase B (Kelas 3-4 SD)">Fase B (Kelas 3-4 SD/MI)</option>
                <option value="Fase C (Kelas 5-6 SD)">Fase C (Kelas 5-6 SD/MI)</option>
                <option value="Fase D (Kelas 7-9 SMP)">Fase D (Kelas 7-9 SMP/MTs)</option>
                <option value="Fase E (Kelas 10 SMA)">Fase E (Kelas 10 SMA/MA/SMK)</option>
                <option value="Fase F (Kelas 11-12 SMA)">Fase F (Kelas 11-12 SMA/MA/SMK)</option>
              </select>
            </div>
          </div>

          {/* Row 4: Alokasi Waktu */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Alokasi Waktu</label>
            <input
              type="text"
              value={formData.alokasiWaktu}
              onChange={(e) => setFormData({ ...formData, alokasiWaktu: e.target.value })}
              placeholder="2 x 45 menit"
              className="w-full bg-[#181f32] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Row 5: Elemen CP 032/034 PAI BP (Opsional - Khusus PAI) */}
          <div className="p-4 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-purple-200 text-sm font-bold flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-purple-400" />
                Elemen CP 032/034 PAI & BP <span className="text-xs font-normal text-purple-300">(Pilihan Opsional - Khusus Mapel PAI & BP)</span>
              </label>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono">
                BSKAP 034 / Kemenag
              </span>
            </div>
            <select
              value={formData.elemenCPPAI || ''}
              onChange={(e) => setFormData({ ...formData, elemenCPPAI: e.target.value })}
              className="w-full bg-[#181f32] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
            >
              <option value="">-- Bukan PAI / Pilih Elemen CP PAI & BP (Opsional) --</option>
              <option value="Al-Qur'an dan Hadis">Elemen 1: Al-Qur'an dan Hadis</option>
              <option value="Akidah">Elemen 2: Akidah</option>
              <option value="Akhlak">Elemen 3: Akhlak</option>
              <option value="Fikih">Elemen 4: Fikih</option>
              <option value="Sejarah Peradaban Islam (SPI)">Elemen 5: Sejarah Peradaban Islam (SPI)</option>
            </select>
            <p className="text-[11px] text-purple-300/80 leading-relaxed">
              *Pilih elemen di atas jika mata pelajaran adalah Pendidikan Agama Islam & Budi Pekerti (PAI & BP) agar penyusunan indikator & materi selaras dengan regulasi CP BSKAP 034 PAI.
            </p>
          </div>

          {/* Row 6: Topik Pembelajaran */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">
              Topik Pembelajaran <span className="text-gray-400 font-normal">(misal: Menghindari sikap Riya dan Sum'ah)</span> <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={formData.materiPokok}
              onChange={(e) => setFormData({ ...formData, materiPokok: e.target.value })}
              placeholder="Masukkan topik untuk materi yang dibahas (bukan judul Bab nya)"
              className="w-full bg-[#181f32] border border-gray-700 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Row 7: Tujuan Pembelajaran (TP) yang diisi guru */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">
              Tujuan Pembelajaran (TP) <span className="text-gray-400 font-normal">(diisi oleh guru, opsional tetapi sangat disarankan)</span>
            </label>
            <textarea
              rows={3}
              value={formData.tujuanPembelajaran}
              onChange={(e) => setFormData({ ...formData, tujuanPembelajaran: e.target.value })}
              placeholder="Masukkan Tujuan Pembelajaran yang ingin dicapai (misal: Peserta didik mampu menganalisis bahaya sifat riya' dan sum'ah dalam kehidupan sehari-hari)"
              className="w-full bg-[#181f32] border border-gray-700 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Row 8: Model Pembelajaran */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Model Pembelajaran</label>
            <input
              type="text"
              value={formData.modelPembelajaran}
              onChange={(e) => setFormData({ ...formData, modelPembelajaran: e.target.value })}
              placeholder="PBL, PjBL, Discovery Learning, dll"
              className="w-full bg-[#181f32] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30 transition"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
            <span>{isLoading ? 'Menyusun Modul Ajar Resmi Kurikulum Merdeka...' : 'Generate Sekarang'}</span>
          </button>
        </form>
      ) : (
        <div className="bg-white text-gray-900 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
            <div>
              <span className="bg-purple-100 text-purple-900 text-[11px] font-bold px-2.5 py-0.5 rounded uppercase">
                {formData.mataPelajaran} — {formData.tingkatSekolah || 'Sekolah'} {formData.kelas && `Kelas ${formData.kelas}`}
              </span>
              <h2 className="text-xl md:text-2xl font-bold uppercase text-gray-900 mt-1">
                MODUL AJAR: {formData.materiPokok}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition ${
                  isEditMode
                    ? 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>{isEditMode ? 'Selesai Edit' : 'Edit Hasil Modul'}</span>
              </button>
              <button
                type="button"
                disabled={isPdfGenerating}
                onClick={handleDownloadPdf}
                className="bg-red-600 hover:bg-red-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition disabled:opacity-50"
              >
                {isPdfGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isPdfGenerating ? 'Proses PDF...' : 'Simpan PDF (.pdf)'}</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="bg-gray-900 text-white hover:bg-gray-800 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Print</span>
              </button>
              <button
                type="button"
                onClick={handleExportWord}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition"
              >
                <FileText className="w-4 h-4" />
                <span>Download Word (.doc)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setIsEditMode(false);
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs cursor-pointer transition"
              >
                Buat Modul Lain
              </button>
            </div>
          </div>

          {isEditMode && (
            <div className="no-print bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs font-medium">
              <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Mode Edit Langsung Aktif:</strong> Anda dapat mengeklik teks mana saja di dokumen bawah ini secara langsung untuk mengubah, menambah, atau mengurangi tulisan sebelum dicetak / di-download.
              </span>
            </div>
          )}

          {/* Printable Document - Exact Standard Template Format */}
          <div
            id="modul-printable-content"
            contentEditable={isEditMode}
            suppressContentEditableWarning={true}
            className={`space-y-6 text-xs text-gray-900 font-sans leading-relaxed transition-all ${
              isEditMode ? 'ring-2 ring-amber-400 p-4 rounded-xl bg-amber-50/10' : ''
            }`}
          >
            {/* Header Document */}
            <div className="text-center border-b-2 border-gray-900 pb-3">
              <h1 className="text-2xl font-black text-[#0f3860] uppercase tracking-wide">MODUL AJAR</h1>
            </div>

            {/* I. INFORMASI UMUM */}
            <div className="space-y-4">
              <div className="bg-[#0f3860] text-white p-2.5 font-bold uppercase tracking-wide text-xs rounded-sm">
                I. INFORMASI UMUM
              </div>

              {/* Table Informasi Utama */}
              <table className="w-full border-collapse border border-gray-400 text-xs">
                <tbody>
                  <tr className="border-b border-gray-400">
                    <td className="p-2 font-bold w-1/3 border-r border-gray-400">Nama Penyusun</td>
                    <td className="p-2 font-bold">: {result.informasiUmum?.penyusun || formData.namaGuru || '-'}</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-2 font-bold border-r border-gray-400">Institusi</td>
                    <td className="p-2">: {result.informasiUmum?.instansi || formData.sekolah || '-'}</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-2 font-bold border-r border-gray-400">Tahun Pembuatan</td>
                    <td className="p-2">: {result.informasiUmum?.tahun || formData.tahunPembuatan || '2026'}</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-2 font-bold border-r border-gray-400">Mata Pelajaran</td>
                    <td className="p-2 font-bold text-[#0f3860]">: {result.informasiUmum?.mapel || formData.mataPelajaran}</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-2 font-bold border-r border-gray-400">Jenjang</td>
                    <td className="p-2">: {result.informasiUmum?.jenjang || formData.tingkatSekolah || '-'}</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-2 font-bold border-r border-gray-400">Kelas</td>
                    <td className="p-2">: {result.informasiUmum?.kelas || formData.kelas || '-'}</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-2 font-bold border-r border-gray-400">Alokasi Waktu</td>
                    <td className="p-2">: {result.informasiUmum?.alokasiWaktu || formData.alokasiWaktu || '-'}</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-2 font-bold border-r border-gray-400">Fase</td>
                    <td className="p-2">: {result.informasiUmum?.fase || formData.fase || '-'}</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-2 font-bold border-r border-gray-400">Capaian Pembelajaran</td>
                    <td className="p-2 leading-relaxed">: {result.informasiUmum?.cp || '-'}</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-2 font-bold border-r border-gray-400">Elemen / Elemen CP</td>
                    <td className="p-2 font-semibold text-[#0f3860]">: {result.informasiUmum?.elemen || formData.elemenCPPAI || '-'}</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-2 font-bold border-r border-gray-400">Kata Kunci, Topik / Konten Inti</td>
                    <td className="p-2">: {result.informasiUmum?.topik || formData.materiPokok}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold border-r border-gray-400">Materi</td>
                    <td className="p-2">: {result.informasiUmum?.materi || formData.materiPokok}</td>
                  </tr>
                </tbody>
              </table>

              {/* Side-by-side: Kompetensi Awal & 8 Dimensi Profil Lulusan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-400 p-3 rounded-xs space-y-1">
                  <h4 className="font-bold text-gray-900">Kompetensi Awal:</h4>
                  <p className="text-gray-800 leading-relaxed">{result.informasiUmum?.kompetensiAwal || '-'}</p>
                </div>
                <div className="border border-gray-400 p-3 rounded-xs space-y-1">
                  <h4 className="font-bold text-gray-900">8 Dimensi Profil Lulusan:</h4>
                  <ol className="list-decimal list-inside text-gray-800 space-y-0.5">
                    <li>Keimanan & Ketaqwaan</li>
                    <li>Kewargaan</li>
                    <li>Penalaran Kritis</li>
                    <li>Kreativitas</li>
                    <li>Kolaborasi</li>
                    <li>Kemandirian</li>
                    <li>Kesehatan</li>
                    <li>Komunikasi</li>
                  </ol>
                </div>
              </div>

              {/* Prasyarat Pengetahuan */}
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900">Prasyarat Pengetahuan/Keterampilan:</h4>
                <p className="p-2.5 bg-gray-50 border border-gray-300 rounded text-gray-800">{result.informasiUmum?.prasyarat || '-'}</p>
              </div>

              {/* Sarana dan Prasarana */}
              <div className="space-y-2">
                <h4 className="font-bold text-[#0f3860] text-sm">Sarana dan Prasarana</h4>
                <p className="text-gray-600 italic">(Materi ajar, Alat dan bahan)</p>

                <table className="w-full border-collapse border border-gray-400 text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-400">
                      <th className="p-2 border-r border-gray-400 text-left w-1/4">Materi</th>
                      <th className="p-2 border-r border-gray-400 text-left w-1/3">Media</th>
                      <th className="p-2 border-r border-gray-400 text-left w-1/6">Metode</th>
                      <th className="p-2 text-left w-1/4">Sumber</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border-r border-gray-400 align-top">{result.informasiUmum?.materiUtama || formData.materiPokok}</td>
                      <td className="p-2 border-r border-gray-400 align-top leading-relaxed">
                        Laptop, Computer, ponsel pintar<br />
                        Jaringan internet<br />
                        Proyektor/LCD, Layar dan Alat Penunjuk<br />
                        Power Point Presentation<br />
                        Papan tulis & Spidol warna<br />
                        Lembar Kerja Peserta Didik (LKPD)
                      </td>
                      <td className="p-2 border-r border-gray-400 align-top">{result.informasiUmum?.metode || 'Silakan isi metodenya (Diskusi, Tanya Jawab, Ceramah, Presentasi)'}</td>
                      <td className="p-2 align-top leading-relaxed">
                        Buku Panduan Guru<br />
                        Buku Panduan Siswa<br />
                        Audio CD/VCD/ DVD<br />
                        Rekaman untuk Listening<br />
                        Loud Speaker<br />
                        Film/gambar<br />
                        Suara guru<br />
                        Koran/majalah
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Target & Jumlah Siswa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-400 p-3">
                <div>
                  <h4 className="font-bold text-gray-900">Target Peserta Didik:</h4>
                  <ul className="list-disc list-inside text-gray-800 space-y-0.5">
                    <li>Peserta didik reguler/tipikal</li>
                    <li>Peserta didik dengan pencapaian tinggi</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Jumlah siswa:</h4>
                  <p className="text-gray-800">{result.informasiUmum?.jumlahSiswa || 'Maksimum 36-40 Siswa'}</p>
                </div>
              </div>

              {/* Model Pembelajaran */}
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900">Model Pembelajaran:</h4>
                <p className="p-2 bg-gray-50 border border-gray-300 rounded font-semibold text-[#0f3860]">
                  {result.informasiUmum?.modelPembelajaran || formData.modelPembelajaran}
                </p>
              </div>
            </div>

            {/* II. KOMPONEN INTI */}
            <div className="space-y-4 pt-4">
              <div className="bg-[#0f3860] text-white p-2.5 font-bold uppercase tracking-wide text-xs rounded-sm">
                II. KOMPONEN INTI
              </div>

              {/* A. Tujuan Pembelajaran */}
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-sm">A. Tujuan Pembelajaran</h4>
                {renderArrayOrParagraph(result.komponenInti?.tujuanPembelajaran)}
              </div>

              {/* B. Pemahaman Bermakna */}
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-sm">B. Pemahaman Bermakna</h4>
                {renderArrayOrParagraph(result.komponenInti?.pemahamanBermakna)}
              </div>

              {/* C. Pertanyaan Pemantik */}
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-sm">C. Pertanyaan Pemantik</h4>
                {renderArrayOrParagraph(result.komponenInti?.pertanyaanPemantik)}
              </div>

              {/* D. Persiapan Pembelajaran */}
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-sm">D. Persiapan Pembelajaran</h4>
                {renderArrayOrParagraph(result.komponenInti?.persiapanPembelajaran)}
              </div>

              {/* E. Kegiatan Pembelajaran */}
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-gray-900 text-sm">E. Kegiatan Pembelajaran</h4>
                <div className="text-center font-bold text-xs uppercase tracking-wider text-[#0f3860] bg-gray-100 p-1.5 border border-gray-300">
                  PERTEMUAN KE
                </div>

                <table className="w-full border-collapse border border-gray-400 text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-400">
                      <th className="p-2 border-r border-gray-400 text-left w-4/5">Kegiatan</th>
                      <th className="p-2 text-center w-1/5">Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Pendahuluan */}
                    <tr className="border-b border-gray-400">
                      <td className="p-2 border-r border-gray-400 align-top space-y-1">
                        <strong className="block text-gray-900">Kegiatan Pendahuluan</strong>
                        {renderArrayOrParagraph(result.komponenInti?.kegiatanPembelajaran?.pendahuluan)}
                      </td>
                      <td className="p-2 text-center align-middle font-bold">
                        {result.komponenInti?.kegiatanPembelajaran?.waktuPendahuluan || '15'} menit
                      </td>
                    </tr>

                    {/* Inti */}
                    <tr className="border-b border-gray-400">
                      <td className="p-2 border-r border-gray-400 align-top space-y-1">
                        <strong className="block text-gray-900">Kegiatan Inti</strong>
                        {renderArrayOrParagraph(result.komponenInti?.kegiatanPembelajaran?.inti)}
                      </td>
                      <td className="p-2 text-center align-middle font-bold">
                        {result.komponenInti?.kegiatanPembelajaran?.waktuInti || '60'} menit
                      </td>
                    </tr>

                    {/* Note row */}
                    <tr className="border-b border-gray-400 bg-amber-50/50 italic text-[11px] text-gray-700">
                      <td colSpan={2} className="p-2">
                        Catatan: Selama pembelajaran berlangsung, guru mengamati sikap siswa dalam pembelajaran yang meliputi sikap: disiplin, rasa percaya diri, berperilaku jujur, tangguh menghadapi masalah, tanggung jawab, rasa ingin tahu, peduli lingkungan, dan komunikasi.
                      </td>
                    </tr>

                    {/* Penutup */}
                    <tr>
                      <td className="p-2 border-r border-gray-400 align-top space-y-1">
                        <strong className="block text-gray-900">Kegiatan Penutup</strong>
                        {renderArrayOrParagraph(result.komponenInti?.kegiatanPembelajaran?.penutup)}
                      </td>
                      <td className="p-2 text-center align-middle font-bold">
                        {result.komponenInti?.kegiatanPembelajaran?.waktuPenutup || '15'} menit
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* F. ASESMEN / PENILAIAN */}
              <div className="space-y-3 pt-4">
                <div className="bg-[#0f3860] text-white p-2.5 font-bold uppercase tracking-wide text-xs rounded-sm">
                  F. ASESMEN / PENILAIAN
                </div>

                <h4 className="font-bold text-gray-900 text-center uppercase tracking-wide">
                  LEMBAR OBSERVASI KEGIATAN PEMBELAJARAN
                </h4>

                <div className="grid grid-cols-2 gap-4 text-xs text-gray-800">
                  <div>
                    <p>Nama Peserta didik : ..........................................</p>
                    <p>Kelas : ......................................................</p>
                  </div>
                  <div>
                    <p>Pertemuan Ke- : .........</p>
                    <p>Hari/Tanggal Pelaksanaan : ..........................................</p>
                  </div>
                </div>

                <p className="italic text-gray-700 text-xs">
                  Berilah penilaian terhadap aspek pengamatan yang diamati dengan membubuhkan tanda ceklis (✓) pada berbagai nilai sesuai Indikator.
                </p>

                {/* Lembar Observasi Table */}
                <table className="w-full border-collapse border border-gray-400 text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-400">
                      <th className="p-2 border-r border-gray-400 w-10 text-center">NO</th>
                      <th className="p-2 border-r border-gray-400 text-left">ASPEK YANG DIAMATI</th>
                      <th className="p-1 border-r border-gray-400 w-16 text-center">KURANG (1)</th>
                      <th className="p-1 border-r border-gray-400 w-16 text-center">CUKUP (2)</th>
                      <th className="p-1 border-r border-gray-400 w-16 text-center">BAIK (3)</th>
                      <th className="p-1 w-20 text-center">SANGAT BAIK (4)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Section 1: Pendahuluan */}
                    <tr className="border-b border-gray-400 bg-gray-50 font-bold">
                      <td className="p-2 border-r border-gray-400 text-center">1</td>
                      <td colSpan={5} className="p-2">Pendahuluan</td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="p-2 border-r border-gray-400 text-center"></td>
                      <td className="p-2 border-r border-gray-400">• Melakukan do'a sebelum belajar</td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td></td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="p-2 border-r border-gray-400 text-center"></td>
                      <td className="p-2 border-r border-gray-400">• Mencermati penjelasan guru berkaitan dengan materi yang akan dibahas</td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td></td>
                    </tr>

                    {/* Section 2: Kegiatan Inti */}
                    <tr className="border-b border-gray-400 bg-gray-50 font-bold">
                      <td className="p-2 border-r border-gray-400 text-center">2</td>
                      <td colSpan={5} className="p-2">Kegiatan Inti</td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="p-2 border-r border-gray-400 text-center"></td>
                      <td className="p-2 border-r border-gray-400">• Keaktifan siswa dalam pembelajaran</td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td></td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="p-2 border-r border-gray-400 text-center"></td>
                      <td className="p-2 border-r border-gray-400">• Kerjasama dalam diskusi kelompok</td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td></td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="p-2 border-r border-gray-400 text-center"></td>
                      <td className="p-2 border-r border-gray-400">• Mengajukan pertanyaan</td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td></td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="p-2 border-r border-gray-400 text-center"></td>
                      <td className="p-2 border-r border-gray-400">• Menyampaikan pendapat</td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td></td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="p-2 border-r border-gray-400 text-center"></td>
                      <td className="p-2 border-r border-gray-400">• Menghargai pendapat orang lain</td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td></td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="p-2 border-r border-gray-400 text-center"></td>
                      <td className="p-2 border-r border-gray-400">• Menggunakan alat peraga pembelajaran / LKPD Flowchart</td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td></td>
                    </tr>

                    {/* Section 3: Penutup */}
                    <tr className="border-b border-gray-400 bg-gray-50 font-bold">
                      <td className="p-2 border-r border-gray-400 text-center">3</td>
                      <td colSpan={5} className="p-2">Penutup</td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="p-2 border-r border-gray-400 text-center"></td>
                      <td className="p-2 border-r border-gray-400">• Menyampaikan refleksi pembelajaran</td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td></td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="p-2 border-r border-gray-400 text-center"></td>
                      <td className="p-2 border-r border-gray-400">• Mengerjakan latihan soal secara mandiri</td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td></td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-gray-400 text-center"></td>
                      <td className="p-2 border-r border-gray-400">• Memperhatikan arahan guru berkaitan materi selanjutnya</td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td className="border-r border-gray-400"></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-[11px] font-semibold text-gray-800">
                  Keterangan Penskoran: Skor 1 = Kurang, Skor 2 = Cukup, Skor 3 = Baik, Skor 4 = Sangat Baik
                </p>
              </div>

              {/* G. REMEDIAL DAN PENGAYAAN */}
              <div className="space-y-3 pt-4">
                <div className="bg-[#0f3860] text-white p-2.5 font-bold uppercase tracking-wide text-xs rounded-sm">
                  G. REMEDIAL DAN PENGAYAAN (PROGRAM TINDAK LANJUT)
                </div>

                <div className="space-y-2 text-xs leading-relaxed text-gray-800">
                  <h4 className="font-bold text-gray-900 text-sm">Remedial</h4>
                  <p>
                    Peserta didik yang belum mencapai KKTP (75) diberi tugas untuk mengulang materi yang belum dipahami dan mengerjakan soal perbaikan atau tugas tambahan yang relevan selama dua minggu. Setelah dua minggu guru mengevaluasi kemajuan kompetensi peserta didik, Kemudian guru melaksanakan penilaian remedial.
                  </p>
                  <p>
                    Guru memberi semangat kepada peserta didik yang belum mencapai KKTP (Kriteria Ketercapaian Tujuan Pembelajaran). Guru akan memberikan tugas bagi peserta didik yang belum mencapai KKTP (Kriteria Ketercapaian Tujuan Pembelajaran), misalnya sebagai berikut:
                  </p>
                  <p className="pl-2">
                    • Peserta didik yang belum menguasai materi akan dijelaskan kembali oleh guru. Guru akan melakukan penilaian kembali dengan soal yang sejenis. Remedial dilaksanakan pada waktu dan hari tertentu yang disesuaikan contoh: pada saat jam belajar, apabila masih ada waktu, atau di luar jam pelajaran (30 menit setelah jam pelajaran selesai).
                  </p>

                  <p className="font-bold text-gray-900 mt-2">Tulis kegiatan pembelajaran remedial antara lain dalam bentuk:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>➤ Pembelajaran ulang</li>
                    <li>➤ Bimbingan perorangan</li>
                    <li>➤ Belajar kelompok</li>
                    <li>➤ Pemanfaatan tutor sebaya</li>
                    <li>➤ Bagi peserta didik yang belum mencapai ketuntasan belajar sesuai hasil analisis penilaian</li>
                  </ul>

                  <p className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-950 font-medium">
                    Program Remedial Khusus Materi Ini: {result.komponenInti?.pengayaanDanRemedial?.remedial}
                  </p>

                  <h4 className="font-bold text-gray-900 text-sm pt-2">Pengayaan</h4>
                  <p>
                    Peserta didik yang telah mencapai tujuan pembelajaran diberikan tugas pendalaman materi berupa proyek mandiri, eksplorasi kasus nyata, atau menjadi tutor sebaya.
                  </p>
                  <p>
                    Pengayaan diberikan untuk menambah wawasan peserta didik mengenai materi pembelajaran yang dapat diberikan kepada peserta didik yang telah tuntas mencapai KKTP (Kriteria Ketercapaian Tujuan Pembelajaran).
                  </p>
                  <p>
                    Pengayaan dapat ditagihkan atau tidak ditagihkan, sesuai kesepakatan dengan peserta didik. Direncanakan berdasarkan materi pembelajaran yang membutuhkan pengembangan lebih luas misalnya:
                  </p>
                  <p className="pl-2">
                    Berdasarkan hasil analisis penilaian, peserta didik yang sudah mencapai ketuntasan belajar diberi kegiatan pembelajaran pengayaan untuk perluasan dan/atau pendalaman materi antara lain dalam bentuk tugas mengerjakan soal-soal dengan tingkat kesulitan lebih tinggi, meringkas buku-buku referensi dan mewawancarai narasumber.
                  </p>

                  <p className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-950 font-medium">
                    Program Pengayaan Khusus Materi Ini: {result.komponenInti?.pengayaanDanRemedial?.pengayaan}
                  </p>
                </div>
              </div>

              {/* H. REFLEKSI */}
              <div className="space-y-3 pt-4">
                <div className="bg-[#0f3860] text-white p-2.5 font-bold uppercase tracking-wide text-xs rounded-sm">
                  H. REFLEKSI
                </div>

                <div className="space-y-2 text-xs leading-relaxed text-gray-800">
                  <h4 className="font-bold text-gray-900 text-sm">Refleksi Untuk Siswa</h4>
                  <p>
                    Peserta didik diminta melakukan refleksi terhadap proses pembelajaran terkait dengan penguasaan materi, pendekatan dan model pembelajaran yang digunakan.
                  </p>
                  <p>
                    Guru memberikan apresiasi atas partisipasi semua peserta didik.
                  </p>

                  <h4 className="font-bold text-gray-900 text-sm pt-2">Refleksi Untuk Guru</h4>
                  <p>
                    Refleksi pembelajaran yang dilakukan oleh guru terhadap siswa pada akhir pertemuan setelah pembelajaran. Berikut ini beberapa pertanyaan kunci dalam refleksi pembelajaran:
                  </p>

                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>Apakah dalam membuka pelajaran dan memberikan penjelasan teknis atau instruksi yang disampaikan untuk pembelajaran yang akan dilakukan dapat dipahami oleh siswa?</li>
                    <li>Keberhasilan apa saja yang dicapai pada bab ini?</li>
                    <li>Apa yang harus menjadi perhatian khusus dalam pelaksanaan pembelajaran pada materi ini?</li>
                    <li>Apa yang harus diperbaiki?</li>
                    <li>Bagaimana tanggapan siswa terhadap materi atau bahan ajar, pengelolaan kelas, latihan dan penilaian yang telah dilakukan dalam pembelajaran?</li>
                    <li>Apakah dalam berjalannya proses pembelajaran sesuai dengan yang diharapkan?</li>
                    <li>Apakah 100% siswa mencapai tujuan pembelajaran? Jika tidak, berapa persen (%) yang belum tercapai?</li>
                    <li>Apakah materi dapat tersampaikan dengan baik?</li>
                    <li>Apakah ada sesuatu yang menarik pada pembelajaran materi ini?</li>
                    <li>Materi mana yang ingin Anda dalami untuk kepentingan pembelajaran berikutnya?</li>
                  </ul>
                </div>
              </div>

              {/* LAMPIRAN */}
              {result.lampiran && (
                <div className="space-y-3 pt-4 border-t border-gray-300">
                  <h3 className="font-bold text-sm text-[#0f3860] uppercase">LAMPIRAN</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Glosarium:</h4>
                      <ul className="list-disc list-inside space-y-0.5 text-gray-800">
                        {result.lampiran?.glosarium?.map((g, i) => <li key={i}>{g}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Daftar Pustaka:</h4>
                      <ul className="list-disc list-inside space-y-0.5 text-gray-800">
                        {result.lampiran?.daftarPustaka?.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Tanda Tangan */}
              <div className="pt-8 grid grid-cols-2 text-xs text-center font-medium">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-bold">Kepala Sekolah</p>
                  <div className="h-16"></div>
                  <p className="font-bold">NIP/NRK. ....................</p>
                </div>
                <div>
                  <p>...................., ..................................2026</p>
                  <p className="font-bold">Guru Mata Pelajaran</p>
                  <div className="h-16"></div>
                  <p className="font-bold">NIP/NRK. ....................</p>
                </div>
              </div>

              {/* Footer Note */}
              <div className="pt-6 border-t border-dashed border-gray-300 text-[10px] text-gray-500 space-y-0.5 italic text-center">
                <p>* Dokumen modul hasil generate dari https://modulajargenerator.my.id/</p>
                <p>* Hasil modul ini mohon untuk ditinjau Kembali karena AI mungkin membuat sedikit kesalahan.</p>
                <p>* Apabila ada kritik dan saran coba untuk kontak tim admin di chat situs atau acepfikri54@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safe Queue Loading Overlay */}
      <SafeQueueLoading
        isOpen={isQueueActive}
        title="Antrean Pembuatan Modul Ajar AI"
        onStartRequest={handleStartModulRequest}
        onSuccess={handleModulSuccess}
        onError={handleModulError}
        onClose={() => {
          setIsQueueActive(false);
          setIsLoading(false);
        }}
      />
    </div>
  );
};
