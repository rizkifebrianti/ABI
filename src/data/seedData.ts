import type { ExamPackage, ExamResult } from '../types/cat';

export const DEFAULT_FIREBASE_URL = '';

export const STORAGE_KEYS = {
  PACKAGES: 'cat_bahasa_indonesia_packages_v1',
  RESULTS: 'cat_bahasa_indonesia_results_v1',
  FIREBASE_URL: 'cat_bahasa_indonesia_firebase_url_v1'
} as const;

export const INITIAL_PACKAGES: ExamPackage[] = [
  {
    id: 'pkg-snbt-literasi-01',
    title: 'Tryout UTBK-SNBT: Literasi Teks & Kaidah EYD Edisi V',
    category: 'UTBK / SNBT',
    duration: 25,
    token: 'SNBT2026',
    status: 'Published',
    showExplanation: true,
    createdAt: '2026-03-01T08:00:00.000Z',
    questions: [
      {
        id: 'q-snbt-1',
        passage: `<p>Perkembangan teknologi kecerdasan artifisial atau <i>artificial intelligence</i> (AI) telah mengubah lanskap penulisan akademik di perguruan tinggi. Banyak mahasiswa memanfaatkan perangkat lunak pemrosesan bahasa alami untuk menyusun kerangka tulisan maupun melakukan parafrasa otomatis.</p><p>Namun, Badan Pengembangan dan Pembinaan Bahasa mengingatkan bahwa ketergantungan penuh pada mesin penerjemah sering memicu pelanggaran kaidah <u>Ejaan Bahasa Indonesia yang Disempurnakan (EYD) Edisi V</u>. Istilah asing yang belum diserap sepenuhnya wajib dicetak <i>miring</i>, sedangkan kata serapan yang telah baku harus ditulis sesuai pedoman tanpa tanda petik maupun cetak miring.</p>`,
        question: `Berdasarkan wacana di atas, penulisan kalimat yang <b>PALING TEPAT</b> sesuai kaidah EYD Edisi V adalah ....`,
        options: {
          A: `Para mahasiswa sedang mengikuti <i>workshop</i> penulisan artikel ilmiah di perpustakaan pusat.`,
          B: `Pemanfaatan <b>artificial intelligence</b> dalam riset harus diawasi secara ketat oleh dosen pembimbing.`,
          C: `Tim peneliti melakukan <u>analisa</u> data menggunakan perangkat lunak <i>open source</i> terbaru.`,
          D: `Seluruh peserta seminar wajib mengunggah salindia presentasi melalui tautan daring sebelum acara dimulai.`,
          E: `Ia mengunduh jurnal internasional tersebut melalui jaringan <i>wi-fi</i> kampus kemarin sore.`
        },
        correctAnswer: 'D',
        explanation: `Opsi <b>D</b> tepat karena kata <b>salindia</b> (padanan resmi <i>slide</i>) dan <b>daring</b> sudah baku dalam KBBI sehingga tidak perlu dicetak miring. Pada opsi A dan E, istilah asing <i>workshop</i> dan <i>wi-fi</i> sebaiknya dipadankan (<i>lokakarya</i> dan <i>nirkabel</i>); opsi B menggunakan cetak tebal alih-alih miring untuk istilah asing; opsi C menggunakan bentuk tidak baku <i>analisa</i> (seharusnya <b>analisis</b>).`
      },
      {
        id: 'q-snbt-2',
        passage: `<p>Perkembangan teknologi kecerdasan artifisial atau <i>artificial intelligence</i> (AI) telah mengubah lanskap penulisan akademik di perguruan tinggi. Banyak mahasiswa memanfaatkan perangkat lunak pemrosesan bahasa alami untuk menyusun kerangka tulisan maupun melakukan parafrasa otomatis.</p><p>Namun, Badan Pengembangan dan Pembinaan Bahasa mengingatkan bahwa ketergantungan penuh pada mesin penerjemah sering memicu pelanggaran kaidah <u>Ejaan Bahasa Indonesia yang Disempurnakan (EYD) Edisi V</u>. Istilah asing yang belum diserap sepenuhnya wajib dicetak <i>miring</i>, sedangkan kata serapan yang telah baku harus ditulis sesuai pedoman tanpa tanda petik maupun cetak miring.</p>`,
        question: `Gagasan utama paragraf kedua pada teks bacaan tersebut adalah ....`,
        options: {
          A: `Larangan penggunaan kecerdasan artifisial bagi mahasiswa tingkat akhir.`,
          B: `Peringatan mengenai potensi pelanggaran kaidah EYD Edisi V akibat ketergantungan pada mesin penerjemah.`,
          C: `Kewajiban mencetak miring seluruh kata serapan dari bahasa Inggris dalam karya ilmiah.`,
          D: `Peran Badan Pengembangan dan Pembinaan Bahasa dalam menciptakan aplikasi parafrasa.`,
          E: `Perbedaan mendasar antara istilah asing dan kata baku dalam Kamus Besar Bahasa Indonesia.`
        },
        correctAnswer: 'B',
        explanation: `Kalimat utama paragraf kedua terletak pada bagian awal (deduktif), yaitu peringatan Badan Bahasa bahwa ketergantungan penuh pada mesin penerjemah memicu pelanggaran kaidah EYD Edisi V.`
      }
    ]
  },
  {
    id: 'pkg-sma-sintaksis-01',
    title: 'Pendalaman Materi SMA: Kalimat Efektif & Makna Imbuhan',
    category: 'SMA',
    duration: 20,
    token: 'SMA2026',
    status: 'Published',
    showExplanation: true,
    createdAt: '2026-03-02T09:30:00.000Z',
    questions: [
      {
        id: 'q-sma-1',
        passage: `<p>Sastra klasik Nusantara menyimpan kekayaan nilai moral yang relevan hingga era modern. Dalam karya sastra Melayu klasik seperti <i>Hikayat Hang Tuah</i>, kesetiaan dan kebijaksanaan tokoh utama sering diuji melalui berbagai konflik istana yang kompleks.</p>`,
        question: `Perhatikan kalimat berikut: <i>"Bagi seluruh siswa-siswi kelas XII diharapkan segera berkumpul di aula utama."</i><br/>Perbaikan yang tepat agar kalimat tersebut menjadi <b>kalimat efektif</b> adalah ....`,
        options: {
          A: `Menghilangkan kata <i>bagi</i> dan mengubah <i>siswa-siswi</i> menjadi <i>siswa</i>.`,
          B: `Mengganti kata <i>diharapkan</i> menjadi <i>mengharapkan</i> tanpa menghapus kata <i>bagi</i>.`,
          C: `Menambahkan tanda koma setelah kata <i>XII</i> agar subjeknya jelas.`,
          D: `Mengubah kata <i>segera</i> menjadi <i>dengan segera</i> untuk penegasan.`,
          E: `Mengganti kata <i>di</i> menjadi <i>pada</i> sebelum kata <i>aula utama</i>.`
        },
        correctAnswer: 'A',
        explanation: `Penggunaan preposisi <i>bagi</i> di awal kalimat menghilangkan fungsi subjek (kalimat menjadi tidak bersubjek). Selain itu, bentuk <i>seluruh siswa-siswi</i> bersifat pleonastis (jamak ganda), sehingga cukup ditulis <b>Seluruh siswa</b>.`
      }
    ]
  },
  {
    id: 'pkg-cpns-twk-01',
    title: 'Simulasi SKD Kedinasan & CPNS: Bahasa Negara & Penalaran Logis',
    category: 'Kedinasan / CPNS',
    duration: 30,
    token: 'CPNS2026',
    status: 'Published',
    showExplanation: true,
    createdAt: '2026-03-03T10:15:00.000Z',
    questions: [
      {
        id: 'q-cpns-1',
        passage: ``,
        question: `Manakah penulisan judul makalah berikut yang <b>SESUAI</b> dengan aturan penggunaan huruf KAPITAL dalam EYD Edisi V?`,
        options: {
          A: `Strategi Penguatan Literasi Digital Di Kalangan Aparatur Sipil Negara`,
          B: `Strategi Penguatan Literasi Digital di Kalangan Aparatur Sipil Negara`,
          C: `Strategi Penguatan Literasi Digital Di kalangan Aparatur Sipil Negara`,
          D: `STRATEGI PENGUATAN LITERASI DIGITAL DI KALANGAN APARATUR SIPIL NEGARA`,
          E: `Strategi penguatan literasi digital di kalangan aparatur sipil negara`
        },
        correctAnswer: 'B',
        explanation: `Sesuai kaidah EYD Edisi V, setiap kata dalam judul ditulis dengan huruf awal kapital, <b>kecuali</b> kata tugas (seperti preposisi <i>di, ke, dari, dalam</i>) yang tidak berada di posisi awal judul.`
      }
    ]
  }
];

export const INITIAL_RESULTS: ExamResult[] = [
  {
    id: 'res-sample-01',
    packageId: 'pkg-snbt-literasi-01',
    packageTitle: 'Tryout UTBK-SNBT: Literasi Teks & Kaidah EYD Edisi V',
    category: 'UTBK / SNBT',
    studentName: 'Alya Putri Maharani',
    studentClass: 'XII IPA 1',
    finishedAt: '2026-03-04T14:20:00.000Z',
    durationUsedSeconds: 780,
    correctCount: 2,
    wrongCount: 0,
    blankCount: 0,
    totalQuestions: 2,
    score: 100,
    violationCount: 0,
    isBanned: false,
    examStatus: '0 kali pelanggaran - Ujian Selesai Normal'
  }
];
