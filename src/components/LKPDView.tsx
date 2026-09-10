import React, { useState } from 'react';
import {
  Printer,
  Download,
  Copy,
  Edit3,
  CheckCircle2,
  RefreshCw,
  Eye,
  Award,
  Check,
  Save,
  Loader2,
  FileText,
  ChevronLeft
} from 'lucide-react';
import { LKPDGenerated } from '../types';
import { downloadElementAsPdf } from '../lib/pdfUtils';

const stripLeadingNumber = (text: string): string => {
  if (!text) return "";
  let clean = text.trim();
  while (true) {
    const next = clean.replace(/^(?:\d+|[a-zA-Z])[\.\)]\s*|^(?:[-\*]\s*)/, "").trim();
    if (next === clean) break;
    clean = next;
  }
  return clean;
};

interface LKPDViewProps {
  lkpd: LKPDGenerated;
  onBackToForm: () => void;
}

export const LKPDView: React.FC<LKPDViewProps> = ({ lkpd: initialLKPD, onBackToForm }) => {
  const [lkpd, setLkpd] = useState<LKPDGenerated>(initialLKPD);
  const [activeTab, setActiveTab] = useState<'preview' | 'rubrik'>('preview');
  const [copied, setCopied] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  // Download PDF directly via html2pdf
  const handleDownloadPdf = async () => {
    setIsPdfGenerating(true);
    // Briefly toggle off edit mode visual ring during export for clean design
    const wasEditing = isEditMode;
    if (wasEditing) setIsEditMode(false);

    setTimeout(async () => {
      const element = document.getElementById("lkpd-printable-content");
      if (!element) {
        setIsPdfGenerating(false);
        if (wasEditing) setIsEditMode(true);
        return;
      }

      try {
        const docTitle = activeTab === 'preview' 
          ? (lkpd.identitas.judul || 'LKPD')
          : `Kunci_Jawaban_dan_Rubrik_${lkpd.identitas.judul || 'LKPD'}`;
        const safeTitle = docTitle.replace(/\s+/g, '_');
        const filename = `${safeTitle}.pdf`;

        await downloadElementAsPdf(element, filename);
      } catch (err) {
        console.error("Gagal generate LKPD PDF:", err);
        handlePrint();
      } finally {
        setIsPdfGenerating(false);
        if (wasEditing) setIsEditMode(true);
      }
    }, 200);
  };

  // Copy to clipboard
  const handleCopy = () => {
    // Get text from the actual DOM so it captures any inline edits they made
    const element = document.getElementById("lkpd-printable-content");
    let textContent = "";

    if (element) {
      textContent = element.innerText || element.textContent || "";
    } else {
      // Fallback to state if DOM is not found
      if (activeTab === 'preview') {
        textContent = `
LEMBAR KERJA PESERTA DIDIK (LKPD)
${lkpd.identitas.judul}
Sub Judul: ${lkpd.identitas.subJudul}
Mata Pelajaran: ${lkpd.identitas.mataPelajaran}
Tingkat/Kelas/Fase: ${lkpd.identitas.tingkatKelasFase}
Alokasi Waktu: ${lkpd.identitas.alokasiWaktu}
Model Pembelajaran: ${lkpd.identitas.modelPembelajaran}

PETUNJUK PENGGUNAAN:
${lkpd.identitas.petunjukPenggunaan.map((p, i) => `${i + 1}. ${stripLeadingNumber(p)}`).join('\n')}

TUJUAN PEMBELAJARAN:
${lkpd.tujuanPembelajaran.map((tp, i) => `${i + 1}. ${stripLeadingNumber(tp)}`).join('\n')}

ORIENTASI MASALAH & MATERI RINGKAS:
${lkpd.materiRingkas.orientasiMasalah}
${lkpd.materiRingkas.pembahasanUtama}

KEGIATAN SISWA: ${lkpd.kegiatanSiswa.namaKegiatan} (${lkpd.kegiatanSiswa.jenisKegiatan})
Langkah-langkah:
${lkpd.kegiatanSiswa.langkahLangkah.map((l, i) => `${i + 1}. ${stripLeadingNumber(l)}`).join('\n')}

LEMBAR KERJA & PERTANYAAN:
${lkpd.kegiatanSiswa.lembarKerja.map((q) => `Soal ${q.no}: ${stripLeadingNumber(q.pertanyaan)}\n\n`).join('\n')}

SOAL REFLEKSI:
${lkpd.soalRefleksi.map((r, i) => `${i + 1}. ${stripLeadingNumber(r)}`).join('\n')}
        `.trim();
      } else {
        textContent = `
KUNCI JAWABAN & RUBRIK PENILAIAN GURU
LKPD: ${lkpd.identitas.judul}

RUBRIK PENILAIAN:
${lkpd.rubrikPenilaian?.map(r => `Aspek: ${r.aspek}\nSkor 4: ${r.skor4}\nSkor 3: ${r.skor3}\nSkor 2: ${r.skor2}\nSkor 1: ${r.skor1}`).join('\n\n')}

KUNCI JAWABAN & PEMBAHASAN:
${lkpd.kunciJawabanDanPembahasan?.map(k => `No ${k.no}: ${k.jawabanSingkat}\nPembahasan: ${k.penjelasanDetail}`).join('\n\n')}
        `.trim();
      }
    }

    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Print Document
  const handlePrint = () => {
    const wasEditing = isEditMode;
    if (wasEditing) setIsEditMode(false);

    setTimeout(() => {
      const printContent = document.getElementById("lkpd-printable-content");
      if (!printContent) {
        window.print();
        if (wasEditing) setIsEditMode(true);
        return;
      }

      try {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const docTitle = activeTab === 'preview' 
            ? (lkpd.identitas.judul || 'Cetak LKPD')
            : `Kunci_&_Rubrik_${lkpd.identitas.judul || 'Cetak'}`;
            
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${docTitle}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                  body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 32px; background: #fff; color: #000; }
                  @media print {
                    @page {
                      size: A4 portrait;
                      margin: 12mm 15mm;
                    }
                    body { padding: 0; }
                    .no-print { display: none !important; }
                  }
                  /* Retain table borders and padding during direct window printing */
                  table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 15px; }
                  td, th { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; vertical-align: top; }
                  th { background-color: #f1f5f9; font-weight: bold; }
                </style>
              </head>
              <body>
                <div>${printContent.innerHTML}</div>
                <script>
                  setTimeout(() => {
                    window.print();
                  }, 400);
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      } catch (e) {
        console.warn("Popup print fallback to window.print()", e);
        window.print();
      } finally {
        if (wasEditing) setIsEditMode(true);
      }
    }, 200);
  };

  // Export to Word (.doc)
  const handleExportWord = () => {
    const wasEditing = isEditMode;
    if (wasEditing) setIsEditMode(false);

    setTimeout(() => {
      const docTitle = activeTab === 'preview' 
        ? (lkpd.identitas.judul || 'LKPD')
        : `Kunci_&_Rubrik_${lkpd.identitas.judul || 'LKPD'}`;

      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
        "xmlns:w='urn:schemas-microsoft-com:office:word' " +
        "xmlns='http://www.w3.org/TR/REC-html40'>" +
        "<head><meta charset='utf-8'><title>" + docTitle + "</title>" +
        "<style>" +
        "body{font-family:Arial,sans-serif;line-height:1.6;color:#111;padding:20px;}" +
        "h1,h2,h3,h4{color:#0f3860;font-family:Arial,sans-serif;}" +
        "table{border-collapse:collapse;width:100%;margin-top:10px;margin-bottom:15px;}" +
        "td,th{border:1px solid #333;padding:8px;font-size:12px;vertical-align:top;}" +
        "th{background-color:#f2f5f8;font-weight:bold;}" +
        ".section-title{background-color:#e6edf4;color:#0f3860;padding:6px 12px;font-weight:bold;margin-top:20px;text-transform:uppercase;border-left:4px solid #0f3860;}" +
        ".bullet-list{margin-left:20px;margin-bottom:10px;}" +
        ".boxed-area{border:1px solid #cccccc;background-color:#fafafa;padding:12px;margin-bottom:15px;border-radius:4px;}" +
        ".answer-box{border:1px dashed #999999;background-color:#fefefe;min-height:100px;padding:10px;margin-top:10px;margin-bottom:15px;}" +
        "</style>" +
        "</head><body>";
      const footer = "</body></html>";
      const printContent = document.getElementById("lkpd-printable-content");
      if (!printContent) {
        if (wasEditing) setIsEditMode(true);
        return;
      }

      const sourceHTML = header + printContent.innerHTML + footer;
      
      const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      const fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = source;
      const safeMatpel = (lkpd.identitas.mataPelajaran || 'Matpel').replace(/\s+/g, '_');
      const safeJudul = docTitle.replace(/\s+/g, '_');
      fileDownload.download = `LKPD_${safeMatpel}_${safeJudul}.doc`;
      fileDownload.click();
      document.body.removeChild(fileDownload);

      if (wasEditing) setIsEditMode(true);
    }, 200);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8">
      
      {/* Top Action & Control Header (Hidden in Print) */}
      <div className="no-print bg-[#101524] border border-gray-800 rounded-2xl p-4 md:p-6 mb-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBackToForm}
            className="text-gray-400 hover:text-blue-400 text-sm font-medium flex items-center gap-1.5 mb-2 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kembali ke Input Form</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Generator Pro Aktif
            </span>
            <span className="text-xs text-gray-500">
              Dibuat: {lkpd.createdDate}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white mt-1">
            {lkpd.identitas.judul}
          </h2>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Edit Button */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex-1 md:flex-none text-xs md:text-sm font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
              isEditMode 
                ? 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400' 
                : 'bg-slate-800 hover:bg-slate-700 text-gray-200 border border-gray-700'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>{isEditMode ? 'Selesai Edit' : 'Edit Teks Langsung'}</span>
          </button>

          {/* Download PDF */}
          <button
            disabled={isPdfGenerating}
            onClick={handleDownloadPdf}
            className="flex-1 md:flex-none bg-red-600 hover:bg-red-500 text-white text-xs md:text-sm font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isPdfGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isPdfGenerating ? 'Proses PDF...' : 'Simpan PDF'}</span>
          </button>

          {/* Print / Cetak */}
          <button
            onClick={handlePrint}
            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Print</span>
          </button>

          {/* Download Word */}
          <button
            onClick={handleExportWord}
            className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Word (.doc)</span>
          </button>

          {/* Salin */}
          <button
            onClick={handleCopy}
            className="bg-slate-800 hover:bg-slate-700 text-gray-200 text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer border border-gray-700"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Tersalin!' : 'Salin'}</span>
          </button>
        </div>
      </div>

      {/* Mode View Switcher (Hidden in Print) */}
      <div className="no-print flex items-center gap-2 border-b border-gray-800 pb-3 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'preview'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-[#121827] text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>1. Lembar Kerja Siswa (LKPD)</span>
        </button>

        {((lkpd.rubrikPenilaian && lkpd.rubrikPenilaian.length > 0) || 
          (lkpd.kunciJawabanDanPembahasan && lkpd.kunciJawabanDanPembahasan.length > 0)) && (
          <button
            onClick={() => setActiveTab('rubrik')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'rubrik'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-[#121827] text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>2. Kunci & Rubrik Guru</span>
          </button>
        )}
      </div>

      {/* Inline Editing Alert Notice Banner */}
      {isEditMode && (
        <div className="no-print bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3.5 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm font-medium mb-6">
          <Edit3 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-200 block mb-0.5">Mode Edit Langsung Aktif!</span>
            <span>Anda bisa mengeklik langsung teks mana saja pada kertas dokumen di bawah untuk mengedit judul, identitas, isi pembahasan, tabel, maupun daftar pertanyaan sebelum menyimpannya ke Word/PDF.</span>
          </div>
        </div>
      )}

      {/* PORTRAIT PAPER SHEET CONTAINER */}
      <div className="relative group max-w-4xl mx-auto my-4">
        {isEditMode && (
          <div className="absolute -top-3 right-6 bg-amber-500 text-[#090d16] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg z-10 animate-pulse no-print select-none border border-amber-300">
            Mode Edit Aktif
          </div>
        )}

        <div
          id="lkpd-printable-content"
          contentEditable={isEditMode}
          suppressContentEditableWarning={true}
          className={`print-container bg-white text-gray-900 rounded-xl p-8 sm:p-14 md:p-16 shadow-2xl border border-gray-300 transition-all duration-300 focus:outline-none ${
            isEditMode ? 'ring-4 ring-amber-500/50 bg-amber-50/[0.02]' : ''
          }`}
          style={{ minHeight: '1120px' }} // Standard portrait aesthetic ratio layout
        >
          {activeTab === 'preview' ? (
            /* ==========================================================
               1. LEMBAR KERJA SISWA (STUDENT WORKSHEET)
               ========================================================== */
            <div className="space-y-6">
              {/* School Header Box (Kop LKPD) */}
              <div className="border-b-4 border-double border-gray-900 pb-4 mb-6 text-center">
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-gray-900">
                  LEMBAR KERJA PESERTA DIDIK (LKPD)
                </h1>
                <p className="text-sm font-bold uppercase text-blue-800 mt-1">
                  KURIKULUM MERDEKA — {lkpd.identitas.tingkatKelasFase}
                </p>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mt-2">
                  {lkpd.identitas.judul}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 italic mt-0.5">
                  {lkpd.identitas.subJudul}
                </p>
              </div>

              {/* Student Identitas Table Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-gray-400 p-4 rounded-lg bg-gray-50 mb-6 text-xs sm:text-sm">
                <div className="space-y-3.5">
                  <div className="flex items-start">
                    <span className="w-32 font-bold text-gray-700 shrink-0">Mata Pelajaran</span>
                    <span className="mr-1 font-bold">:</span>
                    <span className="text-gray-900">{lkpd.identitas.mataPelajaran}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-32 font-bold text-gray-700 shrink-0">Kelas / Fase</span>
                    <span className="mr-1 font-bold">:</span>
                    <span className="text-gray-900">{lkpd.identitas.tingkatKelasFase}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-32 font-bold text-gray-700 shrink-0">Alokasi Waktu</span>
                    <span className="mr-1 font-bold">:</span>
                    <span className="text-gray-900">{lkpd.identitas.alokasiWaktu}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-32 font-bold text-gray-700 shrink-0">Model Belajar</span>
                    <span className="mr-1 font-bold">:</span>
                    <span className="text-gray-900">{lkpd.identitas.modelPembelajaran}</span>
                  </div>
                </div>

                <div className="space-y-3.5 border-t sm:border-t-0 sm:border-l border-gray-300 pt-3 sm:pt-0 sm:pl-6">
                  <div className="flex items-center w-full">
                    <span className="w-32 font-bold text-gray-700 shrink-0">Nama Anggota</span>
                    <span className="font-bold mr-1">:</span>
                    <div className="flex-grow border-b border-dotted border-gray-400 min-h-[1.25rem]"></div>
                  </div>
                  <div className="flex items-center w-full">
                    <span className="w-32 font-bold text-gray-700 shrink-0">Kelompok / Kelas</span>
                    <span className="font-bold mr-1">:</span>
                    <div className="flex-grow border-b border-dotted border-gray-400 min-h-[1.25rem]"></div>
                  </div>
                  <div className="flex items-center w-full">
                    <span className="w-32 font-bold text-gray-700 shrink-0">Tanggal</span>
                    <span className="font-bold mr-1">:</span>
                    <div className="flex-grow border-b border-dotted border-gray-400 min-h-[1.25rem]"></div>
                  </div>
                  <div className="flex items-center w-full">
                    <span className="w-32 font-bold text-gray-700 shrink-0">Nilai / Paraf</span>
                    <span className="font-bold mr-1">:</span>
                    <div className="flex-grow border-b border-dotted border-gray-400 min-h-[1.25rem]"></div>
                  </div>
                </div>
              </div>

              {/* Section A: Petunjuk Penggunaan */}
              <div className="mb-6">
                <h3 className="text-sm sm:text-base font-bold text-blue-900 bg-blue-50 border-l-4 border-blue-600 px-3 py-1.5 mb-3 rounded-r-md uppercase tracking-wider">
                  A. Petunjuk Penggunaan
                </h3>
                <ol className="list-decimal list-outside pl-5 space-y-1.5 text-sm text-gray-800">
                  {lkpd.identitas.petunjukPenggunaan.map((petunjuk, i) => (
                    <li key={i} className="leading-relaxed pl-1">
                      {stripLeadingNumber(petunjuk)}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Section B: Tujuan Pembelajaran */}
              <div className="mb-6">
                <h3 className="text-sm sm:text-base font-bold text-blue-900 bg-blue-50 border-l-4 border-blue-600 px-3 py-1.5 mb-3 rounded-r-md uppercase tracking-wider">
                  B. Tujuan Pembelajaran (TP)
                </h3>
                <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm text-gray-800">
                  {lkpd.tujuanPembelajaran.map((tp, i) => (
                    <li key={i} className="leading-relaxed pl-1">
                      {stripLeadingNumber(tp)}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Section C: Orientasi Masalah & Ringkasan Materi */}
              <div className="mb-6">
                <h3 className="text-sm sm:text-base font-bold text-blue-900 bg-blue-50 border-l-4 border-blue-600 px-3 py-1.5 mb-3 rounded-r-md uppercase tracking-wider">
                  C. Orientasi Masalah & Stimulus Belajar
                </h3>
                <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-4 text-sm leading-relaxed text-gray-800 space-y-3">
                  <p className="font-medium text-amber-950">{lkpd.materiRingkas.orientasiMasalah}</p>
                  <p>{lkpd.materiRingkas.pembahasanUtama}</p>
                  
                  {lkpd.materiRingkas.kataKunci && lkpd.materiRingkas.kataKunci.length > 0 && (
                    <div className="pt-2 border-t border-amber-200/80 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-bold text-amber-900">Kata Kunci:</span>
                      {lkpd.materiRingkas.kataKunci.map((kw, i) => (
                        <span key={i} className="bg-amber-200/80 text-amber-900 font-semibold px-2 py-0.5 rounded">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section D: Kegiatan Siswa & Lembar Kerja */}
              <div className="mb-8">
                <div className="flex items-center justify-between bg-blue-50 border-l-4 border-blue-600 px-3 py-1.5 mb-4 rounded-r-md">
                  <h3 className="text-sm sm:text-base font-bold text-blue-900 uppercase tracking-wider">
                    D. Lembar Aktivitas Siswa ({lkpd.kegiatanSiswa.jenisKegiatan})
                  </h3>
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    Sintaks: {lkpd.identitas.modelPembelajaran}
                  </span>
                </div>

                {/* Langkah Kegiatan */}
                <div className="mb-5 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
                  <h4 className="font-bold text-gray-800 mb-2">Langkah-langkah Kegiatan:</h4>
                  <ol className="list-decimal list-outside pl-5 space-y-1.5 text-gray-700">
                    {lkpd.kegiatanSiswa.langkahLangkah.map((langkah, i) => (
                      <li key={i} className="leading-relaxed pl-1">
                        {stripLeadingNumber(langkah)}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Soal Lembar Kerja */}
                <div className="space-y-6">
                  <h4 className="font-bold text-gray-900 text-sm sm:text-base border-b border-gray-300 pb-1 uppercase tracking-wide">
                    Tugas & Pertanyaan Diskusi:
                  </h4>

                  {lkpd.kegiatanSiswa.lembarKerja.map((q) => (
                    <div key={q.no} className="border border-gray-300 rounded-lg p-4 bg-white">
                      <p className="font-bold text-sm text-gray-900">
                        {q.no}. {stripLeadingNumber(q.pertanyaan)}
                      </p>
                      {q.petunjukIsian && (
                        <p className="text-xs text-gray-500 italic mt-0.5 mb-2">
                          Petunjuk: {q.petunjukIsian}
                        </p>
                      )}

                      {/* Empty Writing Area for Printing */}
                      <div className="mt-3 border border-dashed border-gray-300 rounded-lg p-4 min-h-[120px] bg-gray-50/50 relative">
                        <span className="text-xs text-gray-400 select-none">
                          [ Tuliskan lembar jawaban siswa di sini ]
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section E: Refleksi Siswa */}
              <div className="mb-8">
                <h3 className="text-sm sm:text-base font-bold text-blue-900 bg-blue-50 border-l-4 border-blue-600 px-3 py-1.5 mb-3 rounded-r-md uppercase tracking-wider">
                  E. Lembar Refleksi Diri Siswa
                </h3>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm space-y-4">
                  {lkpd.soalRefleksi.map((ref, i) => (
                    <div key={i} className="space-y-1">
                      <p className="font-semibold text-gray-800">{i + 1}. {stripLeadingNumber(ref)}</p>
                      <div className="h-10 border-b border-dotted border-gray-400"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ==========================================================
               2. KUNCI JAWABAN & RUBRIK PENILAIAN GURU (TEACHER GUIDE)
               ========================================================== */
            <div className="space-y-6">
              {/* Teacher Header Box */}
              <div className="border-b-4 border-double border-gray-900 pb-4 mb-6 text-center">
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-gray-900">
                  PANDUAN PENILAIAN & KUNCI JAWABAN
                </h1>
                <p className="text-sm font-bold uppercase text-purple-800 mt-1">
                  PEGANGAN RESMI GURU — KURIKULUM MERDEKA
                </p>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mt-2">
                  {lkpd.identitas.judul}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 italic mt-0.5">
                  Topik: {lkpd.identitas.subJudul}
                </p>
              </div>

              {/* Identitas Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-gray-400 p-4 rounded-lg bg-gray-50 mb-6 text-xs sm:text-sm">
                <div className="space-y-2">
                  <div className="flex">
                    <span className="w-32 font-bold text-gray-700">Mata Pelajaran</span>
                    <span>: {lkpd.identitas.mataPelajaran}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-gray-700">Kelas / Fase</span>
                    <span>: {lkpd.identitas.tingkatKelasFase}</span>
                  </div>
                </div>
                <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-gray-300 pt-2 sm:pt-0 sm:pl-4">
                  <div className="flex">
                    <span className="w-32 font-bold text-gray-700">Alokasi Waktu</span>
                    <span>: {lkpd.identitas.alokasiWaktu}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-gray-700">Model Belajar</span>
                    <span>: {lkpd.identitas.modelPembelajaran}</span>
                  </div>
                </div>
              </div>

              {/* Section F: Rubrik Penilaian Guru */}
              {lkpd.rubrikPenilaian && lkpd.rubrikPenilaian.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm sm:text-base font-bold text-emerald-900 bg-emerald-50 border-l-4 border-emerald-600 px-3 py-1.5 mb-3 rounded-r-md uppercase tracking-wider">
                    A. Rubrik Penilaian Guru & Pedoman Penskoran
                  </h3>

                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-[11px] sm:text-xs text-left text-gray-800 border border-gray-300">
                      <thead className="bg-emerald-100 text-emerald-900 font-bold border-b border-gray-300">
                        <tr>
                          <th className="p-2.5 border-r border-gray-300 w-1/4">Aspek Penilaian</th>
                          <th className="p-2.5 border-r border-gray-300">Skor 4 (Sangat Baik)</th>
                          <th className="p-2.5 border-r border-gray-300">Skor 3 (Baik)</th>
                          <th className="p-2.5 border-r border-gray-300">Skor 2 (Cukup)</th>
                          <th className="p-2.5">Skor 1 (Kurang)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {lkpd.rubrikPenilaian.map((rub, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="p-2.5 font-bold border-r border-gray-300">{rub.aspek}</td>
                            <td className="p-2.5 border-r border-gray-300">{rub.skor4}</td>
                            <td className="p-2.5 border-r border-gray-300">{rub.skor3}</td>
                            <td className="p-2.5 border-r border-gray-300">{rub.skor2}</td>
                            <td className="p-2.5">{rub.skor1}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Section G: Kunci Jawaban */}
              {lkpd.kunciJawabanDanPembahasan && lkpd.kunciJawabanDanPembahasan.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm sm:text-base font-bold text-purple-900 bg-purple-50 border-l-4 border-purple-600 px-3 py-1.5 mb-3 rounded-r-md uppercase tracking-wider">
                    B. Kunci Jawaban & Pembahasan Uraian Detail
                  </h3>
                  <div className="space-y-4 text-sm">
                    {lkpd.kunciJawabanDanPembahasan.map((kj) => (
                      <div key={kj.no} className="border border-purple-200 bg-purple-50/50 rounded-lg p-4">
                        <p className="font-bold text-purple-950">
                          Kunci Jawaban Soal No. {kj.no}:
                        </p>
                        <p className="font-semibold text-gray-800 mt-1">
                          {kj.jawabanSingkat}
                        </p>
                        <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                          <span className="font-bold text-purple-900">Pembahasan:</span> {kj.penjelasanDetail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
