import express from "express";
import cors from "cors";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize Supabase Admin Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://wplkhcelcqehosnyiluz.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
}) : null;

// Enable CORS for all routes to support external requests from Netlify
app.use(cors());

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client (Google AI Studio)
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Model for Google AI Studio (Gemini)
// Menggunakan gemini-3.1-flash-lite (efisien, hemat kuota, dan respons cepat)
const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Membersihkan output string agar menjadi JSON valid (menghilangkan blok ```json ... ```)
 */
function extractJsonString(raw: string): string {
  if (!raw) return "{}";
  let clean = raw.trim();
  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json\s*/, "").replace(/```$/, "").trim();
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```\s*/, "").replace(/```$/, "").trim();
  }
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  }
  return clean;
}

/**
 * Generator konten menggunakan Google AI Studio (Gemini)
 * Mendukung retry otomatis (exponential backoff) dan rotasi model cadangan jika terjadi kendala antrian/kuota/503.
 */
async function generateContentWithFallback(
  ai: GoogleGenAI | null,
  params: {
    contents: string;
    config?: any;
  }
): Promise<{ text: string }> {
  if (!ai) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi. Silakan periksa GEMINI_API_KEY di environment.");
  }

  let lastError: any = null;
  const MAX_RETRIES_PER_MODEL = 2;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        console.log(`[Google AI Studio] Mengirim permintaan ke '${model}' (percobaan ${attempt + 1})...`);
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        console.log(`✅ [Google AI Studio] Berhasil generate via '${model}'!`);
        const cleaned = extractJsonString(response.text || "{}");
        return { text: cleaned };
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || "";
        console.warn(`[Google AI Studio] Model '${model}' percobaan ${attempt + 1} terkendala:`, errMsg);

        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("overloaded") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED");

        if (isTransient && attempt < MAX_RETRIES_PER_MODEL) {
          const waitTime = (attempt + 1) * 1500;
          console.log(`[Google AI Studio] Menunggu ${waitTime}ms sebelum mencoba ulang '${model}'...`);
          await sleep(waitTime);
          continue;
        }

        // Jika bukan transient error atau retry habis, beralih ke model cadangan berikutnya
        break;
      }
    }
  }

  throw lastError || new Error("Gagal memproses permintaan AI ke Google AI Studio.");
}

function formatGeminiError(error: any, defaultMsg: string): string {
  const errMsg = error?.message || "";
  if (
    errMsg.includes("429") ||
    errMsg.includes("RESOURCE_EXHAUSTED") ||
    errMsg.includes("quota") ||
    errMsg.includes("Rate limit") ||
    errMsg.includes("rate-limited")
  ) {
    return "Layanan AI sedang menerima antrian tinggi (batas kuota tercapai). Silakan tunggu sekitar 30 detik dan coba generate kembali.";
  }
  if (
    errMsg.includes("503") ||
    errMsg.includes("UNAVAILABLE") ||
    errMsg.includes("high demand") ||
    errMsg.includes("overloaded")
  ) {
    return "Server AI sedang sibuk sementara karena lonjakan trafik. Silakan coba beberapa saat lagi.";
  }
  return error?.message || defaultMsg;
}

// Endpoint untuk memeriksa status penyedia Google AI Studio (Gemini)
app.get("/api/ai-status", (_req, res) => {
  const hasGemini = !!(
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) ||
    (process.env.VITE_GEMINI_API_KEY && process.env.VITE_GEMINI_API_KEY.trim().length > 0) ||
    (process.env.API_KEY && process.env.API_KEY.trim().length > 0)
  );

  res.json({
    status: "ok",
    provider: "Google AI Studio",
    configured: hasGemini,
    models: CANDIDATE_MODELS,
  });
});

// ==========================================
// REGISTRI & PEMETAAN SINTAKS MODEL PEMBELAJARAN RESMI
// ==========================================
export interface PedagogicalModelDef {
  key: 'pjbl' | 'pbl' | 'discovery' | 'inquiry' | 'cooperative' | 'tgt';
  officialName: string;
  totalSteps: number;
  syntaxSteps: string[];
  syntaxInstructionModul: (materi: string) => string;
  contohIntiModul: (materi: string) => string[];
  syntaxInstructionLKPD: (materi: string, jenisAktivitas?: string) => string;
}

export const PEDAGOGICAL_MODELS: Record<string, PedagogicalModelDef> = {
  pjbl: {
    key: 'pjbl',
    officialName: 'Project Based Learning (PjBL)',
    totalSteps: 6,
    syntaxSteps: [
      '1. Pertanyaan Mendasar',
      '2. Mendesain Perencanaan Proyek',
      '3. Menyusun Jadwal',
      '4. Memonitor Keaktifan & Perkembangan Proyek',
      '5. Menguji Hasil',
      '6. Evaluasi Pengalaman'
    ],
    syntaxInstructionModul: (materi) => `
ATURAN SINTAKS MUTLAK & WAJIB: MODEL PROJECT BASED LEARNING (PjBL / PJBL)
Sesuai pedoman baku Kurikulum Merdeka Kemendikbudristek & Kemenag RI, Kegiatan Inti untuk model Project Based Learning (PjBL) WAJIB disusun tepat dalam 6 (enam) tahapan sintaks resmi berikut ini secara runtut dan mendalam:
1. Pertanyaan Mendasar: Guru mengemukakan pertanyaan esensial / studi kasus nyata terkait "${materi}" yang memicu peserta didik merancang solusi berupa proyek/karya nyata kontekstual.
2. Mendesain Perencanaan Proyek: Peserta didik berkelompok merancang aturan main proyek, mendesain sketsa/rancangan produk, membagi tugas dan peran anggota, serta merinci alat dan bahan.
3. Menyusun Jadwal: Guru dan peserta didik menyepakati linimasa (timeline), batas waktu tahapan kegiatan, dan batas akhir penyelesaian proyek karya.
4. Memonitor Keaktifan & Perkembangan Proyek: Guru memonitor keaktifan peserta didik, membimbing proses pembuatan karya jika ada kendala, dan mencatat progres perkembangan proyek kelompok.
5. Menguji Hasil: Menguji kelayakan produk karya yang dihasilkan, peserta didik mempresentasikan / memamerkan produk, dan mengukur ketercapaian standar capaian pembelajaran.
6. Evaluasi Pengalaman: Guru bersama peserta didik melakukan refleksi dan evaluasi terhadap seluruh proses pengalaman pembuatan proyek, mendiskusikan kendala, solusi, serta menarik kesimpulan.

PERINGATAN SANGAT PENTING:
Setiap butir di dalam array "kegiatanPembelajaran.inti" WAJIB diawali persis dengan penomoran dan nama sintaks tersebut:
- "1. Pertanyaan Mendasar: [uraian operasional kegiatan guru dan peserta didik terkait ${materi}]"
- "2. Mendesain Perencanaan Proyek: [uraian perancangan desain, alat-bahan, dan pembagian tugas]"
- "3. Menyusun Jadwal: [uraian penyusunan jadwal dan timeline pengerjaan proyek]"
- "4. Memonitor Keaktifan & Perkembangan Proyek: [uraian pemantauan guru dan progres siswa]"
- "5. Menguji Hasil: [uraian pengujian produk, presentasi/pameran karya, dan evaluasi ketercapaian]"
- "6. Evaluasi Pengalaman: [uraian refleksi pengalaman, kendala, solusi, dan simpulan]"
DILARANG keras mengganti sintaks PjBL ini dengan sintaks PBL atau model lain!
`,
    contohIntiModul: (materi) => [
      `1. Pertanyaan Mendasar: Guru menayangkan video/studi kasus kontekstual tentang ${materi} dan melontarkan pertanyaan mendasar yang menantang peserta didik untuk merancang proyek karya pemecahan masalah.`,
      `2. Mendesain Perencanaan Proyek: Peserta didik berkolaborasi dalam kelompok merancang rencana proyek, menyepakati aturan kerja sama, membagi peran masing-masing anggota, serta mendata alat dan bahan yang diperlukan.`,
      `3. Menyusun Jadwal: Guru dan peserta didik menyepakati jadwal pengerjaan proyek (tahap perencanaan, tahap eksekusi, tahap penyelesaian produk, dan waktu presentasi).`,
      `4. Memonitor Keaktifan & Perkembangan Proyek: Guru memonitor keaktifan dan kerja sama setiap anggota kelompok, memfasilitasi bimbingan teknis jika ada kendala, serta mencatat kemajuan pembuatan proyek.`,
      `5. Menguji Hasil: Setiap kelompok menguji fungsi dan kelayakan produk karya mereka, lalu mempresentasikan atau mendemonstrasikannya di depan kelas untuk mendapatkan umpan balik dari guru dan rekan.`,
      `6. Evaluasi Pengalaman: Guru dan peserta didik melakukan refleksi bersama mengenai seluruh pengalaman selama mengerjakan proyek, mengevaluasi kendala yang dihadapi, cara mengatasinya, serta menyimpulkan konsep esensial materi.`
    ],
    syntaxInstructionLKPD: (materi) => `
ATURAN SINTAKS MUTLAK LKPD: PROJECT BASED LEARNING (PjBL)
Penyusunan LKPD model PjBL wajib menerapkan kualitas aktivitas operasional, konkret, dan terintegrasi penuh mengikuti tepat 6 (enam) tahapan sintaks resmi berikut:

1. Pertanyaan Mendasar (Essential Question):
   - Aktivitas Operasional: Siswa mengamati stimulus/wacana studi kasus kontekstual terkait "${materi}", mengidentifikasi permasalahan pokok nyata di lingkungan sekitar, dan merumuskan ide/gagasan karya nyata sebagai solusi pemecahan masalah.
   - Format Lembar Kerja: Identifikasi tantangan autentik, perumusan pertanyaan esensial pengarah proyek, dan penetapan judul/spesifikasi produk karya kelompok. (ruangJawabanType: 'textarea')

2. Mendesain Perencanaan Proyek (Designing Project Plan):
   - Aktivitas Operasional: Siswa berkolaborasi menyepakati aturan main proyek, menetapkan pembagian peran anggota tim secara adil (Ketua Proyek, Perancang/Desainer, Pelaksana Produksi, Dokumentasi/Pelapor), serta membuat checklist kesiapan alat dan bahan yang diperlukan.
   - Format Lembar Kerja: Format tabel pembagian peran tim dan checklist kesiapan alat-bahan pembuatan proyek "${materi}". (ruangJawabanType: 'tabel' atau 'checklist')

3. Menyusun Jadwal (Creating Schedule & Timeline):
   - Aktivitas Operasional: Kelompok menyusun linimasa (timeline) pengerjaan proyek dari tahap perencanaan, persiapan alat-bahan, produksi/pembuatan karya, uji coba awal, hingga presentasi karya dengan batas waktu terukur.
   - Format Lembar Kerja: Tabel linimasa proyek terstruktur dengan format kolom: [No | Tahapan Kegiatan Proyek | Target Waktu / Hari ke- | Penanggung Jawab | Keterangan/Progres]. (ruangJawabanType: 'tabel')

4. Memonitor Keaktifan & Perkembangan Proyek (Monitoring Progress):
   - Aktivitas Operasional: Format pemantauan kemajuan pengerjaan proyek kelompok secara berkala, mencatat kendala teknis yang dihadapi, strategi pemecahan kendala, serta mencatat bimbingan/feedback konsultasi guru.
   - Format Lembar Kerja: Lembar pemantauan progres berkala, checklist tahapan yang selesai, dan log catatan bimbingan guru. (ruangJawabanType: 'textarea' atau 'checklist')

5. Menguji Hasil (Assessing the Outcome):
   - Aktivitas Operasional: Menguji fungsi, keakuratan konsep, kelayakan, serta kriteria keberhasilan produk karya proyek yang dihasilkan, dan menyiapkan bahan pameran/presentasi kelompok.
   - Format Lembar Kerja: Checklist rubrik pengujian kelayakan produk (aspek fungsi produk, ketepatan konsep materi, estetika/kerapian, daya guna) dan rangkuman poin paparan presentasi tim. (ruangJawabanType: 'checklist' atau 'tabel')

6. Evaluasi Pengalaman (Evaluating Experience & Reflection):
   - Aktivitas Operasional: Refleksi komprehensif atas seluruh pengalaman selama membuat proyek, mendiskusikan apa yang berhasil, kendala yang dihadapi, cara mengatasinya, serta simpulan konsep "${materi}" yang dipelajari melalui proyek.
   - Format Lembar Kerja: Lembar evaluasi pengalaman belajar bermakna (lessons learned) dan kesimpulan esensial proyek. (ruangJawabanType: 'textarea')

KETENTUAN ARRAY WAJIB:
- Array "langkahLangkah" WAJIB memuat tepat 6 butir instruksi operasional, diawali persis nomor dan nama sintaks resmi PjBL: "1. Pertanyaan Mendasar: ...", "2. Mendesain Perencanaan Proyek: ...", "3. Menyusun Jadwal: ...", "4. Memonitor Keaktifan & Perkembangan Proyek: ...", "5. Menguji Hasil: ...", "6. Evaluasi Pengalaman: ...".
- Array "lembarKerja" WAJIB memuat tepat 6 butir penugasan terurut yang memandu siswa menyelesaikan masing-masing dari ke-6 tahapan sintaks di atas secara bertahap (1-to-1 mapping).
`
  },

  pbl: {
    key: 'pbl',
    officialName: 'Problem Based Learning (PBL)',
    totalSteps: 5,
    syntaxSteps: [
      '1. Orientasi peserta didik pada masalah',
      '2. Mengorganisasikan peserta didik untuk belajar',
      '3. Membimbing penyelidikan individu maupun kelompok',
      '4. Mengembangkan dan menyajikan hasil karya',
      '5. Menganalisis dan mengevaluasi proses pemecahan masalah'
    ],
    syntaxInstructionModul: (materi) => `
ATURAN SINTAKS MUTLAK: MODEL PROBLEM BASED LEARNING (PBL)
Kegiatan Inti WAJIB mengikuti 5 sintaks resmi Problem Based Learning (PBL) secara runtut:
1. Orientasi peserta didik pada masalah: Guru menyajikan masalah kontekstual yang autentik terkait ${materi}.
2. Mengorganisasikan peserta didik untuk belajar: Peserta didik membentuk kelompok dan merumuskan fokus pemecahan masalah.
3. Membimbing penyelidikan individu maupun kelompok: Guru membimbing pengumpulan informasi, data, dan kajian teori.
4. Mengembangkan dan menyajikan hasil karya: Peserta didik menyusun laporan/karya solusi dan mempresentasikannya di depan kelas.
5. Menganalisis dan mengevaluasi proses pemecahan masalah: Guru dan peserta didik merefleksi serta mengevaluasi efektivitas solusi yang ditemukan.
Setiap butir dalam array "inti" wajib diawali dengan penomoran dan nama sintaks resmi tersebut di atas.
`,
    contohIntiModul: (materi) => [
      `1. Orientasi peserta didik pada masalah: Guru menyajikan masalah kontekstual nyata terkait ${materi} yang memicu daya kritis peserta didik.`,
      `2. Mengorganisasikan peserta didik untuk belajar: Peserta didik membentuk kelompok kerja untuk mendiskusikan batasan tugas pemecahan masalah.`,
      `3. Membimbing penyelidikan individu maupun kelompok: Guru membimbing peserta didik mengumpulkan informasi dan data referensi relevan.`,
      `4. Mengembangkan dan menyajikan hasil karya: Peserta didik mengolah hasil analisis dan menyajikan paparan solusi di depan kelas.`,
      `5. Menganalisis dan mengevaluasi proses pemecahan masalah: Guru dan peserta didik merefleksi dan mengevaluasi hasil diskusi pemecahan masalah.`
    ],
    syntaxInstructionLKPD: (materi) => `
ATURAN SINTAKS MUTLAK LKPD: PROBLEM BASED LEARNING (PBL)
Penyusunan LKPD model PBL wajib menerapkan aktivitas operasional yang runtut mengikuti tepat 5 (lima) tahapan sintaks resmi berikut:

1. Orientasi peserta didik pada masalah:
   - Aktivitas Operasional: Menelaah wacana studi kasus kontekstual nyata terkait "${materi}", mencatat fakta-fakta kunci, dan merumuskan pertanyaan masalah utama (5W+1H) yang menantang pemikiran kritis siswa.
   - Format Lembar Kerja: Identifikasi fakta masalah, perumusan pertanyaan fokus penyelidikan, dan dampak masalah jika tidak diatasi. (ruangJawabanType: 'textarea')

2. Mengorganisasikan peserta didik untuk belajar:
   - Aktivitas Operasional: Membagi peran tanggung jawab anggota kelompok penyelidik, merumuskan batasan ruang lingkup masalah yang akan ditelaah, dan menyusun rencana penelusuran sumber informasi.
   - Format Lembar Kerja: Tabel pembagian peran kelompok (Ketua, Notulis, Penelusur Data, Analis) dan daftar rujukan/sumber informasi yang akan dikaji. (ruangJawabanType: 'tabel')

3. Membimbing penyelidikan individu maupun kelompok:
   - Aktivitas Operasional: Melakukan penelusuran fakta empiris, kajian teori literatur, atau wawancara/observasi terkait "${materi}", menganalisis faktor-faktor penyebab utama terjadinya masalah.
   - Format Lembar Kerja: Tabel pengumpulan data bukti dan analisis akar penyebab masalah (faktor penyebab, bukti temuan, analisis dampak). (ruangJawabanType: 'tabel')

4. Mengembangkan dan menyajikan hasil karya:
   - Aktivitas Operasional: Merumuskan beberapa alternatif solusi pemecahan masalah, membandingkan kelebihan dan kelemahannya, memilih solusi terbaik, dan menyusun draf rekomendasi karya/laporan solusi untuk dipresentasikan.
   - Format Lembar Kerja: Tabel komparasi alternatif solusi (opsi solusi, kelebihan, kelemahan, kelayakan) dan draf rekomendasi solusi kelompok. (ruangJawabanType: 'textarea' atau 'tabel')

5. Menganalisis dan mengevaluasi proses pemecahan masalah:
   - Aktivitas Operasional: Menilai efektivitas solusi yang diajukan, menanggapi pertanyaan/umpan balik dari kelompok lain, serta menarik simpulan konsep materi yang dipelajari dari proses pemecahan masalah.
   - Format Lembar Kerja: Lembar evaluasi solusi, refleksi proses penyelidikan, dan kesimpulan konsep materi "${materi}". (ruangJawabanType: 'textarea')

KETENTUAN ARRAY WAJIB:
- Array "langkahLangkah" WAJIB memuat tepat 5 butir instruksi operasional terurut diawali nama sintaks: "1. Orientasi peserta didik pada masalah: ...", "2. Mengorganisasikan peserta didik untuk belajar: ...", "3. Membimbing penyelidikan individu maupun kelompok: ...", "4. Mengembangkan dan menyajikan hasil karya: ...", "5. Menganalisis dan mengevaluasi proses pemecahan masalah: ...".
- Array "lembarKerja" WAJIB memuat tepat 5 butir penugasan bertingkat yang membimbing siswa menyelesaikan ke-5 tahapan sintaks di atas secara bertahap (1-to-1 mapping).
`
  },

  discovery: {
    key: 'discovery',
    officialName: 'Discovery Learning',
    totalSteps: 6,
    syntaxSteps: [
      '1. Pemberian Rangsangan (Stimulation)',
      '2. Pernyataan/Identifikasi Masalah (Problem Statement)',
      '3. Pengumpulan Data (Data Collection)',
      '4. Pengolahan Data (Data Processing)',
      '5. Pembuktian (Verification)',
      '6. Menarik Simpulan/Generalisasi (Generalization)'
    ],
    syntaxInstructionModul: (materi) => `
ATURAN SINTAKS MUTLAK: MODEL DISCOVERY LEARNING
Kegiatan Inti WAJIB mengikuti 6 sintaks resmi Discovery Learning secara runtut:
1. Pemberian Rangsangan (Stimulation): Guru menyajikan gambar/video/data fenomena kontekstual tentang ${materi}.
2. Pernyataan/Identifikasi Masalah (Problem Statement): Peserta didik mengidentifikasi masalah utama dan merumuskan hipotesis.
3. Pengumpulan Data (Data Collection): Peserta didik mengumpulkan informasi yang relevan melalui literatur / observasi / eksperimen.
4. Pengolahan Data (Data Processing): Peserta didik mengolah dan menganalisis informasi hasil eksplorasi dalam kelompok.
5. Pembuktian (Verification): Peserta didik memverifikasi hasil olah data dengan teori rujukan ilmiah.
6. Menarik Simpulan/Generalisasi (Generalization): Guru dan peserta didik merumuskan kesimpulan umum konsep materi.
Setiap butir dalam array "inti" wajib diawali dengan penomoran dan nama sintaks resmi tersebut di atas.
`,
    contohIntiModul: (materi) => [
      `1. Pemberian Rangsangan (Stimulation): Guru menyajikan gambar/video fenomena kontekstual tentang ${materi} untuk membangkitkan rasa ingin tahu siswa.`,
      `2. Pernyataan/Identifikasi Masalah (Problem Statement): Peserta didik mengidentifikasi permasalahan pokok materi dan merumuskan hipotesis pembuktian.`,
      `3. Pengumpulan Data (Data Collection): Peserta didik mengumpulkan informasi dan bukti yang relevan melalui literatur rujukan atau observasi.`,
      `4. Pengolahan Data (Data Processing): Peserta didik mengolah, mengklasifikasikan, dan menganalisis data hasil eksplorasi dalam kelompok.`,
      `5. Pembuktian (Verification): Peserta didik memverifikasi hasil pengolahan data dengan konsep teori dasar untuk menguji hipotesis.`,
      `6. Menarik Simpulan/Generalisasi (Generalization): Guru dan peserta didik merumuskan kesimpulan umum dan prinsip konsep materi secara terpadu.`
    ],
    syntaxInstructionLKPD: (materi) => `
ATURAN SINTAKS MUTLAK LKPD: DISCOVERY LEARNING
Penyusunan LKPD model Discovery Learning wajib menerapkan aktivitas penemuan konsep mandiri yang runtut mengikuti tepat 6 (enam) tahapan sintaks resmi berikut:

1. Pemberian Rangsangan (Stimulation):
   - Aktivitas Operasional: Mengamati sajian stimulus kontekstual berupa fenomena, grafik, gambar perbandingan, atau data awal terkait "${materi}". Mencatat hal-hal janggal atau menarik yang membangkitkan rasa ingin tahu.
   - Format Lembar Kerja: Catatan pengamatan stimulus awal dan hal menarik yang ingin diselidiki. (ruangJawabanType: 'textarea')

2. Pernyataan/Identifikasi Masalah (Problem Statement):
   - Aktivitas Operasional: Mengidentifikasi permasalahan pokok berdasarkan stimulus, merumuskan pertanyaan fokus penemuan, dan menyusun hipotesis/praduga jawaban sementara yang akan dibuktikan.
   - Format Lembar Kerja: Rumusan pertanyaan identifikasi masalah dan kalimat hipotesis awal yang dapat diuji. (ruangJawabanType: 'textarea' atau 'text')

3. Pengumpulan Data (Data Collection):
   - Aktivitas Operasional: Melakukan eksplorasi mandiri/kelompok, membaca sumber rujukan materi, atau mencatat data hasil eksperimen/observasi nyata secara terstruktur.
   - Format Lembar Kerja: Tabel pengumpulan data hasil eksplorasi/pengamatan (misal: No | Objek/Aspek yang Diamati | Data/Fakta Temuan | Keterangan). (ruangJawabanType: 'tabel')

4. Pengolahan Data (Data Processing):
   - Aktivitas Operasional: Mengolah, mengklasifikasikan, mengaitkan hubungan antarvariabel/antarkonsep, dan menafsirkan pola data hasil eksplorasi secara kelompok.
   - Format Lembar Kerja: Panduan analisis data, pengelompokan temuan, dan interpretasi pola keterkaitan konsep materi. (ruangJawabanType: 'textarea' atau 'tabel')

5. Pembuktian (Verification):
   - Aktivitas Operasional: Memeriksa dan membandingkan hasil pengolahan data dengan rumusan hipotesis awal serta konsep teori ilmiah rujukan untuk menguji kebenaran temuan.
   - Format Lembar Kerja: Analisis pembuktian hipotesis (Apakah data mendukung hipotesis? Berikan argumen ilmiah dan rujukannya). (ruangJawabanType: 'textarea')

6. Menarik Simpulan/Generalisasi (Generalization):
   - Aktivitas Operasional: Merumuskan kaidah umum, prinsip, atau dalil konsep materi "${materi}" yang berhasil ditemukan dan disimpulkan bersama secara utuh.
   - Format Lembar Kerja: Lembar simpulan generalisasi konsep dan contoh penerapan konsep dalam kehidupan nyata. (ruangJawabanType: 'textarea')

KETENTUAN ARRAY WAJIB:
- Array "langkahLangkah" WAJIB memuat tepat 6 butir instruksi operasional, diawali nama sintaks: "1. Pemberian Rangsangan (Stimulation): ...", "2. Pernyataan/Identifikasi Masalah (Problem Statement): ...", "3. Pengumpulan Data (Data Collection): ...", "4. Pengolahan Data (Data Processing): ...", "5. Pembuktian (Verification): ...", "6. Menarik Simpulan/Generalisasi (Generalization): ...".
- Array "lembarKerja" WAJIB memuat tepat 6 butir penugasan terurut yang memandu siswa menemukan konsep langkah demi langkah (1-to-1 mapping).
`
  },

  inquiry: {
    key: 'inquiry',
    officialName: 'Inquiry Learning',
    totalSteps: 6,
    syntaxSteps: [
      '1. Orientasi Masalah',
      '2. Merumuskan Masalah',
      '3. Merumuskan Hipotesis',
      '4. Mengumpulkan Data',
      '5. Menguji Hipotesis',
      '6. Merumuskan Kesimpulan'
    ],
    syntaxInstructionModul: (materi) => `
ATURAN SINTAKS MUTLAK: MODEL INQUIRY LEARNING
Kegiatan Inti WAJIB mengikuti 6 sintaks resmi Inquiry Learning secara runtut:
1. Orientasi Masalah: Guru memaparkan situasi ilmiah yang memicu rasa ingin tahu peserta didik terkait ${materi}.
2. Merumuskan Masalah: Peserta didik merumuskan pertanyaan penyelidikan terarah.
3. Merumuskan Hipotesis: Peserta didik membuat dugaan jawaban sementara yang terukur.
4. Mengumpulkan Data: Peserta didik melakukan investigasi dan penelusuran data ilmiah.
5. Menguji Hipotesis: Peserta didik menguji kesesuaian dugaan awal dengan data temuan.
6. Merumuskan Kesimpulan: Peserta didik menyimpulkan hasil investigasi secara objektif.
Setiap butir dalam array "inti" wajib diawali dengan penomoran dan nama sintaks resmi tersebut di atas.
`,
    contohIntiModul: (materi) => [
      `1. Orientasi Masalah: Guru memaparkan situasi ilmiah atau fenomena alam yang memicu rasa ingin tahu peserta didik tentang ${materi}.`,
      `2. Merumuskan Masalah: Peserta didik merumuskan pertanyaan penyelidikan ilmiah terarah secara kritis.`,
      `3. Merumuskan Hipotesis: Peserta didik membuat dugaan jawaban sementara yang logis dan dapat diuji.`,
      `4. Mengumpulkan Data: Peserta didik melakukan investigasi ilmiah, pengamatan mendalam, dan penelusuran data bukti.`,
      `5. Menguji Hipotesis: Peserta didik menguji kesesuaian dugaan awal dengan data temuan secara kolaboratif.`,
      `6. Merumuskan Kesimpulan: Peserta didik dan guru menyimpulkan hasil investigasi ilmiah secara objektif.`
    ],
    syntaxInstructionLKPD: (materi) => `
ATURAN SINTAKS MUTLAK LKPD: INQUIRY LEARNING
Penyusunan LKPD model Inquiry Learning wajib menerapkan prosedur investigasi ilmiah terstruktur mengikuti tepat 6 (enam) tahapan sintaks resmi berikut:

1. Orientasi Masalah:
   - Aktivitas Operasional: Menelaah situasi ilmiah kontekstual seputar "${materi}" yang menimbulkan teka-teki ilmiah atau pertanyaan investigasi terbuka.
   - Format Lembar Kerja: Telaah situasi ilmiah dan pencatatan fokus penyelidikan yang memicu rasa ingin tahu. (ruangJawabanType: 'textarea')

2. Merumuskan Masalah:
   - Aktivitas Operasional: Menyusun pertanyaan penyelidikan ilmiah yang terfokus, tajam, dan memuat variabel yang dapat diuji/diukur secara jelas.
   - Format Lembar Kerja: Rumusan pertanyaan penelitian/investigasi ilmiah utama terkait "${materi}". (ruangJawabanType: 'text' atau 'textarea')

3. Merumuskan Hipotesis:
   - Aktivitas Operasional: Mengajukan hipotesis atau dugaan jawaban sementara yang rasional, berbasis penalaran awal konsep materi, dan siap diuji melalui data empiris.
   - Format Lembar Kerja: Rumusan pernyataan hipotesis ilmiah yang dapat diverifikasi kebenarannya. (ruangJawabanType: 'textarea' atau 'text')

4. Mengumpulkan Data:
   - Aktivitas Operasional: Melaksanakan prosedur pengumpulan data ilmiah (melalui observasi, eksperimen laboratorium sederhana, atau penelusuran fakta literatur terpercaya).
   - Format Lembar Kerja: Tabel pencatatan data hasil investigasi/eksperimen (misal: No | Perlakuan/Variabel | Data Pengamatan/Hasil | Catatan Analisis). (ruangJawabanType: 'tabel')

5. Menguji Hipotesis:
   - Aktivitas Operasional: Menganalisis data hasil pengamatan secara mendalam, membandingkannya dengan hipotesis awal, dan menentukan apakah hipotesis diterima atau ditolak beserta argumentasi ilmiahnya.
   - Format Lembar Kerja: Lembar uji hipotesis berbasis data bukti (analisis data, konfirmasi hipotesis diterima/ditolak beserta alasannya). (ruangJawabanType: 'textarea')

6. Merumuskan Kesimpulan:
   - Aktivitas Operasional: Menarik kesimpulan ilmiah objektif berdasarkan hasil analisis data dan merangkum prinsip konsep "${materi}" yang terkonfirmasi.
   - Format Lembar Kerja: Simpulan ilmiah hasil penyelidikan inkuiri dan implikasinya terhadap konsep pembelajaran. (ruangJawabanType: 'textarea')

KETENTUAN ARRAY WAJIB:
- Array "langkahLangkah" WAJIB memuat tepat 6 butir instruksi operasional, diawali nama sintaks: "1. Orientasi Masalah: ...", "2. Merumuskan Masalah: ...", "3. Merumuskan Hipotesis: ...", "4. Mengumpulkan Data: ...", "5. Menguji Hipotesis: ...", "6. Merumuskan Kesimpulan: ...".
- Array "lembarKerja" WAJIB memuat tepat 6 butir penugasan terurut yang memandu penyelidikan ilmiah langkah demi langkah (1-to-1 mapping).
`
  },

  cooperative: {
    key: 'cooperative',
    officialName: 'Cooperative Learning',
    totalSteps: 6,
    syntaxSteps: [
      '1. Menyampaikan Tujuan dan Memotivasi Siswa',
      '2. Menyajikan Informasi (Materi Pengantar)',
      '3. Mengorganisasikan Siswa ke dalam Kelompok-Kelompok Belajar',
      '4. Membimbing Kelompok Bekerja dan Belajar',
      '5. Evaluasi (Presentasi Kelompok / Kuis Pemahaman Tim)',
      '6. Memberikan Penghargaan (Rekognisi Prestasi Kelompok)'
    ],
    syntaxInstructionModul: (materi) => `
ATURAN SINTAKS MUTLAK: MODEL COOPERATIVE LEARNING
Kegiatan Inti WAJIB mengikuti 6 fase resmi Cooperative Learning (Arends & Slavin) secara runtut:
1. Menyampaikan Tujuan dan Memotivasi Siswa: Guru menyampaikan tujuan materi ${materi} dan memotivasi peserta didik untuk berkolaborasi dalam tim heterogen.
2. Menyajikan Informasi: Guru menyajikan informasi materi pokok atau konsep pengantar secara komunikatif.
3. Mengorganisasikan Siswa ke dalam Kelompok-Kelompok Belajar: Guru membagi peserta didik ke dalam kelompok belajar heterogen dan menetapkan peran tiap anggota.
4. Membimbing Kelompok Bekerja dan Belajar: Guru mendampingi kelompok saat berdiskusi, bertukar wawasan, dan saling memastikan pemahaman konsep.
5. Evaluasi: Guru mengevaluasi hasil belajar melalui presentasi kelompok atau uji pemahaman tim.
6. Memberikan Penghargaan: Guru mengumumkan apresiasi dan memberikan penghargaan kepada tim kelompok yang menunjukkan kerja sama dan pencapaian terbaik.
Setiap butir dalam array "inti" wajib diawali dengan penomoran dan nama fase resmi tersebut di atas.
`,
    contohIntiModul: (materi) => [
      `1. Menyampaikan Tujuan dan Memotivasi Siswa: Guru menyampaikan tujuan materi ${materi} dan memotivasi peserta didik untuk bekerja sama secara solid dalam kelompok heterogen.`,
      `2. Menyajikan Informasi: Guru menyajikan materi pengantar dan gambaran umum topik kajian secara menarik dan interaktif.`,
      `3. Mengorganisasikan Siswa ke dalam Kelompok-Kelompok Belajar: Guru mengelompokkan peserta didik secara heterogen dan membagikan peran aktif tiap anggota kelompok.`,
      `4. Membimbing Kelompok Bekerja dan Belajar: Guru membimbing proses diskusi kelompok agar seluruh anggota aktif berkontribusi dan saling membantu pemahaman materi.`,
      `5. Evaluasi: Setiap kelompok mempresentasikan hasil diskusinya di depan kelas atau mengerjakan kuis tim untuk mengukur ketercapaian pemahaman.`,
      `6. Memberikan Penghargaan: Guru memberikan apresiasi dan sertifikat/penghargaan rekognisi kepada kelompok dengan kerja sama dan performa terbaik.`
    ],
    syntaxInstructionLKPD: (materi) => `
ATURAN SINTAKS MUTLAK LKPD: COOPERATIVE LEARNING
Penyusunan LKPD model Cooperative Learning wajib menekankan interdependensi positif dan tanggung jawab tim heterogen mengikuti tepat 6 (enam) tahapan fase resmi berikut:

1. Orientasi Tujuan & Motivasi Tim:
   - Aktivitas Operasional: Menelaah misi belajar kelompok mengenai "${materi}", membangun komitmen gotong royong, dan menyepakati target keberhasilan belajar bersama.
   - Format Lembar Kerja: Pernyataan misi tim dan komitmen kerja sama aktif kelompok. (ruangJawabanType: 'textarea')

2. Telaah Informasi Pengantar:
   - Aktivitas Operasional: Membaca teks materi pengantar bersama tim, mengidentifikasi konsep-konsep kunci, dan mendiskusikan hal-hal yang belum dipahami antarrekan.
   - Format Lembar Kerja: Peta pikiran (mind map) atau ringkasan telaah konsep kunci pengantar materi. (ruangJawabanType: 'textarea')

3. Pembagian Peran Kelompok:
   - Aktivitas Operasional: Menetapkan pembagian tugas peran spesifik setiap anggota kelompok (misal: Koordinator Tim, Notulis/Pencatat, Analis Konsep, Juru Bicara/Presenter) agar tidak ada anggota yang pasif.
   - Format Lembar Kerja: Tabel pembagian peran, nama anggota, dan tanggung jawab tugas tim. (ruangJawabanType: 'tabel')

4. Penyelidikan & Diskusi Kelompok:
   - Aktivitas Operasional: Berdiskusi secara mendalam untuk menyelesaikan tugas pemecahan masalah bersama, saling mengajarkan konsep (peer tutoring), dan memastikan setiap anggota menguasai materi.
   - Format Lembar Kerja: Lembar tugas analisis kolaboratif dan checklist verifikasi pemahaman anggota kelompok. (ruangJawabanType: 'textarea' atau 'checklist')

5. Evaluasi & Uji Pemahaman Tim:
   - Aktivitas Operasional: Mempresentasikan hasil kerja sama kelompok di depan kelas, menjawab pertanyaan tanggapan kelompok lain, dan mengukur ketercapaian pemahaman tim.
   - Format Lembar Kerja: Rangkuman paparan tim dan lembar catatan umpan balik dari kelompok lain. (ruangJawabanType: 'textarea')

6. Refleksi & Penghargaan Tim:
   - Aktivitas Operasional: Menilai kualitas kerja sama tim (peer assessment), mengapresiasi kontribusi setiap rekan kelompok, dan menyimpulkan hasil belajar materi.
   - Format Lembar Kerja: Lembar evaluasi kekompakan tim dan refleksi nilai gotong royong dalam belajar "${materi}". (ruangJawabanType: 'checklist' atau 'textarea')

KETENTUAN ARRAY WAJIB:
- Array "langkahLangkah" WAJIB memuat tepat 6 butir instruksi operasional diawali nama fase: "1. Menyampaikan Tujuan dan Memotivasi Siswa: ...", "2. Menyajikan Informasi (Materi Pengantar): ...", "3. Mengorganisasikan Siswa ke dalam Kelompok-Kelompok Belajar: ...", "4. Membimbing Kelompok Bekerja dan Belajar: ...", "5. Evaluasi: ...", "6. Memberikan Penghargaan & Refleksi: ...".
- Array "lembarKerja" WAJIB memuat tepat 6 butir penugasan kolaboratif yang terintegrasi (1-to-1 mapping).
`
  },

  tgt: {
    key: 'tgt',
    officialName: 'Teams Games Tournament (TGT)',
    totalSteps: 5,
    syntaxSteps: [
      '1. Penyajian Kelas (Class Presentation)',
      '2. Belajar Kelompok (Team Study / Work)',
      '3. Turnamen / Permainan Akademik (Academic Game Tournament)',
      '4. Perhitungan Skor Tim (Team Scoring)',
      '5. Penghargaan Kelompok (Team Recognition)'
    ],
    syntaxInstructionModul: (materi) => `
ATURAN SINTAKS MUTLAK: MODEL TEAMS GAMES TOURNAMENT (TGT)
Kegiatan Inti WAJIB mengikuti 5 fase resmi Teams Games Tournament (De Vries & Slavin) secara runtut:
1. Penyajian Kelas (Class Presentation): Guru menyajikan materi pokok ${materi} secara komunikatif dan interaktif.
2. Belajar Kelompok (Team Study / Work): Peserta didik belajar bersama dalam kelompok heterogen, saling menguji pemahaman konsep sebelum turnamen.
3. Turnamen / Permainan Akademik (Academic Game Tournament): Peserta didik berkompetisi di meja turnamen akademik menjawab kartu-kartu soal bertingkat secara sportif.
4. Perhitungan Skor Tim (Team Scoring): Guru dan peserta didik merekap perolehan skor anggota dari meja turnamen ke skor total tim.
5. Penghargaan Kelompok (Team Recognition): Guru memberikan apresiasi dan penghargaan rekognisi (Super Team, Great Team, Good Team) serta refleksi sportifitas.
Setiap butir dalam array "inti" wajib diawali dengan penomoran dan nama fase resmi tersebut di atas.
`,
    contohIntiModul: (materi) => [
      `1. Penyajian Kelas (Class Presentation): Guru menyajikan konsep kunci dan kaidah penting materi ${materi} secara visual dan kontekstual.`,
      `2. Belajar Kelompok (Team Study / Work): Peserta didik bekerja sama dalam kelompok heterogen, saling mengajarkan dan menguji latihan soal untuk persiapan turnamen.`,
      `3. Turnamen / Permainan Akademik (Academic Game Tournament): Peserta didik bertanding di meja-meja turnamen akademik menjawab kartu soal secara bergiliran dengan sportif.`,
      `4. Perhitungan Skor Tim (Team Scoring): Guru bersama peserta didik menghitung total poin kontribusi tiap anggota untuk menentukan perolehan skor kelompok.`,
      `5. Penghargaan Kelompok (Team Recognition): Guru mengumumkan kelompok berprestasi dengan predikat Super Team dan memberikan penghargaan atas kerja sama dan kejujuran.`
    ],
    syntaxInstructionLKPD: (materi) => `
ATURAN SINTAKS MUTLAK LKPD: TEAMS GAMES TOURNAMENT (TGT)
Penyusunan LKPD model TGT wajib memadukan belajar kooperatif tim dengan turnamen akademik bertingkat mengikuti tepat 5 (lima) tahapan fase resmi berikut:

1. Penyajian Kelas (Class Presentation):
   - Aktivitas Operasional: Menyimak paparan pengantar konsep pokok materi "${materi}" dari guru, mencatat kaidah, prinsip, dan rumus/kata kunci esensial yang akan digunakan dalam turnamen akademik.
   - Format Lembar Kerja: Lembar catatan konsep kunci dan rangkuman prinsip materi persiapan turnamen. (ruangJawabanType: 'textarea')

2. Belajar Kelompok (Team Study / Work):
   - Aktivitas Operasional: Belajar bersama dalam kelompok heterogen (4-5 siswa), saling melatih, saling menguji penguasaan materi teman sekelompok (peer tutoring), dan memastikan setiap anggota kelompok siap bertanding di meja turnamen.
   - Format Lembar Kerja: Lembar latihan uji pemahaman antarrekan tim dan checklist kesiapan anggota kelompok. (ruangJawabanType: 'textarea' atau 'checklist')

3. Turnamen / Permainan Akademik (Academic Game Tournament):
   - Aktivitas Operasional: Peserta didik bertanding di meja turnamen akademik melawan perwakilan kelompok lain yang berkemampuan sepadan, mengambil kartu soal secara acak, menjawab soal bernomor dengan sportif, dan mencatat perolehan poin per ronde.
   - Format Lembar Kerja: Format lembar pencatatan kartu soal turnamen (Nomor Meja | Nomor Kartu Soal | Jawaban Siswa | Poin Ronde yang Diperoleh). (ruangJawabanType: 'tabel')

4. Perhitungan Skor Tim (Team Scoring):
   - Aktivitas Operasional: Kembali ke kelompok asal, merekapitulasi total poin kontribusi yang disumbangkan oleh setiap anggota kelompok dari masing-masing meja turnamen, dan menghitung skor rata-rata/total kelompok.
   - Format Lembar Kerja: Tabel rekapitulasi perolehan skor tim: [No | Nama Anggota Tim | Nomor Meja Turnamen | Skor Poin Individu | Kontribusi ke Tim]. (ruangJawabanType: 'tabel')

5. Penghargaan Kelompok (Team Recognition):
   - Aktivitas Operasional: Menghitung kualifikasi penghargaan tim (Super Team, Great Team, Good Team), merayakan keberhasilan bersama, serta merefleksikan nilai sportifitas, kejujuran, dan kerja keras tim dalam belajar "${materi}".
   - Format Lembar Kerja: Lembar penetapan predikat kelompok dan refleksi sportifitas kompetisi serta kerja sama. (ruangJawabanType: 'textarea')

KETENTUAN ARRAY WAJIB:
- Array "langkahLangkah" WAJIB memuat tepat 5 butir instruksi operasional diawali nama fase: "1. Penyajian Kelas (Class Presentation): ...", "2. Belajar Kelompok (Team Study / Work): ...", "3. Turnamen / Permainan Akademik (Academic Game Tournament): ...", "4. Perhitungan Skor Tim (Team Scoring): ...", "5. Penghargaan Kelompok (Team Recognition): ...".
- Array "lembarKerja" WAJIB memuat tepat 5 butir penugasan turnamen yang terurut dan bertahap (1-to-1 mapping).
`
  }
};

/**
 * Resolver eksplisit model pembelajaran resmi.
 * Menghindari konversi diam-diam (silent fallback) ke PBL dan memberikan notifikasi error yang jelas
 * jika model tidak dipilih atau model yang dimasukkan belum didukung.
 */
export type ModelResolutionResult =
  | { success: true; definition: PedagogicalModelDef; error?: undefined }
  | { success: false; definition?: undefined; error: string };

export function resolveModelPembelajaran(modelRaw?: string): ModelResolutionResult {
  const raw = (modelRaw || '').trim();
  if (!raw) {
    return {
      success: false,
      error: 'Model pembelajaran wajib dipilih atau diisi. Silakan pilih salah satu dari 6 model pembelajaran resmi yang didukung: Project Based Learning (PjBL), Problem Based Learning (PBL), Discovery Learning, Inquiry Learning, Cooperative Learning, atau Teams Games Tournament (TGT).'
    };
  }

  const normalized = raw.toLowerCase().replace(/[-_/]/g, ' ');

  // 1. PjBL / Project Based (Dicek lebih dulu agar tidak tertukar dengan PBL)
  if (
    normalized.includes('pjbl') ||
    normalized.includes('project') ||
    normalized.includes('proyek') ||
    normalized.includes('berbasis proyek')
  ) {
    return { success: true, definition: PEDAGOGICAL_MODELS.pjbl };
  }

  // 2. PBL / Problem Based
  if (
    normalized.includes('pbl') ||
    normalized.includes('problem') ||
    normalized.includes('masalah') ||
    normalized.includes('berbasis masalah')
  ) {
    return { success: true, definition: PEDAGOGICAL_MODELS.pbl };
  }

  // 3. Discovery Learning
  if (
    normalized.includes('discovery') ||
    normalized.includes('penemuan')
  ) {
    return { success: true, definition: PEDAGOGICAL_MODELS.discovery };
  }

  // 4. Inquiry Learning
  if (
    normalized.includes('inquiry') ||
    normalized.includes('inkuiri')
  ) {
    return { success: true, definition: PEDAGOGICAL_MODELS.inquiry };
  }

  // 5. Teams Games Tournament (TGT) - Dicek sebelum cooperative umum
  if (
    normalized.includes('tgt') ||
    normalized.includes('teams games tournament') ||
    normalized.includes('team game tournament') ||
    normalized.includes('turnamen')
  ) {
    return { success: true, definition: PEDAGOGICAL_MODELS.tgt };
  }

  // 6. Cooperative Learning (Varian STAD, Jigsaw, TPS, NHT, dll)
  if (
    normalized.includes('cooperative') ||
    normalized.includes('kooperatif') ||
    normalized.includes('stad') ||
    normalized.includes('jigsaw') ||
    normalized.includes('tps') ||
    normalized.includes('think pair share') ||
    normalized.includes('nht')
  ) {
    return { success: true, definition: PEDAGOGICAL_MODELS.cooperative };
  }

  return {
    success: false,
    error: `Model pembelajaran "${raw}" belum didukung oleh sistem. Model yang saat ini didukung secara resmi adalah: Project Based Learning (PjBL), Problem Based Learning (PBL), Discovery Learning, Inquiry Learning, Cooperative Learning, dan Teams Games Tournament (TGT). Silakan pilih salah satu model tersebut.`
  };
}

// ==========================================
// PENGHITUNG ALOKASI WAKTU PEMBELAJARAN DINAMIS
// ==========================================
export interface TimeDistributionResult {
  totalMinutes: number;
  waktuPendahuluan: string;
  waktuInti: string;
  waktuPenutup: string;
}

export function calculateTimeDistribution(
  alokasiWaktuRaw?: string,
  jenjang?: string
): TimeDistributionResult {
  let totalMinutes = 90; // Default: 2 x 45 menit (standar Kurikulum Merdeka)
  const raw = (alokasiWaktuRaw || '').trim().toLowerCase();

  // Pola 1: Perkalian JP x menit, misal: "2 x 45 menit", "2x40", "3 * 45", "2 x 35"
  const multiplierMatch = raw.match(/(\d+)\s*(?:x|\*)\s*(\d+)/i);
  if (multiplierMatch) {
    const jpCount = parseInt(multiplierMatch[1], 10);
    const minutePerJp = parseInt(multiplierMatch[2], 10);
    if (!isNaN(jpCount) && !isNaN(minutePerJp) && jpCount > 0 && minutePerJp > 0) {
      totalMinutes = jpCount * minutePerJp;
    }
  } else {
    // Pola 2: Format "2 JP", "3 Jam Pelajaran", "4JP"
    const jpMatch = raw.match(/(\d+)\s*(?:jp|jam\s*pelajaran)/i);
    if (jpMatch) {
      const jpCount = parseInt(jpMatch[1], 10);
      let minutePerJp = 45; // Default SMA/MA/SMK
      if (jenjang?.includes('SD') || jenjang?.includes('MI')) {
        minutePerJp = 35;
      } else if (jenjang?.includes('SMP') || jenjang?.includes('MTs')) {
        minutePerJp = 40;
      }
      if (!isNaN(jpCount) && jpCount > 0) {
        totalMinutes = jpCount * minutePerJp;
      }
    } else {
      // Pola 3: Nilai angka langsung menit misal "70 menit", "80 menit", "120"
      const numberMatch = raw.match(/(\d+)/);
      if (numberMatch) {
        const val = parseInt(numberMatch[1], 10);
        if (!isNaN(val) && val >= 30 && val <= 360) {
          totalMinutes = val;
        }
      }
    }
  }

  // Hitung alokasi proporsional
  let waktuPendahuluan: number;
  let waktuPenutup: number;

  if (totalMinutes <= 60) {
    waktuPendahuluan = 10;
    waktuPenutup = 10;
  } else if (totalMinutes <= 80) {
    // Misal 70 menit (SD 2 JP) atau 80 menit (SMP 2 JP)
    waktuPendahuluan = 10;
    waktuPenutup = 10;
  } else if (totalMinutes <= 100) {
    // Misal 90 menit (SMA 2 JP)
    waktuPendahuluan = 15;
    waktuPenutup = 15;
  } else if (totalMinutes <= 140) {
    // Misal 120 menit (3 JP SMP) atau 135 menit (3 JP SMA)
    waktuPendahuluan = 15;
    waktuPenutup = 15;
  } else {
    // >= 150 menit (4 JP / blok praktikum panjang)
    waktuPendahuluan = 20;
    waktuPenutup = 20;
  }

  const waktuInti = Math.max(20, totalMinutes - waktuPendahuluan - waktuPenutup);

  return {
    totalMinutes,
    waktuPendahuluan: String(waktuPendahuluan),
    waktuInti: String(waktuInti),
    waktuPenutup: String(waktuPenutup),
  };
}

// API Endpoint for generating LKPD
app.post("/api/generate-lkpd", async (req, res) => {
  try {
    const {
      tingkatSekolah,
      kelas,
      fase,
      mataPelajaran,
      materiPokok,
      modelPembelajaran,
      tujuanPembelajaran,
      jenisAktivitas,
    } = req.body;

    if (!mataPelajaran || !materiPokok || !tujuanPembelajaran) {
      return res.status(400).json({
        error: "Mata pelajaran, materi pokok, dan tujuan pembelajaran wajib diisi.",
      });
    }

    // Pemetaan eksplisit model pembelajaran (Mencegah salah sintaks diam-diam)
    const modelResolution = resolveModelPembelajaran(modelPembelajaran);
    if (!modelResolution.success) {
      return res.status(400).json({
        error: modelResolution.error,
      });
    }

    const modelDef = modelResolution.definition;
    const ai = getGeminiClient();

    let jenisAktivitasText = "";
    if (jenisAktivitas === "praktikum") {
      jenisAktivitasText = "Praktikum / Eksperimen Laboratorium / Investigasi Empiris";
    } else if (jenisAktivitas === "proyek" || modelDef.key === 'pjbl') {
      jenisAktivitasText = "Produk / Proyek Nyata Berkelompok (Project Based)";
    } else {
      jenisAktivitasText = "Konseptual / Analisis Kasus / Diskusi Kolaboratif Terarah";
    }

    const instruksiSintaksLKPD = modelDef.syntaxInstructionLKPD(materiPokok, jenisAktivitas);
    const praktikumAddition = jenisAktivitas === "praktikum"
      ? `\n- CATATAN KHUSUS PRAKTIKUM: Bagian pengumpulan data/penyelidikan wajib menguraikan daftar alat & bahan, prosedur eksperimen terukur, dan tabel data pengamatan.`
      : '';

    const prompt = `
Anda adalah Pakar Pengembang Kurikulum dan Perancang Bahan Ajar Resmi Kurikulum Merdeka Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi (Kemendikbudristek) dan Kementerian Agama (Kemenag - Madrasah) Indonesia.
Tugas Anda adalah menyusun Lembar Kerja Peserta Didik (LKPD) yang SANGAT OPERASIONAL, KAYA AKTIVITAS KONKRET, BERPUSAT PADA PESERTA DIDIK (STUDENT-CENTERED), dan MENERAPKAN SINTAKS RESMI SECARA PRESISI DAN MENYELURUH.

DATA INPUT LKPD:
- Jenjang Sekolah / Madrasah: ${tingkatSekolah || 'SD/MI / SMP/MTs / SMA/MA/SMK'}
- Kelas / Fase: Kelas ${kelas || 'Sesuai Fase'} (${fase || 'Fase A/B/C/D/E/F'})
- Mata Pelajaran: ${mataPelajaran}
- Materi Pokok / Topik: ${materiPokok}
- Model Pembelajaran Terpilih: ${modelDef.officialName} (Wajib ${modelDef.totalSteps} Tahapan Sintaks Resmi)
- Tujuan Pembelajaran (TP) dari Guru: "${tujuanPembelajaran}"
- Jenis Aktivitas LKPD: ${jenisAktivitasText}

${instruksiSintaksLKPD}${praktikumAddition}

PEDOMAN UTAMA KUALITAS AKTIVITAS LKPD (STANDAR EXCELLENCE):
1. Menjaga Relevansi Tujuan Pembelajaran:
   - Jaga makna dan fokus Tujuan Pembelajaran (TP) yang diinput oleh guru. Uraikan menjadi 3-4 indikator capaian konkret dengan Kata Kerja Operasional (KKO) yang terukur dan mencakup ranah HOTS (Analisis, Evaluasi, atau Kreasi).
2. Orientasi Masalah & Stimulus Kontekstual:
   - "orientasiMasalah": Wajib menyajikan narasi studi kasus autentik / fenomena kontekstual nyata (2-3 paragraf kaya konteks) yang dekat dengan kehidupan sehari-hari siswa jenjang ${tingkatSekolah || 'ini'}, memancing empati, rasa ingin tahu, dan pemikiran kritis.
   - "pembahasanUtama": Ringkasan konsep materi esensial (2-3 paragraf) yang padat kaidah, prinsip ilmiah, atau materi pokok sebagai bekal dasar siswa mengerjakan tugas.
   - "kataKunci": 4-6 kata kunci penting materi.
3. Langkah-Langkah Kegiatan Siswa ("langkahLangkah"):
   - WAJIB memuat TEPAT ${modelDef.totalSteps} BUTIR tahapan kegiatan yang berurutan sesuai sintaks resmi ${modelDef.officialName}.
   - Setiap butir WAJIB diawali persis dengan nomor dan nama sintaks: "1. [Nama Sintaks]: [Uraian instruksi kegiatan operasional apa yang harus dilakukan siswa bersama kelompoknya]".
4. Lembar Kerja Penugasan ("lembarKerja"):
   - WAJIB memuat TEPAT ${modelDef.totalSteps} BUTIR penugasan operasional yang berkorespondensi 1-ke-1 dengan setiap tahapan sintaks ${modelDef.officialName}.
   - Format setiap butir penugasan:
     * "no": Angka urut 1 sampai ${modelDef.totalSteps}.
     * "pertanyaan": Penugasan operasional konkret yang diawali nama sintaks dalam tanda kurung siku, misal: "[${modelDef.syntaxSteps[0] || 'Tahap 1'}] [Instruksi penugasan spesifik, studi kasus, atau pertanyaan pemantik terarah]". DILARANG membuat pertanyaan dangkal atau teoritis satu kalimat!
     * "petunjukIsian": Panduan teknis pengerjaan yang operasional. 
       - Jika membutuhkan Tabel, sebutkan format kolom yang wajib dibuat siswa (misal: "Buatlah tabel dengan kolom: [No | Aspek | Hasil Pengamatan | Keterangan]").
       - Jika membutuhkan Checklist, sebutkan daftar aspek/indikator yang wajib diperiksa siswa.
       - Jika pertanyaan analitis, berikan 2-3 pertanyaan penuntun (guiding questions) berpikir tingkat tinggi.
     * "ruangJawabanType": Pilih tipe format yang paling tepat:
       - 'tabel': Untuk perencanaan jadwal, pembagian peran, pengumpulan data eksperimen/observasi, komparasi solusi, rekapitulasi turnamen.
       - 'checklist': Untuk kesiapan alat/bahan, monitoring progres tugas kelompok, kriteria keberhasilan produk, peer review tim.
       - 'textarea': Untuk analisis masalah mendalam, perumusan ide gagasan, evaluasi solusi, simpulan generalisasi, dan refleksi pengalaman.
       - 'text': Untuk rumusan pertanyaan masalah atau hipotesis ringkas.
     * "opsiPilihan": Jika 'checklist' atau 'pilihan_ganda', sediakan 3-5 pilihan indikator/aspek kontekstual terkait materi. Jika tidak, kosongkan [].
5. Soal Refleksi Siswa ("soalRefleksi"):
   - Tepat 3 butir pertanyaan refleksi diri siswa yang mendalam (bukan klise), mencakup:
     1) Konsep materi paling esensial dan bermakna yang berhasil dipahami.
     2) Kendala/tantangan yang dihadapi saat berkolaborasi dalam sintaks ${modelDef.officialName} serta bagaimana kelompok mengatasinya.
     3) Komitmen penerapan atau aksi nyata konsep ${materiPokok} dalam kehidupan sehari-hari.
6. LARANGAN: DILARANG membuat kunci jawaban atau rubrik guru di dalam lembar kerja ini agar output sepenuhnya berfokus pada siswa dan hemat token.

Hasilkan dokumen LKPD dalam format JSON yang valid sesuai schema di bawah ini.
`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: `Anda adalah Master Kurikulum & Desainer Lembar Kerja Peserta Didik (LKPD) Kurikulum Merdeka Kemendikbudristek & Kemenag RI. Anda ahli merancang aktivitas pembelajaran operasional yang kaya dengan checklist, tabel kerja, pertanyaan panduan HOTS, dan penerapan ketat sintaks ${modelDef.officialName}.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identitas: {
              type: Type.OBJECT,
              properties: {
                judul: { type: Type.STRING },
                subJudul: { type: Type.STRING },
                mataPelajaran: { type: Type.STRING },
                tingkatKelasFase: { type: Type.STRING },
                alokasiWaktu: { type: Type.STRING },
                modelPembelajaran: { type: Type.STRING },
                petunjukPenggunaan: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["judul", "subJudul", "mataPelajaran", "tingkatKelasFase", "alokasiWaktu", "modelPembelajaran", "petunjukPenggunaan"],
            },
            tujuanPembelajaran: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            materiRingkas: {
              type: Type.OBJECT,
              properties: {
                orientasiMasalah: { type: Type.STRING },
                pembahasanUtama: { type: Type.STRING },
                kataKunci: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["orientasiMasalah", "pembahasanUtama", "kataKunci"],
            },
            kegiatanSiswa: {
              type: Type.OBJECT,
              properties: {
                namaKegiatan: { type: Type.STRING },
                jenisKegiatan: { type: Type.STRING },
                langkahLangkah: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                lembarKerja: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      no: { type: Type.INTEGER },
                      pertanyaan: { type: Type.STRING },
                      petunjukIsian: { type: Type.STRING },
                      ruangJawabanType: { type: Type.STRING },
                      opsiPilihan: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                    },
                    required: ["no", "pertanyaan", "ruangJawabanType"],
                  },
                },
              },
              required: ["namaKegiatan", "jenisKegiatan", "langkahLangkah", "lembarKerja"],
            },
            soalRefleksi: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            "identitas",
            "tujuanPembelajaran",
            "materiRingkas",
            "kegiatanSiswa",
            "soalRefleksi",
          ],
        },
      },
    });

    const text = response.text || "{}";
    const resultData = JSON.parse(text);
    resultData.id = "lkpd-" + Date.now();
    resultData.createdDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // =========================================================================
    // VALIDASI KUALITAS & NORMALISASI TERARAH LKPD (SYNTAX & COMPATIBILITY CHECK)
    // =========================================================================
    
    // 1. Identitas & Model Pembelajaran Jaminan
    if (!resultData.identitas || typeof resultData.identitas !== "object") {
      resultData.identitas = {
        judul: `LKPD: ${materiPokok}`,
        subJudul: `Aktivitas Berbasis ${modelDef.officialName} pada Mata Pelajaran ${mataPelajaran}`,
        mataPelajaran: mataPelajaran,
        tingkatKelasFase: `${tingkatSekolah || 'Sekolah'} - Kelas ${kelas || ''} (${fase || ''})`,
        alokasiWaktu: '2 x 45 Menit',
        modelPembelajaran: modelDef.officialName,
        petunjukPenggunaan: [
          'Berdoalah sebelum memulai kegiatan belajar bersama kelompok.',
          'Bacalah orientasi masalah dan materi ringkas dengan seksama.',
          'Ikuti setiap tahapan langkah kegiatan secara berurutan dan bagi tugas secara adil.',
          'Kerjakan seluruh tugas lembar kerja dengan aktif, jujur, dan penuh tanggung jawab.',
          'Konsultasikan kepada guru jika terdapat instruksi yang belum dipahami.'
        ]
      };
    } else {
      resultData.identitas.modelPembelajaran = modelDef.officialName;
      if (!Array.isArray(resultData.identitas.petunjukPenggunaan) || resultData.identitas.petunjukPenggunaan.length === 0) {
        resultData.identitas.petunjukPenggunaan = [
          'Berdoalah sebelum memulai kegiatan belajar bersama rekan sekelompok.',
          'Cermati orientasi stimulus masalah dan ringkasan materi sebagai landasan penyelidikan.',
          'Laksanakan setiap tahapan langkah aktivitas sintaks secara runtut dan kolaboratif.',
          'Selesaikan tugas lembar kerja secara aktif dan bertanggung jawab.',
          'Mintalah bimbingan guru apabila menghadapi kendala dalam diskusi kelompok.'
        ];
      }
    }

    // 2. Tujuan Pembelajaran
    if (!Array.isArray(resultData.tujuanPembelajaran) || resultData.tujuanPembelajaran.length === 0) {
      resultData.tujuanPembelajaran = [
        `Memahami konsep esensial materi ${materiPokok} melalui tahapan model ${modelDef.officialName}.`,
        `Menganalisis dan memecahkan permasalahan kontekstual seputar ${materiPokok} secara kritis dan kolaboratif.`,
        `Menyajikan hasil karya/solusi kelompok serta merefleksikan proses belajar secara komprehensif.`
      ];
    }

    // 3. Materi Ringkas & Orientasi Masalah
    if (!resultData.materiRingkas || typeof resultData.materiRingkas !== "object") {
      resultData.materiRingkas = {
        orientasiMasalah: `Perhatikan situasi nyata berikut terkait materi ${materiPokok}. Dalam kehidupan sehari-hari, kita sering menjumpai fenomena kontekstual yang memerlukan penalaran kritis dan pemecahan masalah kolaboratif. Diskusikan kasus ini bersama rekan kelompok Anda.`,
        pembahasanUtama: `Materi ${materiPokok} memiliki prinsip-prinsip mendasar yang menjadi rujukan dalam penyelidikan dan penyelesaian tugas pada LKPD ini. Pahami kaidah-kaidah kunci untuk menghasilkan karya atau solusi yang tepat.`,
        kataKunci: [materiPokok, modelDef.officialName, 'Analisis', 'Kolaborasi', 'Evaluasi']
      };
    } else {
      if (!resultData.materiRingkas.orientasiMasalah) {
        resultData.materiRingkas.orientasiMasalah = `Amati dan telaah permasalahan kontekstual seputar ${materiPokok} yang disajikan untuk memandu aktivitas kelompok.`;
      }
      if (!resultData.materiRingkas.pembahasanUtama) {
        resultData.materiRingkas.pembahasanUtama = `Ringkasan materi ${materiPokok} sebagai dasar pemahaman dalam melaksanakan seluruh rangkaian kegiatan belajar.`;
      }
      if (!Array.isArray(resultData.materiRingkas.kataKunci) || resultData.materiRingkas.kataKunci.length === 0) {
        resultData.materiRingkas.kataKunci = [materiPokok, 'Konsep Utama', 'Analisis', 'Solusi'];
      }
    }

    // 4. Validasi Kegiatan Siswa & Sintaks Model
    if (!resultData.kegiatanSiswa || typeof resultData.kegiatanSiswa !== "object") {
      resultData.kegiatanSiswa = {
        namaKegiatan: `Aktivitas Belajar ${modelDef.officialName} - ${materiPokok}`,
        jenisKegiatan: jenisAktivitasText,
        langkahLangkah: [],
        lembarKerja: []
      };
    }

    // Validasi langkah-langkah kegiatan: pastikan ada dan sesuai sintaks resmi model
    const existingSteps = Array.isArray(resultData.kegiatanSiswa.langkahLangkah)
      ? resultData.kegiatanSiswa.langkahLangkah.filter((s: any) => typeof s === "string" && s.trim() !== "")
      : [];

    if (existingSteps.length < modelDef.totalSteps) {
      // Auto-repair terarah agar urutan dan nama sintaks lengkap dan presisi
      resultData.kegiatanSiswa.langkahLangkah = modelDef.syntaxSteps.map((stepOfficial, idx) => {
        const rawStepName = stepOfficial.replace(/^\d+\.\s*/, '').toLowerCase().slice(0, 10);
        const matched = existingSteps.find(s => s.toLowerCase().includes(rawStepName));
        if (matched) return matched;
        return `${stepOfficial}: Melaksanakan rangkaian kegiatan penyelidikan dan penugasan terstruktur secara kolaboratif seputar materi ${materiPokok}.`;
      });
    }

    // Validasi lembar kerja pertanyaan/penugasan
    const validRuangTypes = ['text', 'textarea', 'checklist', 'tabel', 'pilihan_ganda'];
    const existingQuestions = Array.isArray(resultData.kegiatanSiswa.lembarKerja)
      ? resultData.kegiatanSiswa.lembarKerja
      : [];

    if (existingQuestions.length < modelDef.totalSteps) {
      // Auto-repair terarah agar lembar kerja mencakup setiap tahap sintaks
      resultData.kegiatanSiswa.lembarKerja = modelDef.syntaxSteps.map((stepOfficial, idx) => {
        const existing = existingQuestions[idx];
        if (existing && existing.pertanyaan && typeof existing.pertanyaan === 'string') {
          const rawType = (existing.ruangJawabanType || '').toLowerCase().trim();
          const cleanType = validRuangTypes.includes(rawType) ? rawType : (idx === 1 || idx === 2 ? 'tabel' : 'textarea');
          return {
            no: idx + 1,
            pertanyaan: existing.pertanyaan.includes('[') ? existing.pertanyaan : `[${stepOfficial}] ${existing.pertanyaan}`,
            petunjukIsian: existing.petunjukIsian || 'Tuliskan hasil diskusi dan kerja kelompok Anda secara terperinci.',
            ruangJawabanType: cleanType,
            opsiPilihan: Array.isArray(existing.opsiPilihan) ? existing.opsiPilihan : []
          };
        }
        // Fallback default terarah per tahap sintaks
        const defaultType = (idx === 1 || idx === 2) ? 'tabel' : (idx === 3 ? 'checklist' : 'textarea');
        return {
          no: idx + 1,
          pertanyaan: `[${stepOfficial}] Lakukan analisis dan selesaikan penugasan kelompok untuk tahapan ini terkait topik "${materiPokok}".`,
          petunjukIsian: defaultType === 'tabel' 
            ? 'Isilah tabel kerja dengan mencantumkan kolom-kolom aspek pengamatan atau perencanaan secara rapi.'
            : 'Jawablah dengan argumentasi yang jelas dan diskusikan bersama anggota kelompok.',
          ruangJawabanType: defaultType,
          opsiPilihan: []
        };
      });
    } else {
      // Normalisasi pertanyaan yang ada
      resultData.kegiatanSiswa.lembarKerja = existingQuestions.map((q: any, idx: number) => {
        const rawType = (q.ruangJawabanType || '').toLowerCase().trim();
        const cleanType = validRuangTypes.includes(rawType) ? rawType : 'textarea';
        const officialStepName = modelDef.syntaxSteps[idx] || `Tahap ${idx + 1}`;
        let cleanPertanyaan = typeof q.pertanyaan === 'string' && q.pertanyaan.trim() !== ''
          ? q.pertanyaan.trim()
          : `Penugasan Tahap ${idx + 1} (${materiPokok})`;
        if (!cleanPertanyaan.includes('[')) {
          cleanPertanyaan = `[${officialStepName}] ${cleanPertanyaan}`;
        }
        return {
          no: typeof q.no === 'number' ? q.no : idx + 1,
          pertanyaan: cleanPertanyaan,
          petunjukIsian: typeof q.petunjukIsian === 'string' && q.petunjukIsian.trim() !== ''
            ? q.petunjukIsian.trim()
            : 'Tuliskan hasil kerja kelompok secara lengkap dan sistematis.',
          ruangJawabanType: cleanType,
          opsiPilihan: Array.isArray(q.opsiPilihan) ? q.opsiPilihan : []
        };
      });
    }

    // 5. Validasi Soal Refleksi Siswa
    if (!Array.isArray(resultData.soalRefleksi) || resultData.soalRefleksi.length < 3) {
      resultData.soalRefleksi = [
        `Apa konsep materi paling bermakna yang Anda dan kelompok peroleh mengenai "${materiPokok}" hari ini?`,
        `Tantangan apa yang Anda hadapi selama berkolaborasi dalam tahapan model ${modelDef.officialName}, dan bagaimana cara kelompok mengatasinya?`,
        `Bagaimana Anda akan menerapkan pemahaman atau karya yang telah dihasilkan dalam kehidupan sehari-hari?`
      ];
    }

    res.json(resultData);
  } catch (error: any) {
    console.error("Error generating LKPD:", error);
    res.status(500).json({
      error: formatGeminiError(error, "Gagal menghasilkan LKPD dari AI. Silakan coba lagi."),
    });
  }
});

// API Endpoint for generating Modul Ajar
app.post("/api/generate-modul", async (req, res) => {
  try {
    const {
      namaGuru,
      sekolah,
      tahunPembuatan,
      mataPelajaran,
      tingkatSekolah,
      kelas,
      fase,
      alokasiWaktu,
      elemenCPPAI,
      materiPokok,
      tujuanPembelajaran,
      modelPembelajaran,
    } = req.body;

    if (!mataPelajaran || !materiPokok) {
      return res.status(400).json({
        error: "Mata pelajaran dan topik pembelajaran wajib diisi.",
      });
    }

    // Pemetaan eksplisit model pembelajaran (Mencegah silent fallback ke PBL)
    const modelResolution = resolveModelPembelajaran(modelPembelajaran);
    if (!modelResolution.success) {
      return res.status(400).json({
        error: modelResolution.error,
      });
    }

    const modelDef = modelResolution.definition;
    const ai = getGeminiClient();

    const paiElementPrompt = elemenCPPAI && elemenCPPAI.trim() !== ''
      ? `\n- ELEMEN CAPAIAN PEMBELAJARAN (BSKAP 032/034 PAI & BP): ${elemenCPPAI}. Sesuaikan seluruh materi, indikator, dan asesmen secara spesifik dengan Elemen CP PAI & BP ini.`
      : '';

    const tpPrompt = tujuanPembelajaran && tujuanPembelajaran.trim() !== ''
      ? `\n- TUJUAN PEMBELAJARAN (TP) DARI GURU: "${tujuanPembelajaran}". Wajib dicantumkan dan diuraikan ke dalam langkah kegiatan inti dan asesmen.`
      : '\n- TUJUAN PEMBELAJARAN (TP): Susun 3-4 Tujuan Pembelajaran yang spesifik, terukur, berfokus pada HOTS (Analisis, Evaluasi, Kreasi), serta selaras dengan Capaian Pembelajaran Kurikulum Merdeka BSKAP 032/034.';

    const timeDist = calculateTimeDistribution(alokasiWaktu, tingkatSekolah);
    const syntaxInstruction = modelDef.syntaxInstructionModul(materiPokok);
    const contohInti = modelDef.contohIntiModul(materiPokok);
    const resolvedModelName = modelDef.officialName;
    const avgMinutesPerStep = Math.round(parseInt(timeDist.waktuInti, 10) / modelDef.totalSteps);

    const prompt = `
Anda adalah Pakar Penyusun Kurikulum Nasional Kemendikbudristek & Kemenag RI (Direktorat KSKK Madrasah & PAI).
Tugas Anda adalah menyusun dokumen MODUL AJAR KURIKULUM MERDEKA resmi, terstruktur, komprehensif, dan siap cetak sesuai standar format resmi template Modul Ajar.

DATA INPUT MODUL AJAR:
- Nama Guru / Penyusun: ${namaGuru || 'Guru Pengampu'}
- Sekolah / Instansi: ${sekolah || 'Satuan Pendidikan'}
- Tahun Pembuatan: ${tahunPembuatan || '2026'}
- Mata Pelajaran: ${mataPelajaran}
- Jenjang / Tingkat: ${tingkatSekolah || 'SMP/MTs'}
- Kelas: ${kelas || '7'}
- Fase: ${fase || 'Fase D'}
- Alokasi Waktu Input Guru: ${alokasiWaktu || `${timeDist.totalMinutes} Menit`}${paiElementPrompt}
- Total Waktu Pembelajaran: ${timeDist.totalMinutes} Menit
- Topik Pembelajaran: ${materiPokok}${tpPrompt}
- Model Pembelajaran Terpilih: ${resolvedModelName}

${syntaxInstruction}

PEDOMAN PERHITUNGAN ALOKASI WAKTU DINAMIS (ANTI LOCK 15-60-15):
Total waktu pembelajaran adalah ${timeDist.totalMinutes} menit (berdasarkan input guru: "${alokasiWaktu || `${timeDist.totalMinutes} Menit`}").
DILARANG mengunci mati waktu ke 15-60-15 jika alokasi waktu guru berbeda! Wajib membagi waktu proporsional sebagai berikut:
- Kegiatan Pendahuluan: tepat ${timeDist.waktuPendahuluan} menit.
- Kegiatan Inti: tepat ${timeDist.waktuInti} menit. Wajib dibagi secara proporsional ke dalam tepat ${modelDef.totalSteps} tahap sintaks ${resolvedModelName} (rata-rata ~${avgMinutesPerStep} menit per sintaks). Pada uraian setiap sintaks inti, cantumkan alokasi waktu spesifiknya!
- Kegiatan Penutup: tepat ${timeDist.waktuPenutup} menit.
Total: ${timeDist.waktuPendahuluan} + ${timeDist.waktuInti} + ${timeDist.waktuPenutup} = ${timeDist.totalMinutes} menit.

PEDOMAN INTEGRASI EKSPLISIT 8 DIMENSI PROFIL LULUSAN:
8 Dimensi Profil Lulusan resmi:
1. Keimanan & Ketaqwaan (Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia)
2. Kewargaan (Kewargaan Global, Toleransi, Cinta Tanah Air)
3. Penalaran Kritis (Bernalar Kritis, Pemecahan Masalah Objektif)
4. Kreativitas (Kreatif, Gagasan Orisinal, Karya Inovatif)
5. Kolaborasi (Bergotong Royong, Kerja Sama Tim, Kepedulian)
6. Kemandirian (Mandiri, Tanggung Jawab Belajar, Manajemen Diri)
7. Kesehatan (Kesehatan & Kebugaran Jasmani-Rohani, Integritas Fisik)
8. Komunikasi (Komunikasi Efektif, Literasi, Penyampaian Ide Terstruktur)

ATURAN INTEGRASI DIMENSI:
- JANGAN memaksakan seluruh 8 dimensi muncul sekaligus dalam 1 pertemuan!
- Pilih secara selektif 2 HINGGA 4 DIMENSI YANG PALING RELEVAN dengan mata pelajaran "${mataPelajaran}", materi "${materiPokok}", model "${resolvedModelName}", dan Tujuan Pembelajaran.
- Pada bagian "dimensiProfilLulusan", sajikan array objek dengan 4 elemen kunci untuk setiap dimensi terpilih:
  1. "dimensi": Nama dimensi yang dipilih dari 8 dimensi di atas.
  2. "indikatorPerilaku": Indikator perilaku konkret atau kompetensi yang diharapkan muncul pada peserta didik selama topik ini.
  3. "keterkaitanAktivitas": Keterkaitan langsung dengan tahapan sintaks kegiatan pembelajaran ${resolvedModelName} (pada tahap sintaks mana dimensi ini dilatih dan dipraktikkan).
  4. "buktiKetercapaian": Bukti ketercapaian dan teknik asesmen yang dapat diobservasi guru (misal: lembar observasi partisipasi kelompok, rubrik presentasi produk, analisis LKPD, catatan refleksi).

PEDOMAN KELENGKAPAN FORMAT & DETAIL LAINNYA:
1. "cp": Tuliskan rumusan Capaian Pembelajaran (CP) resmi Kurikulum Merdeka yang relevan untuk mata pelajaran dan fase ini.
2. "kompetensiAwal": Tuliskan pengetahuan/keterampilan prasyarat siswa yang jelas dan relevan dengan materi ini.
3. "tujuanPembelajaran": Susun 3-4 Tujuan Pembelajaran berbasis HOTS (C4-C6) menggunakan KKO terukur.
4. "pemahamanBermakna": Uraikan pemahaman mendalam dan nilai aplikatif materi ini dalam kehidupan sehari-hari (kontekstual).
5. "pertanyaanPemantik": Susun 2-3 pertanyaan pemantik esensial yang menggugah nalar kritis peserta didik.
6. "asesmen": Cantumkan Asesmen Diagnostik (awal), Formatif (proses/observasi sikap/progres mengacu pada dimensi profil lulusan terpilih), dan Sumatif (akhir/penilaian produk proyek jika PjBL atau tes tertulis).

Format JSON harus sesuai persis dengan skema ini:
{
  "informasiUmum": {
    "penyusun": "${namaGuru || 'Guru Pengampu'}",
    "instansi": "${sekolah || 'Satuan Pendidikan'}",
    "tahun": "${tahunPembuatan || '2026'}",
    "mapel": "${mataPelajaran}",
    "jenjang": "${tingkatSekolah || 'SMP/MTs'}",
    "kelas": "${kelas || '7'}",
    "fase": "${fase || 'Fase D'}",
    "alokasiWaktu": "${alokasiWaktu || `${timeDist.totalMinutes} Menit`}",
    "cp": "Rumusan Capaian Pembelajaran resmi...",
    "elemen": "${elemenCPPAI || 'Elemen Capaian Pembelajaran mapel ini'}",
    "topik": "${materiPokok}",
    "materi": "${materiPokok}",
    "kompetensiAwal": "Kompetensi awal yang dimiliki...",
    "prasyarat": "Prasyarat pengetahuan dasar...",
    "materiUtama": "Rincian materi utama...",
    "metode": "Diskusi Kelompok, Eksplorasi, Praktik/Proyek, Presentasi, Refleksi",
    "targetPesertaDidik": "Peserta didik reguler/tipikal dan peserta didik dengan pencapaian tinggi",
    "jumlahSiswa": "Maksimum 36-40 Siswa",
    "modelPembelajaran": "${resolvedModelName}"
  },
  "dimensiProfilLulusan": [
    {
      "dimensi": "Penalaran Kritis",
      "indikatorPerilaku": "Peserta didik mampu mengidentifikasi masalah, menganalisis data, dan menarik kesimpulan logis...",
      "keterkaitanAktivitas": "Dilatih pada sintaks Inti tahap penyelidikan dan analisis data konsep ${materiPokok}...",
      "buktiKetercapaian": "Kesesuaian analisis pada LKPD dan keaktifan memberikan argumentasi logis saat diskusi."
    },
    {
      "dimensi": "Kolaborasi",
      "indikatorPerilaku": "Peserta didik aktif bergotong royong, berbagi peran secara adil dalam kelompok, dan saling menghargai gagasan...",
      "keterkaitanAktivitas": "Dipraktikkan pada sintaks Inti saat kerja kelompok menyelesaikan tugas/proyek...",
      "buktiKetercapaian": "Rubrik observasi kerjasama tim dan lembar penilaian antar-teman (peer-assessment)."
    }
  ],
  "komponenInti": {
    "tujuanPembelajaran": [
      "1. Peserta didik mampu...",
      "2. Peserta didik mampu..."
    ],
    "pemahamanBermakna": [
      "Pemahaman mendalam materi dalam kehidupan..."
    ],
    "pertanyaanPemantik": [
      "1. Pertanyaan pemantik esensial...",
      "2. Pertanyaan pemantik..."
    ],
    "persiapanPembelajaran": [
      "1. Menyiapkan bahan ajar, media, dan LKPD.",
      "2. Menyiapkan sarana, alat bahan, serta pembagian kelompok."
    ],
    "kegiatanPembelajaran": {
      "pendahuluan": [
        "1. Guru mengucapkan salam dan meminta salah satu siswa memimpin doa bersama.",
        "2. Guru mengecek kehadiran dan kesiapan belajar, lalu memberikan apersepsi kontekstual.",
        "3. Guru menyampaikan tujuan pembelajaran, alur kegiatan, dan pertanyaan pemantik."
      ],
      "waktuPendahuluan": "${timeDist.waktuPendahuluan}",
      "inti": ${JSON.stringify(contohInti, null, 8)},
      "waktuInti": "${timeDist.waktuInti}",
      "penutup": [
        "1. Guru bersama peserta didik merumuskan kesimpulan pembelajaran hari ini.",
        "2. Guru dan peserta didik melakukan refleksi proses pembelajaran.",
        "3. Guru menyampaikan arahan tindak lanjut pertemuan berikutnya dan menutup dengan doa serta salam."
      ],
      "waktuPenutup": "${timeDist.waktuPenutup}"
    },
    "asesmen": {
      "diagnostik": "Asesmen diagnostik non-kognitif (kesiapan belajar) dan kognitif awal sebelum pembelajaran.",
      "formatif": "Observasi proses diskusi kelompok, keaktifan bertanya, serta rubrik observasi sikap dimensi profil lulusan terpilih.",
      "sumatif": "Penilaian hasil produk akhir proyek (rubrik unjuk kerja) / tes evaluasi materi bertingkat HOTS."
    },
    "pengayaanDanRemedial": {
      "pengayaan": "Peserta didik yang telah mencapai KKTP diberikan penugasan pengayaan analisis kasus nyata atau pengembangan karya mandiri.",
      "remedial": "Peserta didik yang belum mencapai KKTP diberikan bimbingan perorangan terfokus dan pendalaman konsep."
    }
  }
}
Catatan Hemat Token: TIDAK PERLU membuat atau menghasilkan bagian lampiran (seperti Glosarium atau Daftar Pustaka) agar pengeluaran token lebih efisien dan hemat.
`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah pakar penyusun Modul Ajar Kurikulum Merdeka resmi Kemendikbudristek & Kemenag RI.",
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const resultData = JSON.parse(text);

    // Pastikan struktur komponenInti dan kegiatanPembelajaran selalu lengkap
    if (!resultData.komponenInti) {
      resultData.komponenInti = {} as any;
    }
    if (!resultData.komponenInti.kegiatanPembelajaran) {
      resultData.komponenInti.kegiatanPembelajaran = {} as any;
    }

    // Penegakan Alokasi Waktu Dinamis (Anti lock 15-60-15)
    resultData.komponenInti.kegiatanPembelajaran.waktuPendahuluan =
      resultData.komponenInti.kegiatanPembelajaran.waktuPendahuluan || timeDist.waktuPendahuluan;
    resultData.komponenInti.kegiatanPembelajaran.waktuInti =
      resultData.komponenInti.kegiatanPembelajaran.waktuInti || timeDist.waktuInti;
    resultData.komponenInti.kegiatanPembelajaran.waktuPenutup =
      resultData.komponenInti.kegiatanPembelajaran.waktuPenutup || timeDist.waktuPenutup;

    // Pastikan identitas modul konsisten
    if (resultData.informasiUmum) {
      resultData.informasiUmum.modelPembelajaran = resolvedModelName;
      resultData.informasiUmum.alokasiWaktu = alokasiWaktu || `${timeDist.totalMinutes} Menit`;
    }

    // Penegakan Integrasi Eksplisit 8 Dimensi Profil Lulusan (Fallback jaminan jika kosong)
    if (!Array.isArray(resultData.dimensiProfilLulusan) || resultData.dimensiProfilLulusan.length === 0) {
      resultData.dimensiProfilLulusan = [
        {
          dimensi: "Penalaran Kritis",
          indikatorPerilaku: `Mengidentifikasi, mengklarifikasi, dan menganalisis informasi esensial terkait ${materiPokok} untuk memecahkan masalah.`,
          keterkaitanAktivitas: `Dipraktikkan pada sintaks Inti model ${resolvedModelName} saat peserta didik menganalisis fenomena dan data pembelajaran.`,
          buktiKetercapaian: `Lembar kerja peserta didik (LKPD) terisi dengan penalaran logis dan keaktifan bertanya analitis.`
        },
        {
          dimensi: modelDef.key === 'pjbl' || modelDef.key === 'cooperative' ? "Kolaborasi" : "Kemandirian",
          indikatorPerilaku: modelDef.key === 'pjbl' || modelDef.key === 'cooperative'
            ? "Membangun kerja sama tim yang solid, berbagi peran secara adil, dan saling mengapresiasi pendapat rekan sekelompok."
            : "Mengelola proses belajar mandiri, menunjukkan disiplin belajar, dan bertanggung jawab terhadap target pencapaian tugas.",
          keterkaitanAktivitas: `Dilatih pada tahapan kegiatan inti saat eksplorasi mandiri/kelompok dan perumusan hasil belajar.`,
          buktiKetercapaian: `Lembar observasi keterlibatan aktif peserta didik dan rubrik penilaian sikap.`
        }
      ];
    }

    res.json(resultData);
  } catch (error: any) {
    console.error("Error generating Modul Ajar:", error);
    res.status(500).json({ error: formatGeminiError(error, "Gagal membuat Modul Ajar.") });
  }
});

// API Endpoint for generating Soal HOTS / Bank Ujian
app.post("/api/generate-hots", async (req, res) => {
  try {
    const {
      mataPelajaran,
      tingkatSekolah,
      kelas,
      materiPokok,
      tingkatKesulitan,
      jenisSoal,
      jumlahSoal,
      tujuanPembelajaran,
    } = req.body;

    if (!mataPelajaran || !materiPokok) {
      return res.status(400).json({
        error: "Mata pelajaran dan topik/materi ujian wajib diisi.",
      });
    }

    const kelasNum = parseInt(kelas) || 1;
    let optionRulePrompt = "";

    // Strictly enforce Ministry of Education & Ministry of Religious Affairs (Madrasah) Option Standards:
    if (tingkatSekolah === 'SD/MI' && kelasNum <= 3) {
      optionRulePrompt = "ATURAN WAJIB PILIHAN GANDA (SD/MI KELAS 1-3): Setiap soal pilihan ganda HANYA MEMILIKI 3 OPSI (A, B, C). Dilarang menyajikan opsi D atau E.";
    } else if ((tingkatSekolah === 'SD/MI' && kelasNum >= 4) || tingkatSekolah === 'SMP/MTs') {
      optionRulePrompt = "ATURAN WAJIB PILIHAN GANDA (SD/MI KELAS 4-6 & SMP/MTS): Setiap soal pilihan ganda WAJIB MEMILIKI 4 OPSI (A, B, C, D). Dilarang menyajikan opsi E.";
    } else {
      // SMA / MA / SMK
      optionRulePrompt = "ATURAN WAJIB PILIHAN GANDA (SMA/MA/SMK): Setiap soal pilihan ganda WAJIB MEMILIKI 5 OPSI (A, B, C, D, E).";
    }

    const ai = getGeminiClient();

    const prompt = `
Anda adalah Tim Penulis Soal dan Asesmen Resmi Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi (Kemendikbudristek) & Kementerian Agama (Kemenag RI - Madrasah).
Tugas Anda adalah membuat ${jumlahSoal || 5} paket soal ujian Kurikulum Merdeka yang memenuhi kaidah penulisan soal nasional.

Data Spesifikasi Ujian:
- Mata Pelajaran: ${mataPelajaran}
- Jenjang Sekolah / Madrasah: ${tingkatSekolah || 'SMP/MTs'}
- Kelas: Kelas ${kelas}
- Topik / Materi Ujian: ${materiPokok}
- Tingkat Kesulitan: ${tingkatKesulitan || 'HOTS (C4-C6)'}
- Jenis Soal: ${jenisSoal || 'Pilihan Ganda'}
- Jumlah Soal: ${jumlahSoal || 5} Soal
- Tujuan Pembelajaran (jika ada): ${tujuanPembelajaran || 'Sesuai Capaian Pembelajaran'}

REGULASI RESMI PENULISAN SOAL KEMENDIKBUD & KEMENAG:
1. ${optionRulePrompt}
2. Setiap soal atau pertanyaan harus sangat "to the point", lugas, padat, dan tidak bertele-tele. Jika memerlukan stimulus/wacana naratif, buatlah sesingkat dan seefektif mungkin (maksimal 1-2 kalimat pendek).
3. Pertanyaan harus fokus langsung mengukur keterampilan tingkat berpikir (${tingkatKesulitan || 'HOTS C4-C6'}).
4. Setiap soal dilengkapi Kunci Jawaban yang singkat (hanya huruf opsi, misal "A"), Level Kognitif (misal "C4"), dan rubrikAtauPembahasan yang sangat ringkas, padat, langsung to the point menjelaskan alasan jawaban (maksimal 1 kalimat singkat saja).

Sajikan output dalam format JSON dengan struktur:
{
  "judul": "PAKET SOAL: ${materiPokok.toUpperCase()}",
  "mataPelajaran": "${mataPelajaran}",
  "kelasFase": "${tingkatSekolah} Kelas ${kelas}",
  "materi": "${materiPokok}",
  "soalList": [
    {
      "no": 1,
      "stimulus": "Stimulus singkat (opsional, maks 1-2 kalimat pendek jika sangat dibutuhkan)...",
      "pertanyaan": "Pertanyaan soal yang langsung to the point...",
      "pilihanGanda": {
        "A": "Pilihan A",
        "B": "Pilihan B",
        "C": "Pilihan C"
        // sertakan "D" jika 4/5 opsi, sertakan "E" jika 5 opsi
      },
      "kunciJawaban": "A / B / C ...",
      "levelKognitif": "C4 (Analisis)",
      "rubrikAtauPembahasan": "Penjelasan singkat to the point (maks 1 kalimat)..."
    }
  ]
}
`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah pakar penulisan soal ujian Kemendikbudristek & Kemenag Kurikulum Merdeka.",
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Error generating Soal HOTS:", error);
    res.status(500).json({ error: formatGeminiError(error, "Gagal membuat Paket Soal.") });
  }
});

// Helper to credit quota on successful payment
async function handlePaymentSuccess(orderId: string, email: string) {
  if (!supabaseAdmin) {
    console.error("Supabase Admin client not initialized.");
    return false;
  }

  const cleanEmail = email.toLowerCase().trim();

  // Prevent double crediting using midtrans_transactions table if it exists
  try {
    const { data: existingTx } = await supabaseAdmin
      .from('midtrans_transactions')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existingTx && (existingTx.status === 'settlement' || existingTx.status === 'capture')) {
      console.log(`Transaction ${orderId} already processed.`);
      return true;
    }
  } catch (txErr) {
    console.warn("Could not check midtrans_transactions:", txErr);
  }

  // Get current profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (profileError || !profile) {
    console.error(`User profile not found for email ${cleanEmail}:`, profileError);
    return false;
  }

  // Update profile adding 3 modul and 3 lkpd
  const updated = {
    modul_ajar: (profile.modul_ajar || 0) + 3,
    max_modul_ajar: (profile.max_modul_ajar || 0) + 3,
    lkpd: (profile.lkpd || 0) + 3,
    max_lkpd: (profile.max_lkpd || 0) + 3,
    soal_hots: (profile.soal_hots || 0),
    max_soal_hots: (profile.max_soal_hots || 0),
    status_plan: 'Pro Member',
    updated_at: new Date().toISOString()
  };

  const { error: updateError } = await supabaseAdmin
    .from('user_profiles')
    .update(updated)
    .eq('email', cleanEmail);

  if (updateError) {
    console.error(`Failed to update user quota for ${cleanEmail}:`, updateError);
    return false;
  }

  // Record/Upsert to midtrans_transactions log table
  try {
    await supabaseAdmin
      .from('midtrans_transactions')
      .upsert({
        order_id: orderId,
        email: cleanEmail,
        amount: 6000,
        status: 'settlement',
        created_at: new Date().toISOString()
      });
  } catch (txErr) {
    console.warn("Could not write transaction log to midtrans_transactions table:", txErr);
  }

  console.log(`Successfully credited 6 quota (3 Modul + 3 LKPD) to ${cleanEmail} for order ${orderId}`);
  return true;
}

// 1. Endpoint: Create Midtrans Transaction
app.post("/api/midtrans/create-transaction", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const orderId = `MDT-GURU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    
    const snapUrl = isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const base64Key = Buffer.from(serverKey + ":").toString("base64");

    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: 6000
      },
      item_details: [
        {
          id: "KETENGAN_6K",
          price: 6000,
          quantity: 1,
          name: "Paket Ketengan Guru (3 Modul + 3 LKPD)"
        }
      ],
      customer_details: {
        first_name: name || email.split("@")[0],
        email: email
      },
      // Batasi hanya menerima QRIS, GoPay, ShopeePay, Dana, dan OVO
      enabled_payments: ["qris", "gopay", "shopeepay", "dana", "ovo"],
      custom_field1: email,
      custom_field2: "add_quota_ketengan_6k"
    };

    const response = await fetch(snapUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${base64Key}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Midtrans Snap API error:", errText);
      return res.status(response.status).json({ error: "Gagal membuat transaksi ke Midtrans" });
    }

    const data = await response.json();
    
    // Save to midtrans_transactions log table as 'pending'
    if (supabaseAdmin) {
      try {
        await supabaseAdmin
          .from('midtrans_transactions')
          .upsert({
            order_id: orderId,
            email: email.toLowerCase().trim(),
            amount: 6000,
            status: 'pending',
            created_at: new Date().toISOString()
          });
      } catch (txErr) {
        console.warn("Could not log pending transaction:", txErr);
      }
    }

    res.json({
      token: data.token,
      redirectUrl: data.redirect_url,
      clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
      isProduction
    });

  } catch (error: any) {
    console.error("Create transaction error:", error);
    res.status(500).json({ error: "Terjadi kesalahan internal." });
  }
});

// 2. Endpoint: Midtrans Notification Webhook
app.post("/api/midtrans/notification", async (req, res) => {
  try {
    const notification = req.body;
    const { order_id, transaction_status, fraud_status, custom_field1 } = notification;

    console.log(`Midtrans notification received for order: ${order_id}, status: ${transaction_status}`);

    // Verify signature
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const statusCode = notification.status_code;
    const grossAmount = notification.gross_amount;
    const signatureKey = notification.signature_key;

    const calculated = crypto
      .createHash("sha512")
      .update(`${order_id}${statusCode}${grossAmount}${serverKey}`)
      .digest("hex");

    if (calculated !== signatureKey) {
      console.warn("Invalid signature key for Midtrans notification");
      return res.status(403).json({ error: "Invalid signature" });
    }

    // Save transaction status
    if (supabaseAdmin) {
      try {
        await supabaseAdmin
          .from('midtrans_transactions')
          .upsert({
            order_id,
            email: custom_field1 ? custom_field1.toLowerCase().trim() : "unknown",
            amount: Math.round(Number(grossAmount)),
            status: transaction_status,
            created_at: new Date().toISOString()
          });
      } catch (txErr) {
        console.warn("Could not update transaction log in webhook:", txErr);
      }
    }

    // Process successful payments
    const isSuccess =
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept");

    if (isSuccess && custom_field1) {
      await handlePaymentSuccess(order_id, custom_field1);
    }

    res.json({ status: "OK" });
  } catch (error: any) {
    console.error("Notification Webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. Endpoint: Check Midtrans Status directly with Midtrans API (Polling/Verify)
app.get("/api/midtrans/status/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";

    const statusUrl = isProduction
      ? `https://api.midtrans.com/v2/${orderId}/status`
      : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

    const base64Key = Buffer.from(serverKey + ":").toString("base64");

    const response = await fetch(statusUrl, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${base64Key}`
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Gagal memeriksa status ke Midtrans" });
    }

    const data = await response.json();
    const { transaction_status, fraud_status, custom_field1 } = data;

    const isSuccess =
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept");

    if (isSuccess && custom_field1) {
      const credited = await handlePaymentSuccess(orderId, custom_field1);
      return res.json({ success: true, status: transaction_status, credited });
    }

    res.json({ success: false, status: transaction_status });
  } catch (error: any) {
    console.error("Check status error:", error);
    res.status(500).json({ error: "Terjadi kesalahan internal" });
  }
});

// 4. Endpoint: Check Latest Pending Trans untuk User (Mencegah kendala kehilangan notification webhook)
app.get("/api/midtrans/status/latest", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database Admin not initialized" });
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // Ambil daftar transaksi pending teranyar
    const { data: pendingTxs, error: dbError } = await supabaseAdmin
      .from('midtrans_transactions')
      .select('*')
      .eq('email', cleanEmail)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (dbError || !pendingTxs || pendingTxs.length === 0) {
      return res.json({ success: false, status: 'none', message: "Tidak ada transaksi pending." });
    }

    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const base64Key = Buffer.from(serverKey + ":").toString("base64");

    // Loop & cek status masing-masing di Midtrans
    for (const tx of pendingTxs) {
      const orderId = tx.order_id;
      const statusUrl = isProduction
        ? `https://api.midtrans.com/v2/${orderId}/status`
        : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

      try {
        const response = await fetch(statusUrl, {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Basic ${base64Key}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const { transaction_status, fraud_status } = data;

          const isSuccess =
            transaction_status === "settlement" ||
            (transaction_status === "capture" && fraud_status === "accept");

          if (isSuccess) {
            const credited = await handlePaymentSuccess(orderId, cleanEmail);
            return res.json({ success: true, status: transaction_status, credited, orderId });
          } else if (transaction_status !== 'pending') {
            // Update status non-pending di database agar tidak dicheck terus-menerus
            await supabaseAdmin
              .from('midtrans_transactions')
              .update({ status: transaction_status })
              .eq('order_id', orderId);
          }
        }
      } catch (err) {
        console.warn(`Gagal mencocokkan status order ${orderId} dari Midtrans:`, err);
      }
    }

    res.json({ success: false, status: 'pending', message: "Transaksi masih pending." });
  } catch (error: any) {
    console.error("Latest status check error:", error);
    res.status(500).json({ error: "Terjadi kesalahan internal" });
  }
});

export { app };

// Start Express Server with Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.NETLIFY && !process.env.LAMBDA_TASK_ROOT && !process.env.VERCEL && !process.env.VERCEL_ENV) {
  startServer();
}

