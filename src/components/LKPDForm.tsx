import React, { useState } from 'react';
import { ChevronLeft, FileText, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { LKPDFormData, LKPDGenerated } from '../types';

interface LKPDFormProps {
  onGenerate: (data: LKPDFormData) => void;
  isLoading: boolean;
  error: string | null;
  quotaLkpd?: number;
  onOpenUpgrade?: () => void;
}

export const LKPDForm: React.FC<LKPDFormProps> = ({
  onGenerate,
  isLoading,
  error,
  quotaLkpd = 25,
  onOpenUpgrade,
}) => {
  const [formData, setFormData] = useState<LKPDFormData>({
    tingkatSekolah: '',
    kelas: '',
    fase: '',
    mataPelajaran: '',
    materiPokok: '',
    modelPembelajaran: '',
    tujuanPembelajaran: '',
    jenisAktivitas: 'konseptual',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mataPelajaran || !formData.materiPokok || !formData.tujuanPembelajaran) {
      alert("Harap lengkapi Mata Pelajaran, Materi Pokok, dan Tujuan Pembelajaran.");
      return;
    }
    if (quotaLkpd <= 0) {
      if (onOpenUpgrade) {
        onOpenUpgrade();
      } else {
        alert("Kuota generate LKPD Anda telah habis (0/25). Silakan Top Up kuota!");
      }
      return;
    }
    onGenerate(formData);
  };

  const loadPreset = (presetType: 'sd' | 'smp' | 'sma') => {
    if (presetType === 'sd') {
      setFormData({
        tingkatSekolah: 'SD',
        kelas: '5',
        fase: 'Fase C (Kelas 5 - 6 SD)',
        mataPelajaran: 'IPAS (Ilmu Pengetahuan Alam & Sosial)',
        materiPokok: 'Ekosistem dan Rantai Makanan',
        modelPembelajaran: 'Problem Based Learning (PBL)',
        tujuanPembelajaran: `1. Peserta didik dapat menganalisis peran komponen penyusun rantai makanan dalam suatu ekosistem secara kritis.
2. Peserta didik dapat menyusun rantai makanan sederhana pada ekosistem darat and perairan dengan benar.`,
        jenisAktivitas: 'konseptual',
      });
    } else if (presetType === 'smp') {
      setFormData({
        tingkatSekolah: 'SMP',
        kelas: '7',
        fase: 'Fase D (Kelas 7 - 9 SMP)',
        mataPelajaran: 'Bahasa Indonesia',
        materiPokok: 'Teks Prosedur Khas Nusantara',
        modelPembelajaran: 'Project Based Learning (PjBL)',
        tujuanPembelajaran: `1. Peserta didik mampu mengidentifikasi struktur dan kaidah kebahasaan teks prosedur secara cermat.
2. Peserta didik mampu merancang dan menyajikan teks prosedur berupa panduan pembuatan kuliner lokal secara kreatif.`,
        jenisAktivitas: 'proyek',
      });
    } else if (presetType === 'sma') {
      setFormData({
        tingkatSekolah: 'SMA',
        kelas: '11',
        fase: 'Fase F (Kelas 11 - 12 SMA/SMK)',
        mataPelajaran: 'Biologi / IPA Terpadu',
        materiPokok: 'Sistem Organ dan Bioproses Sel',
        modelPembelajaran: 'Discovery Learning',
        tujuanPembelajaran: `1. Peserta didik mampu menganalisis keterkaitan antara struktur sel, jaringan, dan fungsi organ pada manusia.
2. Peserta didik mampu melakukan evaluasi terhadap gangguan kesehatan sistem pencernaan serta merumuskan pencegahannya.`,
        jenisAktivitas: 'praktikum',
      });
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 md:py-10">
      
      {/* Top Heading */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight font-serif-display leading-tight">
          Generator LKPD Kurikulum Merdeka
        </h1>

        <p className="text-gray-400 text-sm md:text-base mt-3 max-w-2xl mx-auto leading-relaxed">
          Lengkapi kolom mapel, topik, dan TP untuk menghasilkan LKPD interaktif berbasis AI.
        </p>

        {/* Quick presets for rapid testing */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Contoh Cepat:</span>
          <button
            type="button"
            onClick={() => loadPreset('sd')}
            className="text-xs bg-[#182032] hover:bg-blue-600/30 text-blue-300 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            🌱 SD: IPAS Ekosistem
          </button>
          <button
            type="button"
            onClick={() => loadPreset('smp')}
            className="text-xs bg-[#182032] hover:bg-blue-600/30 text-blue-300 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            📖 SMP: B. Indonesia Teks Prosedur
          </button>
          <button
            type="button"
            onClick={() => loadPreset('sma')}
            className="text-xs bg-[#182032] hover:bg-blue-600/30 text-blue-300 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            🧪 SMA: Biologi Sel & Organ
          </button>
        </div>
      </div>

      {/* Main Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#101524] border border-gray-800/90 rounded-2xl p-5 md:p-8 shadow-2xl relative overflow-hidden"
      >
        {error && (
          <div className="mb-6 bg-red-950/80 border border-red-500/50 rounded-xl p-4 flex items-start gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Gagal Menganalisis Input</p>
              <p className="text-xs text-red-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Row 1: Tingkat Sekolah, Kelas, Fase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-5">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Tingkat Sekolah
            </label>
            <select
              name="tingkatSekolah"
              value={formData.tingkatSekolah}
              onChange={handleChange}
              className="w-full bg-[#181f32] border border-gray-700/80 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all"
            >
              <option value="">Pilih Tingkat</option>
              <option value="PAUD/TK">PAUD / TK</option>
              <option value="SD">SD (Sekolah Dasar)</option>
              <option value="SMP">SMP (Sekolah Menengah Pertama)</option>
              <option value="SMA">SMA (Sekolah Menengah Atas)</option>
              <option value="SMK">SMK (Sekolah Menengah Kejuruan)</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Kelas
            </label>
            <input
              type="text"
              name="kelas"
              value={formData.kelas}
              onChange={handleChange}
              placeholder="Contoh: 5, 10, 12"
              className="w-full bg-[#181f32] border border-gray-700/80 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Fase (Kurikulum Merdeka)
            </label>
            <select
              name="fase"
              value={formData.fase}
              onChange={handleChange}
              className="w-full bg-[#181f32] border border-gray-700/80 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all"
            >
              <option value="">Pilih Fase</option>
              <option value="Fase Fondasi (PAUD/TK)">Fase Fondasi (PAUD/TK)</option>
              <option value="Fase A (Kelas 1 - 2 SD)">Fase A (Kelas 1 - 2 SD)</option>
              <option value="Fase B (Kelas 3 - 4 SD)">Fase B (Kelas 3 - 4 SD)</option>
              <option value="Fase C (Kelas 5 - 6 SD)">Fase C (Kelas 5 - 6 SD)</option>
              <option value="Fase D (Kelas 7 - 9 SMP)">Fase D (Kelas 7 - 9 SMP)</option>
              <option value="Fase E (Kelas 10 SMA/SMK)">Fase E (Kelas 10 SMA/SMK)</option>
              <option value="Fase F (Kelas 11 - 12 SMA/SMK)">Fase F (Kelas 11 - 12 SMA/SMK)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Mata Pelajaran, Materi Pokok */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-5">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Mata Pelajaran <span className="text-blue-400">*</span>
            </label>
            <input
              type="text"
              name="mataPelajaran"
              value={formData.mataPelajaran}
              onChange={handleChange}
              required
              placeholder="Contoh: Bahasa Indonesia, IPA, PAI"
              className="w-full bg-[#181f32] border border-gray-700/80 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Materi Pokok <span className="text-blue-400">*</span>
            </label>
            <input
              type="text"
              name="materiPokok"
              value={formData.materiPokok}
              onChange={handleChange}
              required
              placeholder="Contoh: Teks Prosedur, Ekosistem"
              className="w-full bg-[#181f32] border border-gray-700/80 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all"
            />
          </div>
        </div>

        {/* Row 3: Model Pembelajaran */}
        <div className="mb-5">
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Model Pembelajaran
          </label>
          <input
            type="text"
            name="modelPembelajaran"
            value={formData.modelPembelajaran}
            onChange={handleChange}
            placeholder="Contoh: Discovery Learning, PBL, PjBL, TGT, dll."
            className="w-full bg-[#181f32] border border-gray-700/80 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all"
          />
          <p className="text-xs text-gray-400/80 text-right mt-1.5 font-normal">
            Ketik manual model pembelajaran yang diinginkan.
          </p>
        </div>

        {/* Row 3.5: Jenis Aktivitas LKPD */}
        <div className="mb-5">
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Jenis Aktivitas LKPD
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${formData.jenisAktivitas === 'konseptual' ? 'bg-blue-600/10 border-blue-500/80' : 'bg-[#181f32] border-gray-700/80 hover:border-gray-600'}`}>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="jenisAktivitas"
                  value="konseptual"
                  checked={formData.jenisAktivitas === 'konseptual'}
                  onChange={handleChange}
                  className="accent-blue-500"
                />
                <span className="text-white text-sm font-bold">1. Konseptual / Diskusi</span>
              </div>
              <span className="text-gray-400 text-xs mt-1 leading-relaxed">Sesuai untuk analisis kasus, berpikir kritis, pemahaman materi, atau pengamatan (PBL/Discovery).</span>
            </label>

            <label className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${formData.jenisAktivitas === 'praktikum' ? 'bg-emerald-600/10 border-emerald-500/80' : 'bg-[#181f32] border-gray-700/80 hover:border-gray-600'}`}>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="jenisAktivitas"
                  value="praktikum"
                  checked={formData.jenisAktivitas === 'praktikum'}
                  onChange={handleChange}
                  className="accent-emerald-500"
                />
                <span className="text-white text-sm font-bold">2. Praktikum / Eksperimen</span>
              </div>
              <span className="text-gray-400 text-xs mt-1 leading-relaxed">Panduan ilmiah: Alat & bahan, prosedur ilmiah, tabel data pengamatan, dan kesimpulan investigasi.</span>
            </label>

            <label className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${formData.jenisAktivitas === 'proyek' ? 'bg-purple-600/10 border-purple-500/80' : 'bg-[#181f32] border-gray-700/80 hover:border-gray-600'}`}>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="jenisAktivitas"
                  value="proyek"
                  checked={formData.jenisAktivitas === 'proyek'}
                  onChange={handleChange}
                  className="accent-purple-500"
                />
                <span className="text-white text-sm font-bold">3. Produk / Proyek Kreatif</span>
              </div>
              <span className="text-gray-400 text-xs mt-1 leading-relaxed">Panduan berkarya: Langkah pembuatan poster, infografis, video edukasi, maket, atau proyek fisik (PjBL).</span>
            </label>
          </div>
        </div>

        {/* Row 4: Tujuan Pembelajaran (TP) */}
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Tujuan Pembelajaran (TP) <span className="text-blue-400">*</span>
          </label>
          <textarea
            name="tujuanPembelajaran"
            rows={5}
            value={formData.tujuanPembelajaran}
            onChange={handleChange}
            required
            placeholder={`Contoh: 1. Peserta didik mampu mengidentifikasi struktur teks prosedur.\n2. Peserta didik mampu menyusun teks prosedur sederhana.`}
            className="w-full bg-[#181f32] border border-gray-700/80 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all leading-relaxed"
          />
          <p className="text-xs text-gray-400/80 text-right mt-1.5 font-normal">
            Salin TP dari modul ajar Anda ke sini.
          </p>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.99] text-base md:text-lg cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>Memproses LKPD dengan AI Gemini...</span>
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              <span>Generate Sekarang</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
