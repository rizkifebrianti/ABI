import React, { useState } from 'react';
import { Search, ArrowRight, ShieldAlert, X, BookOpen } from 'lucide-react';
import type { ExamPackage, PackageCategory } from '../types/cat';

interface StudentPortalProps {
  packages: ExamPackage[];
  onStartExam: (pkg: ExamPackage, studentName: string, studentClass: string) => void;
}

const CATEGORIES: Array<'Semua' | PackageCategory> = [
  'Semua',
  'SMP',
  'SMA',
  'UTBK / SNBT',
  'Kedinasan / CPNS'
];

const CARD_PASTEL_ACCENTS = [
  'bg-[#DCD6FF]', // Pastel Lavender
  'bg-[#BAE6FD]', // Pastel Sky Blue
  'bg-[#BBF7D0]', // Pastel Mint
  'bg-[#FEF08A]' // Pastel Butter
];

export const StudentPortal: React.FC<StudentPortalProps> = ({ packages, onStartExam }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | PackageCategory>('Semua');
  const [loginModalPkg, setLoginModalPkg] = useState<ExamPackage | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const normalizedQuery = searchQuery.toLowerCase().trim();
  const publishedPackages = packages.filter((pkg) => {
    if (pkg.status !== 'Published') return false;
    const matchCat = selectedCategory === 'Semua' || pkg.category === selectedCategory;
    const matchSearch =
      !normalizedQuery ||
      pkg.title.toLowerCase().includes(normalizedQuery) ||
      pkg.category.toLowerCase().includes(normalizedQuery);
    return matchCat && matchSearch;
  });

  const openLoginModal = (pkg: ExamPackage) => {
    setLoginModalPkg(pkg);
    setStudentName('');
    setStudentClass('');
    setTokenInput('');
    setLoginError('');
  };

  const handleSubmitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginModalPkg) return;
    const cleanName = studentName.trim();
    const cleanClass = studentClass.trim();
    const cleanToken = tokenInput.trim().toUpperCase();

    if (!cleanName || !cleanClass || !cleanToken) {
      setLoginError('Nama lengkap, kelas, dan token kuis wajib diisi!');
      return;
    }

    if (cleanToken !== (loginModalPkg.token || '').trim().toUpperCase()) {
      setLoginError('Token kuis tidak cocok! Periksa kembali huruf/angka token dari tutor.');
      return;
    }

    if (!loginModalPkg.questions || loginModalPkg.questions.length === 0) {
      setLoginError('Paket soal ini belum memiliki butir pertanyaan.');
      return;
    }

    const chosenPkg = loginModalPkg;
    setLoginModalPkg(null);
    onStartExam(chosenPkg, cleanName, cleanClass);
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Pastel Neobrutalism Hero Banner */}
      <section className="bg-[#DCD6FF] nb-card-lg rounded-2xl p-6 sm:p-10 text-zinc-900 mb-8 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-extrabold text-zinc-900 mb-3 tracking-wide uppercase">
            <BookOpen className="w-4 h-4 text-zinc-900" aria-hidden="true" />
            <span>Portal Ujian Berbasis Komputer (CAT)</span>
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3 leading-tight text-balance text-zinc-950">
            Asesmen Bahasa Indonesia
          </h1>
          <p className="text-zinc-800 text-sm sm:text-base font-medium leading-relaxed mb-5">
            Pilih paket soal sesuai jenjang belajarmu, masukkan nama lengkap, kelas, dan token dari
            tutor.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-900 bg-[#FEF08A] border-2 border-zinc-900 shadow-[3px_3px_0px_#18181B] rounded-xl px-3.5 py-2.5 w-fit">
            <span className="font-extrabold">Info Simulasi:</span>
            <span>
              Token paket aktif:{' '}
              <code className="bg-white border border-zinc-900 px-1.5 py-0.5 rounded font-mono font-bold text-zinc-950">
                SNBT2026
              </code>
              ,{' '}
              <code className="bg-white border border-zinc-900 px-1.5 py-0.5 rounded font-mono font-bold text-zinc-950">
                SMA2026
              </code>
              ,{' '}
              <code className="bg-white border border-zinc-900 px-1.5 py-0.5 rounded font-mono font-bold text-zinc-950">
                CPNS2026
              </code>
            </span>
          </div>
        </div>
      </section>

      {/* Search & Category Filter Bar */}
      <section className="bg-white nb-card rounded-2xl p-4 sm:p-5 mb-7 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <label htmlFor="portal-search-input" className="sr-only">
              Cari judul paket soal
            </label>
            <Search
              className="w-4 h-4 text-zinc-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="portal-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul paket soal (contoh: Literasi SNBT, EYD V, TWK CPNS)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-zinc-900 bg-[#FAF7F0] focus:bg-white text-sm font-medium focus:shadow-[3px_3px_0px_#18181B] outline-none transition"
            />
          </div>

          <p className="text-xs font-bold text-zinc-700 shrink-0 text-right tabular-nums">
            Menampilkan{' '}
            <strong className="text-zinc-950 underline decoration-2 underline-offset-2" data-testid="portal-package-count">
              {publishedPackages.length}
            </strong>{' '}
            paket aktif
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter kategori jenjang">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 nb-btn-sm ${
                  active
                    ? 'bg-[#FEF08A] text-zinc-950'
                    : 'bg-white text-zinc-800 hover:bg-[#FAF7F0]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Catalog Grid */}
      {publishedPackages.length === 0 ? (
        <div className="bg-white nb-card rounded-2xl p-10 text-center space-y-2">
          <h2 className="text-base font-extrabold text-zinc-950">Tidak Ada Paket Soal Ditemukan</h2>
          <p className="text-xs sm:text-sm text-zinc-600">
            Coba ubah kata kunci pencarian, pilih kategori jenjang lain, atau klik{' '}
            <strong>Refresh Soal</strong>.
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          data-testid="portal-packages-grid"
        >
          {publishedPackages.map((pkg, idx) => {
            const qCount = Array.isArray(pkg.questions) ? pkg.questions.length : 0;
            const accentStrip = CARD_PASTEL_ACCENTS[idx % CARD_PASTEL_ACCENTS.length];
            return (
              <article
                key={pkg.id}
                className="bg-white nb-card rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className={`${accentStrip} border-b-2 border-zinc-900 px-5 py-2.5 flex items-center justify-between text-xs font-extrabold text-zinc-900`}>
                    <span>{pkg.category}</span>
                    <span>Aktif</span>
                  </div>

                  <div className="p-5 sm:p-6">
                    <h2 className="text-lg font-extrabold text-zinc-950 leading-snug mb-4">
                      {pkg.title}
                    </h2>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t-2 border-zinc-900/15 text-xs tabular-nums">
                      <div>
                        <span className="text-zinc-600 font-medium block">Jumlah Soal</span>
                        <strong className="text-zinc-950 text-sm font-extrabold">{qCount} Butir</strong>
                      </div>
                      <div>
                        <span className="text-zinc-600 font-medium block">Durasi Waktu</span>
                        <strong className="text-zinc-950 text-sm font-extrabold">{pkg.duration} Menit</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                  <button
                    type="button"
                    onClick={() => openLoginModal(pkg)}
                    disabled={qCount === 0}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#C4B5FD] hover:bg-[#B39FFB] disabled:bg-zinc-200 text-zinc-950 text-sm font-extrabold nb-btn flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <span>Kerjakan Soal</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Student Login & Token Verification Modal */}
      {loginModalPkg && (
        <div
          className="fixed inset-0 bg-zinc-950/55 z-40 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-modal-title"
        >
          <div className="bg-white nb-card-lg rounded-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="bg-[#DCD6FF] border-b-2 border-zinc-900 px-6 py-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-zinc-800 tabular-nums">
                  {loginModalPkg.category} · {loginModalPkg.questions.length} Soal ·{' '}
                  {loginModalPkg.duration} Menit
                </p>
                <h2
                  id="student-modal-title"
                  className="text-base sm:text-lg font-extrabold text-zinc-950 mt-1 leading-snug"
                >
                  {loginModalPkg.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setLoginModalPkg(null)}
                className="bg-white hover:bg-[#FECDD3] text-zinc-900 p-1.5 rounded-lg nb-btn-sm shrink-0"
                aria-label="Tutup modal masuk ujian"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-[#FEF08A] border-2 border-zinc-900 p-3.5 text-xs text-zinc-950 space-y-1">
                <p className="font-extrabold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Aturan Pengawasan Ujian (Anti-Nyontek):</span>
                </p>
                <p className="leading-relaxed font-medium">
                  Selama ujian berlangsung, siswa{' '}
                  <strong>dilarang membuka tab browser atau aplikasi lain</strong>. Batas toleransi
                  adalah <strong>3 kali pelanggaran</strong>—pada pelanggaran ke-3 ujian akan{' '}
                  <strong>otomatis dibanned dan langsung terkumpul</strong>.
                </p>
              </div>

              <form onSubmit={handleSubmitLogin} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="student-login-name"
                    className="block text-xs font-extrabold text-zinc-900 mb-1"
                  >
                    Nama Lengkap Siswa <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="student-login-name"
                    type="text"
                    required
                    autoFocus
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-zinc-900 bg-[#FAF7F0] focus:bg-white text-sm font-medium focus:shadow-[3px_3px_0px_#18181B] outline-none transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="student-login-class"
                    className="block text-xs font-extrabold text-zinc-900 mb-1"
                  >
                    Kelas <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="student-login-class"
                    type="text"
                    required
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    placeholder="Contoh: XII IPA 2 / Kelas Privat A"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-zinc-900 bg-[#FAF7F0] focus:bg-white text-sm font-medium focus:shadow-[3px_3px_0px_#18181B] outline-none transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="student-login-token"
                    className="block text-xs font-extrabold text-zinc-900 mb-1"
                  >
                    Token Kuis <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="student-login-token"
                    type="text"
                    required
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    placeholder="Masukkan token dari tutor..."
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-zinc-900 bg-[#FAF7F0] focus:bg-white text-sm font-mono font-bold uppercase focus:shadow-[3px_3px_0px_#18181B] outline-none transition"
                  />
                </div>

                {loginError && (
                  <div
                    role="alert"
                    className="text-xs font-bold text-zinc-950 bg-[#FECDD3] border-2 border-zinc-900 rounded-xl px-3.5 py-2.5"
                  >
                    {loginError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2 border-t-2 border-zinc-900/10">
                  <button
                    type="button"
                    onClick={() => setLoginModalPkg(null)}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-900 bg-white hover:bg-[#FAF7F0] nb-btn-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#BBF7D0] hover:bg-[#86EFAC] text-zinc-950 text-sm font-extrabold nb-btn whitespace-nowrap"
                  >
                    Mulai Ujian Sekarang →
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
