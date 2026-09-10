import express from "express";
import cors from "cors";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Enable CORS for all routes to support external requests from Netlify
app.use(cors());

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
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

// Candidate models in order of priority
const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.1-pro-preview",
];

async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: string;
    config?: any;
  }
) {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || "";
      console.warn(`Gemini model '${model}' error:`, errMsg);
      
      // Always try next model in the candidate list for maximum robustness
      continue;
    }
  }

  throw lastError;
}

function formatGeminiError(error: any, defaultMsg: string): string {
  const errMsg = error?.message || "";
  if (
    errMsg.includes("429") ||
    errMsg.includes("RESOURCE_EXHAUSTED") ||
    errMsg.includes("quota") ||
    errMsg.includes("Rate limit")
  ) {
    return "Layanan AI sedang menerima antrian tinggi (batas kuota tercapai). Silakan tunggu sekitar 30 detik dan coba generate kembali.";
  }
  if (
    errMsg.includes("503") ||
    errMsg.includes("UNAVAILABLE") ||
    errMsg.includes("high demand")
  ) {
    return "Server AI sedang sibuk sementara karena lonjakan trafik. Silakan tunggu beberapa saat dan coba lagi.";
  }
  return error?.message || defaultMsg;
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

    const ai = getGeminiClient();

    let jenisAktivitasText = "";
    let instruksiKhususAktivitas = "";

    if (jenisAktivitas === "praktikum") {
      jenisAktivitasText = "Praktikum / Eksperimen / Panduan Lab Ilmiah";
      instruksiKhususAktivitas = `
- LKPD ini adalah TIPE PRAKTIKUM/EKSPERIMEN (Hands-on).
- Bagian orientasiMasalah harus berisi fenomena ilmiah/studi kasus/permasalahan kontekstual yang memicu eksperimen atau investigasi ilmiah.
- Bagian langkahLangkah harus berupa panduan prosedur kerja ilmiah yang runtut, termasuk daftar alat & bahan yang dibutuhkan, serta langkah-langkah uji coba.
- Lembar kerja siswa harus berisi pertanyaan yang membimbing siswa menyusun tabel data pengamatan dan menarik kesimpulan berdasarkan data eksperimen tersebut.
      `;
    } else if (jenisAktivitas === "proyek") {
      jenisAktivitasText = "Produk / Proyek Kreatif Berkelompok";
      instruksiKhususAktivitas = `
- LKPD ini adalah TIPE PRODUK/PROYEK KREATIF (PjBL).
- Bagian orientasiMasalah berisi tantangan nyata atau masalah sosial/lingkungan yang harus diselesaikan dengan membuat produk (misalnya: poster, infografis, video edukasi, maket, kampanye sosial, atau produk fisik).
- Bagian langkahLangkah harus berupa tahapan proyek yang jelas: Pembentukan kelompok, Perencanaan desain/sketsa produk, Jadwal pembuatan, Eksekusi produk, dan Presentasi/Pameran hasil karya.
- Lembar kerja siswa berisi rancangan rencana kelompok, panduan pembagian peran, checklist progres, dan draf draf rubrik penilaian karya mandiri.
      `;
    } else {
      jenisAktivitasText = "Konseptual / Diskusi Kasus (Isian)";
      instruksiKhususAktivitas = `
- LKPD ini adalah TIPE KONSEPTUAL/DISKUSI KASUS (PBL/Discovery).
- Bagian orientasiMasalah berisi teks wacana bacaan, studi kasus, atau fenomena kontekstual yang melatih literasi dan penalaran kritis siswa.
- Bagian langkahLangkah berisi petunjuk diskusi kelompok atau analisis mandiri untuk memecahkan kasus tersebut.
- Lembar kerja berisi 5-7 pertanyaan isian bertingkat (LotS ke HotS) yang melatih pemahaman konsep, analisis sebab-akibat, dan evaluasi solusi.
      `;
    }

    const prompt = `
Anda adalah Pakar Pengembang Kurikulum dan Bahan Ajar Resmi Kurikulum Merdeka Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi (Kemendikbudristek) dan Kementerian Agama (Kemenag - Madrasah) Indonesia.
Tugas Anda adalah menyusun Lembar Kerja Peserta Didik (LKPD) yang sangat terstruktur, kontekstual, inklusif, berpusat pada peserta didik (student-centered), dan dioptimalkan khusus untuk jenis aktivitas yang dipilih.

Data Input LKPD:
- Jenjang Sekolah / Madrasah: ${tingkatSekolah || 'SD/MI / SMP/MTs / SMA/MA/SMK'}
- Kelas: Kelas ${kelas || 'Sesuai Fase'} (${fase || 'Fase A/B/C/D/E/F'})
- Mata Pelajaran: ${mataPelajaran}
- Materi Pokok / Topik: ${materiPokok}
- Model Pembelajaran: ${modelPembelajaran || 'Discovery Learning / Problem Based Learning'}
- Tujuan Pembelajaran (TP): ${tujuanPembelajaran}
- Tipe LKPD / Jenis Aktivitas: ${jenisAktivitasText}

Instruksi Khusus Sesuai Tipe LKPD:
${instruksiKhususAktivitas}

Persyaratan Regulasi & Struktur LKPD:
1. Mengacu pada Keputusan Kepala BSKAP Kemendikbudristek No. 032/H/KR/2024 & Panduan Pembelajaran Kemenag tentang Kurikulum Merdeka.
2. Identitas Lengkap (Judul menarik, Sub Judul, Alokasi Waktu misal 2x45 menit, Petunjuk penggunaan yang jelas).
3. Tujuan Pembelajaran (3-5 poin rasional sesuai TP input).
4. Materi Ringkas / Orientasi Masalah: Teks wacana kontekstual yang relevan dan dekat dengan kehidupan sehari-hari siswa / Profil Pelajar Pancasila, beserta kata kunci utama.
5. Kegiatan Siswa berbasis sintaks Model Pembelajaran (${modelPembelajaran || 'PBL/PjBL'}):
   - Lembar Kerja Interaktif berisi 5-7 pertanyaan bertingkat yang membimbing siswa secara kolaboratif atau mandiri.
6. Soal Refleksi Siswa (3 pertanyaan reflektif).
7. CATATAN PENTING: DILARANG keras membuat kunci jawaban atau rubrik guru agar output sangat fokus bagi peserta didik dan sangat hemat token.

Berikan output dalam format JSON sesuai schema.
`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah pakar pembuat Lembar Kerja Peserta Didik (LKPD) resmi Kemendikbudristek & Kemenag Kurikulum Merdeka.",
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

    const ai = getGeminiClient();

    const paiElementPrompt = elemenCPPAI && elemenCPPAI.trim() !== ''
      ? `\n- ELEMEN CAPAIAN PEMBELAJARAN (BSKAP 032/034 PAI & BP): ${elemenCPPAI}. Sesuaikan seluruh materi, indikator, dan asesmen secara spesifik dengan Elemen CP PAI & BP ini.`
      : '';

    const tpPrompt = tujuanPembelajaran && tujuanPembelajaran.trim() !== ''
      ? `\n- TUJUAN PEMBELAJARAN (TP) DARI GURU: "${tujuanPembelajaran}". Wajib dicantumkan dan diuraikan ke dalam langkah kegiatan inti dan asesmen.`
      : '\n- TUJUAN PEMBELAJARAN (TP): Susun 3-4 Tujuan Pembelajaran yang spesifik, terukur, berfokus pada HOTS (Analisis, Evaluasi, Kreasi), serta selaras dengan Capaian Pembelajaran Kurikulum Merdeka BSKAP 032/034.';

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
- Alokasi Waktu: ${alokasiWaktu || '2 x 45 Menit'}${paiElementPrompt}
- Topik Pembelajaran: ${materiPokok}${tpPrompt}
- Model Pembelajaran: ${modelPembelajaran || 'Problem Based Learning (PBL) / Discovery Learning'}

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
    "alokasiWaktu": "${alokasiWaktu || '2 x 45 Menit'}",
    "cp": "Rumusan Capaian Pembelajaran (CP) resmi Kurikulum Merdeka yang relevan untuk mapel dan fase ini...",
    "elemen": "${elemenCPPAI || 'Elemen Capaian Pembelajaran mapel ini'}",
    "topik": "${materiPokok}",
    "materi": "${materiPokok}",
    "kompetensiAwal": "Uraian pengetahuan/keterampilan awal yang perlu dimiliki peserta didik sebelum mempelajari materi ini...",
    "prasyarat": "Uraian prasyarat pengetahuan dan keterampilan dasar yang harus dikuasai siswa...",
    "materiUtama": "Rincian poin-poin materi utama yang dibahas...",
    "metode": "Diskusi Kelompok, Tanya Jawab, Ceramah Interaktif, Demonstrasi, Presentasi",
    "targetPesertaDidik": "Peserta didik reguler/tipikal dan peserta didik dengan pencapaian tinggi",
    "jumlahSiswa": "Maksimum 36-40 Siswa",
    "modelPembelajaran": "${modelPembelajaran || 'Problem Based Learning (PBL)'}"
  },
  "komponenInti": {
    "tujuanPembelajaran": [
      "1. Peserta didik mampu menganalisis...",
      "2. Peserta didik mampu menjelaskan...",
      "3. Peserta didik mampu menyajikan..."
    ],
    "pemahamanBermakna": [
      "Pemahaman mendalam dan penerapan nyata materi ini dalam kehidupan sehari-hari..."
    ],
    "pertanyaanPemantik": [
      "1. Mengapa materi ini penting dalam kehidupan kita?",
      "2. Bagaimana sikap kita ketika menghadapi situasi tersebut?"
    ],
    "persiapanPembelajaran": [
      "1. Menyiapkan bahan ajar, slide presentasi, dan LKPD.",
      "2. Menyiapkan media proyektor, papan tulis, dan kelompok belajar."
    ],
    "kegiatanPembelajaran": {
      "pendahuluan": [
        "1. Guru mengucapkan salam dan meminta salah satu siswa memimpin doa.",
        "2. Guru mengecek kehadiran dan kesiapan belajar siswa.",
        "3. Guru melakukan apersepsi dan menyampaikan tujuan pembelajaran serta pertanyaan pemantik."
      ],
      "waktuPendahuluan": "15",
      "inti": [
        "1. Orientasi peserta didik pada masalah...",
        "2. Mengorganisasikan peserta didik untuk belajar...",
        "3. Membimbing penyelidikan individu maupun kelompok...",
        "4. Mengembangkan dan menyajikan hasil karya / presentasi...",
        "5. Menganalisis dan mengevaluasi proses pemecahan masalah..."
      ],
      "waktuInti": "60",
      "penutup": [
        "1. Guru bersama peserta didik menyimpulkan poin utama pembelajaran.",
        "2. Guru dan peserta didik melakukan refleksi proses pembelajaran.",
        "3. Guru menyampaikan arahan materi pertemuan berikutnya dan menutup dengan doa."
      ],
      "waktuPenutup": "15"
    },
    "asesmen": {
      "diagnostik": "Asesmen non-kognitif (kesiapan belajar) dan kognitif awal sebelum pembelajaran.",
      "formatif": "Observasi diskusi kelompok, keaktifan bertanya, dan kelengkapan lembar kerja.",
      "sumatif": "Tes tertulis / penugasan produk di akhir unit materi."
    },
    "pengayaanDanRemedial": {
      "pengayaan": "Peserta didik yang telah mencapai KKTP diberikan tugas pendalaman berupa analisis kasus nyata / proyek mandiri.",
      "remedial": "Peserta didik yang belum mencapai KKTP diberikan pembelajaran ulang, bimbingan perorangan, dan tes perbaikan."
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
    res.json(JSON.parse(text));
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

if (!process.env.NETLIFY && !process.env.LAMBDA_TASK_ROOT && !process.env.VERCEL) {
  startServer();
}

