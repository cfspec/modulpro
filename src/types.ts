export type TabType = 'lkpd' | 'modul' | 'hots' | 'riwayat';

export interface LKPDFormData {
  tingkatSekolah: string;
  kelas: string;
  fase: string;
  mataPelajaran: string;
  materiPokok: string;
  modelPembelajaran: string;
  tujuanPembelajaran: string;
  jenisAktivitas?: string; // 'konseptual' | 'praktikum' | 'proyek'
}

export interface LKPDQuestion {
  no: number;
  pertanyaan: string;
  petunjukIsian?: string;
  ruangJawabanType: 'text' | 'textarea' | 'checklist' | 'tabel' | 'pilihan_ganda';
  opsiPilihan?: string[];
  kolomTabel?: { headers: string[]; rowCount: number };
}

export interface RubrikItem {
  aspek: string;
  skor4: string;
  skor3: string;
  skor2: string;
  skor1: string;
}

export interface KunciJawabanItem {
  no: number;
  jawabanSingkat: string;
  penjelasanDetail: string;
}

export interface LKPDGenerated {
  id: string;
  createdDate: string;
  identitas: {
    judul: string;
    subJudul: string;
    mataPelajaran: string;
    tingkatKelasFase: string;
    alokasiWaktu: string;
    modelPembelajaran: string;
    petunjukPenggunaan: string[];
  };
  tujuanPembelajaran: string[];
  materiRingkas: {
    orientasiMasalah: string;
    pembahasanUtama: string;
    kataKunci: string[];
  };
  kegiatanSiswa: {
    namaKegiatan: string;
    jenisKegiatan: string;
    langkahLangkah: string[];
    lembarKerja: LKPDQuestion[];
  };
  soalRefleksi: string[];
  rubrikPenilaian?: RubrikItem[];
  kunciJawabanDanPembahasan?: KunciJawabanItem[];
}

export interface ModulAjarFormData {
  namaGuru: string;
  sekolah: string;
  tahunPembuatan: string;
  mataPelajaran: string;
  tingkatSekolah: string;
  kelas: string;
  fase: string;
  alokasiWaktu: string;
  elemenCPPAI?: string; // Elemen CP 032/034 BSKAP PAI & BP
  materiPokok: string; // Topik Pembelajaran
  tujuanPembelajaran: string; // Tujuan Pembelajaran dari guru
  modelPembelajaran: string;
}

export interface ModulAjarGenerated {
  informasiUmum: {
    penyusun: string;
    instansi: string;
    tahun: string;
    mapel: string;
    jenjang: string;
    kelas: string;
    fase: string;
    alokasiWaktu: string;
    cp: string;
    elemen?: string;
    topik: string;
    materi: string;
    kompetensiAwal: string;
    prasyarat: string;
    materiUtama: string;
    metode: string;
    targetPesertaDidik: string;
    jumlahSiswa: string;
    modelPembelajaran: string;
  };
  komponenInti: {
    tujuanPembelajaran: string[];
    pemahamanBermakna: string[];
    pertanyaanPemantik: string[];
    persiapanPembelajaran: string[];
    kegiatanPembelajaran: {
      pendahuluan: string[];
      waktuPendahuluan: string;
      inti: string[];
      waktuInti: string;
      penutup: string[];
      waktuPenutup: string;
    };
    asesmen: {
      diagnostik: string;
      formatif: string;
      sumatif: string;
    };
    pengayaanDanRemedial: {
      pengayaan: string;
      remedial: string;
    };
  };
  lampiran: {
    glosarium: string[];
    daftarPustaka: string[];
  };
}

export interface SoalHOTSFormData {
  mataPelajaran: string;
  tingkatSekolah: string; // 'SD/MI' | 'SMP/MTs' | 'SMA/MA/SMK'
  kelas: string;
  materiPokok: string; // Topik / Materi Ujian
  tingkatKesulitan: string; // 'Mudah' | 'Sedang (C3)' | 'HOTS (C4-C6)' | 'Campuran'
  jenisSoal: string; // 'Pilihan Ganda' | 'Uraian / Isian' | 'Pilihan Ganda Kompleks' | 'Campuran'
  jumlahSoal: number; // 5 | 10 | 15 | 20
  tujuanPembelajaran?: string;
}

export interface SoalHOTSItem {
  no: number;
  stimulus: string;
  pertanyaan: string;
  pilihanGanda?: { A: string; B: string; C: string; D?: string; E?: string };
  kunciJawaban: string;
  levelKognitif: string;
  rubrikAtauPembahasan: string;
}

export interface SoalHOTSGenerated {
  judul: string;
  mataPelajaran: string;
  kelasFase: string;
  materi: string;
  soalList: SoalHOTSItem[];
}

export interface UserQuota {
  modulAjar: number;
  lkpd: number;
  soalHots: number;
  maxModulAjar: number;
  maxLkpd: number;
  maxSoalHots: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  schoolName?: string;
  statusPlan: 'Free Trial' | 'Pro Member' | 'Guru Sultan';
  quota: UserQuota;
  joinedDate: string;
}

export interface PaymentPackage {
  id: string;
  name: string;
  price: number;
  priceLabel: string;
  quotaModul: number;
  quotaLKPD: number;
  quotaHOTS: number;
  popular?: boolean;
  features: string[];
}

