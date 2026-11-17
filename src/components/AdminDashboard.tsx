import React, { useState } from 'react';
import {
  Plus,
  Upload,
  Download,
  RefreshCw,
  Trash2,
  Edit3,
  Copy,
  FileSpreadsheet,
  Cloud,
  X
} from 'lucide-react';
import type {
  CloudStatusState,
  ExamPackage,
  ExamResult,
  OptionKey,
  PackageCategory,
  PackageStatus,
  Question
} from '../types/cat';
import {
  formatDateIndo,
  generateRandomToken,
  sanitizeFormattedHtml,
  stripHtmlToText
} from '../utils/htmlSanitizer';
import {
  downloadExcelTemplateFile,
  exportBankJsonFile,
  exportScoresWorkbook,
  parseQuestionsFromFile
} from '../utils/documentParsers';
import { RichTextEditor } from './RichTextEditor';

export type AdminTab = 'packages' | 'import' | 'scores' | 'cloud';

interface AdminDashboardProps {
  packages: ExamPackage[];
  results: ExamResult[];
  cloudStatus: CloudStatusState;
  activeFirebaseUrl: string;
  onNavigatePortal: () => void;
  onLogout: () => void;
  onUpsertPackage: (pkg: ExamPackage) => void;
  onDeletePackage: (pkgId: string) => void;
  onDeleteResult: (resId: string) => void;
  onReplaceAllPackages: (nextPackages: ExamPackage[]) => void;
  onSyncResultsFromCloud: (manual: boolean) => Promise<void>;
  onConnectFirebase: (url: string) => Promise<void>;
  onDisconnectFirebase: () => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const CATEGORIES: PackageCategory[] = ['SMP', 'SMA', 'UTBK / SNBT', 'Kedinasan / CPNS'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  packages,
  results,
  cloudStatus,
  activeFirebaseUrl,
  onNavigatePortal,
  onLogout,
  onUpsertPackage,
  onDeletePackage,
  onDeleteResult,
  onReplaceAllPackages,
  onSyncResultsFromCloud,
  onConnectFirebase,
  onDisconnectFirebase,
  onNotify
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('packages');

  // Package Modal State
  const [pkgModalOpen, setPkgModalOpen] = useState(false);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [pkgTitle, setPkgTitle] = useState('');
  const [pkgCategory, setPkgCategory] = useState<PackageCategory>('UTBK / SNBT');
  const [pkgDuration, setPkgDuration] = useState(30);
  const [pkgToken, setPkgToken] = useState('INDO2026');
  const [pkgStatus, setPkgStatus] = useState<PackageStatus>('Published');
  const [pkgShowExplanation, setPkgShowExplanation] = useState(true);
  const [deletingPkg, setDeletingPkg] = useState<ExamPackage | null>(null);

  // Question Manager State
  const [managingPkgId, setManagingPkgId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qPassage, setQPassage] = useState('');
  const [qText, setQText] = useState('');
  const [qOptA, setQOptA] = useState('');
  const [qOptB, setQOptB] = useState('');
  const [qOptC, setQOptC] = useState('');
  const [qOptD, setQOptD] = useState('');
  const [qOptE, setQOptE] = useState('');
  const [qCorrect, setQCorrect] = useState<OptionKey>('A');
  const [qExplanation, setQExplanation] = useState('');

  // Import Document State
  const [importLoading, setImportLoading] = useState(false);
  const [importedQuestions, setImportedQuestions] = useState<Question[]>([]);
  const [importTargetMode, setImportTargetMode] = useState<'new' | 'existing'>('new');
  const [impTitle, setImpTitle] = useState('');
  const [impCategory, setImpCategory] = useState<PackageCategory>('UTBK / SNBT');
  const [impDuration, setImpDuration] = useState(30);
  const [impToken, setImpToken] = useState('INDO2026');
  const [impStatus, setImpStatus] = useState<PackageStatus>('Published');
  const [impShowExplanation, setImpShowExplanation] = useState(true);
  const [impExistingPkgId, setImpExistingPkgId] = useState<string>(packages[0]?.id || '');

  // Scores Filter State
  const [scoreFilterPkgId, setScoreFilterPkgId] = useState<string>('ALL');

  // Cloud Settings State
  const [cloudUrlInput, setCloudUrlInput] = useState<string>(activeFirebaseUrl);
  const [cloudBusy, setCloudBusy] = useState(false);

  const managingPkg = packages.find((p) => p.id === managingPkgId) || null;

  // ==================== PACKAGE CRUD ====================
  const openCreatePackageModal = () => {
    setEditingPkgId(null);
    setPkgTitle('');
    setPkgCategory('UTBK / SNBT');
    setPkgDuration(30);
    setPkgToken(generateRandomToken());
    setPkgStatus('Published');
    setPkgShowExplanation(true);
    setPkgModalOpen(true);
  };

  const openEditPackageModal = (pkg: ExamPackage) => {
    setEditingPkgId(pkg.id);
    setPkgTitle(pkg.title);
    setPkgCategory(pkg.category);
    setPkgDuration(pkg.duration);
    setPkgToken(pkg.token);
    setPkgStatus(pkg.status);
    setPkgShowExplanation(pkg.showExplanation);
    setPkgModalOpen(true);
  };

  const handleSavePackageForm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = pkgTitle.trim();
    const cleanToken = pkgToken.trim().toUpperCase();
    if (!cleanTitle || !cleanToken) return;

    if (editingPkgId) {
      const existing = packages.find((p) => p.id === editingPkgId);
      if (existing) {
        onUpsertPackage({
          ...existing,
          title: cleanTitle,
          category: pkgCategory,
          duration: Math.max(1, Number(pkgDuration) || 30),
          token: cleanToken,
          status: pkgStatus,
          showExplanation: pkgShowExplanation
        });
        onNotify('Pengaturan paket soal berhasil diperbarui.', 'success');
      }
    } else {
      onUpsertPackage({
        id: `pkg-${Date.now()}`,
        title: cleanTitle,
        category: pkgCategory,
        duration: Math.max(1, Number(pkgDuration) || 30),
        token: cleanToken,
        status: pkgStatus,
        showExplanation: pkgShowExplanation,
        createdAt: new Date().toISOString(),
        questions: []
      });
      onNotify('Paket soal baru berhasil dibuat.', 'success');
    }
    setPkgModalOpen(false);
  };

  // ==================== QUESTION MANAGER ====================
  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setQPassage('');
    setQText('');
    setQOptA('');
    setQOptB('');
    setQOptC('');
    setQOptD('');
    setQOptE('');
    setQCorrect('A');
    setQExplanation('');
  };

  const openQuestionManager = (pkgId: string) => {
    setManagingPkgId(pkgId);
    resetQuestionForm();
  };

  const loadQuestionIntoForm = (q: Question) => {
    setEditingQuestionId(q.id);
    setQPassage(sanitizeFormattedHtml(q.passage));
    setQText(sanitizeFormattedHtml(q.question));
    setQOptA(sanitizeFormattedHtml(q.options?.A || ''));
    setQOptB(sanitizeFormattedHtml(q.options?.B || ''));
    setQOptC(sanitizeFormattedHtml(q.options?.C || ''));
    setQOptD(sanitizeFormattedHtml(q.options?.D || ''));
    setQOptE(sanitizeFormattedHtml(q.options?.E || ''));
    setQCorrect(q.correctAnswer || 'A');
    setQExplanation(sanitizeFormattedHtml(q.explanation || ''));
  };

  const handleCopyPreviousPassage = () => {
    if (!managingPkg || !managingPkg.questions || managingPkg.questions.length === 0) {
      onNotify('Belum ada soal sebelumnya pada paket ini.', 'warning');
      return;
    }

    let targetIdx = managingPkg.questions.length - 1;
    if (editingQuestionId) {
      const curIdx = managingPkg.questions.findIndex((q) => q.id === editingQuestionId);
      if (curIdx > 0) targetIdx = curIdx - 1;
    }

    const prevQ = managingPkg.questions[targetIdx];
    if (!prevQ || !stripHtmlToText(prevQ.passage)) {
      onNotify('Nomor soal sebelumnya tidak memiliki teks bacaan.', 'warning');
      return;
    }

    setQPassage(sanitizeFormattedHtml(prevQ.passage));
    onNotify(`Teks bacaan dari Soal No. ${targetIdx + 1} berhasil disalin.`, 'success');
  };

  const handleSaveManualQuestion = () => {
    if (!managingPkg) return;
    const passage = sanitizeFormattedHtml(qPassage);
    const question = sanitizeFormattedHtml(qText);
    const options = {
      A: sanitizeFormattedHtml(qOptA),
      B: sanitizeFormattedHtml(qOptB),
      C: sanitizeFormattedHtml(qOptC),
      D: sanitizeFormattedHtml(qOptD),
      E: sanitizeFormattedHtml(qOptE)
    };
    const explanation = sanitizeFormattedHtml(qExplanation);

    if (!stripHtmlToText(question)) {
      onNotify('Kolom Pertanyaan wajib diisi!', 'error');
      return;
    }
    if (
      !stripHtmlToText(options.A) ||
      !stripHtmlToText(options.B) ||
      !stripHtmlToText(options.C) ||
      !stripHtmlToText(options.D)
    ) {
      onNotify('Minimal Opsi A, B, C, dan D wajib diisi!', 'error');
      return;
    }
    if (qCorrect === 'E' && !stripHtmlToText(options.E)) {
      onNotify('Kunci jawaban E dipilih, tetapi Opsi E masih kosong!', 'error');
      return;
    }

    const existingQuestions = [...(managingPkg.questions || [])];
    if (editingQuestionId) {
      const idx = existingQuestions.findIndex((item) => item.id === editingQuestionId);
      if (idx >= 0) {
        existingQuestions[idx] = {
          ...existingQuestions[idx],
          passage,
          question,
          options,
          correctAnswer: qCorrect,
          explanation
        };
      }
      onNotify('Perubahan butir soal berhasil disimpan.', 'success');
    } else {
      existingQuestions.push({
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        passage,
        question,
        options,
        correctAnswer: qCorrect,
        explanation
      });
      onNotify('Butir soal baru berhasil ditambahkan ke paket.', 'success');
    }

    onUpsertPackage({ ...managingPkg, questions: existingQuestions });
    resetQuestionForm();
  };

  const handleDeleteQuestion = (qId: string) => {
    if (!managingPkg) return;
    const nextQuestions = (managingPkg.questions || []).filter((q) => q.id !== qId);
    onUpsertPackage({ ...managingPkg, questions: nextQuestions });
    if (editingQuestionId === qId) resetQuestionForm();
    onNotify('Butir soal telah dihapus.', 'info');
  };

  // ==================== DOCUMENT IMPORT ====================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    try {
      const extracted = await parseQuestionsFromFile(file);
      if (!extracted || extracted.length === 0) {
        throw new Error('Tidak ditemukan butir soal yang valid di dalam dokumen tersebut.');
      }
      setImportedQuestions(extracted);
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      setImpTitle(baseName);
      setImpToken(generateRandomToken());
      setImpExistingPkgId(packages[0]?.id || '');
      onNotify(`Berhasil mengekstrak ${extracted.length} soal dari dokumen!`, 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal membaca file dokumen.', 'error');
    } finally {
      setImportLoading(false);
      e.target.value = '';
    }
  };

  const handleConfirmSaveImport = () => {
    if (importedQuestions.length === 0) return;

    if (importTargetMode === 'existing') {
      const target = packages.find((p) => p.id === impExistingPkgId);
      if (!target) {
        onNotify('Pilih paket tujuan terlebih dahulu.', 'error');
        return;
      }
      onUpsertPackage({
        ...target,
        questions: [...(target.questions || []), ...importedQuestions]
      });
      onNotify(
        `${importedQuestions.length} soal berhasil ditambahkan ke paket "${target.title}".`,
        'success'
      );
    } else {
      const cleanTitle = impTitle.trim();
      if (!cleanTitle) {
        onNotify('Judul paket soal baru wajib diisi!', 'error');
        return;
      }
      const newPkg: ExamPackage = {
        id: `pkg-${Date.now()}`,
        title: cleanTitle,
        category: impCategory,
        duration: Math.max(1, Number(impDuration) || 30),
        token: impToken.trim().toUpperCase() || generateRandomToken(),
        status: impStatus,
        showExplanation: impShowExplanation,
        createdAt: new Date().toISOString(),
        questions: [...importedQuestions]
      };
      onUpsertPackage(newPkg);
      onNotify(
        `Paket baru "${cleanTitle}" berisi ${newPkg.questions.length} soal berhasil disimpan!`,
        'success'
      );
    }

    setImportedQuestions([]);
    setActiveTab('packages');
  };

  // ==================== JSON BACKUP ====================
  const handleImportBankJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { packages?: ExamPackage[] } | ExamPackage[];
      const incoming = Array.isArray(parsed) ? parsed : parsed.packages;
      if (!Array.isArray(incoming)) {
        throw new Error('Struktur file JSON tidak valid.');
      }
      onReplaceAllPackages(incoming);
      onNotify(`Berhasil memulihkan ${incoming.length} paket soal dari JSON.`, 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal mengimpor file JSON.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  // ==================== SCORES FILTERING ====================
  const filteredResults =
    scoreFilterPkgId === 'ALL'
      ? results
      : results.filter((r) => r.packageId === scoreFilterPkgId);
  const avgScore =
    filteredResults.length > 0
      ? Math.round(
          filteredResults.reduce((sum, item) => sum + Number(item.score || 0), 0) /
            filteredResults.length
        )
      : 0;
  const bannedCount = filteredResults.filter(
    (item) => item.isBanned || (item.violationCount || 0) >= 3
  ).length;

  // ==================== HOSTING HTML EXPORT ====================
  const handleDownloadHostingConfig = () => {
    const cleanUrl = (cloudUrlInput || activeFirebaseUrl).trim().replace(/\/+$/, '');
    let htmlContent = '<!doctype html>\n' + document.documentElement.outerHTML;
    const injectionScript = cleanUrl
      ? `<script>window.__CAT_DEFAULT_FIREBASE_URL__ = ${JSON.stringify(cleanUrl)};</script>`
      : '';
    if (injectionScript) {
      htmlContent = htmlContent.replace('</head>', `  ${injectionScript}\n  </head>`);
    }
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
    onNotify(
      cleanUrl
        ? 'File index.html dengan koneksi Firebase tertanam berhasil diunduh!'
        : 'File index.html berhasil diunduh!',
      'success'
    );
  };

  return (
    <section className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Admin Header & Sub-Tabs */}
      <div className="bg-white nb-card rounded-2xl p-4 sm:p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b-2 border-zinc-900/15">
          <div>
            <p className="text-xs font-extrabold text-zinc-900 bg-[#FEF08A] border border-zinc-900 px-2 py-0.5 rounded w-fit mb-1.5">
              Mode Administrator Terautentikasi
            </p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950">
              Dashboard Manajemen Bank Soal &amp; Nilai
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onNavigatePortal}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#BAE6FD] hover:bg-[#93DBFD] text-zinc-950 nb-btn-sm whitespace-nowrap"
            >
              Lihat Portal Siswa
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#FECDD3] hover:bg-[#FDA4AF] text-zinc-950 nb-btn-sm whitespace-nowrap"
            >
              Keluar Admin
            </button>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2.5 pt-4" aria-label="Navigasi menu admin">
          {(
            [
              { id: 'packages', label: 'Manajemen Paket & Soal' },
              { id: 'import', label: 'Import Soal (PDF / DOCX / Excel)' },
              { id: 'scores', label: 'Rekap Nilai & Backup Data' },
              { id: 'cloud', label: 'Pengaturan Database Cloud' }
            ] as Array<{ id: AdminTab; label: string }>
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'packages') setManagingPkgId(null);
                  if (tab.id === 'cloud') setCloudUrlInput(activeFirebaseUrl);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold nb-btn-sm whitespace-nowrap ${
                  active
                    ? 'bg-[#DCD6FF] text-zinc-950'
                    : 'bg-white text-zinc-800 hover:bg-[#FAF7F0]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: PACKAGES & QUESTION MANAGER */}
      {activeTab === 'packages' && !managingPkg && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-zinc-950 tabular-nums">
              Daftar Paket Soal ({packages.length})
            </h2>
            <button
              type="button"
              onClick={openCreatePackageModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#BBF7D0] hover:bg-[#86EFAC] text-zinc-950 text-sm font-extrabold nb-btn whitespace-nowrap"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Buat Paket Soal Baru</span>
            </button>
          </div>

          {packages.length === 0 ? (
            <div className="bg-white nb-card rounded-2xl p-10 text-center space-y-2">
              <h3 className="text-base font-extrabold text-zinc-950">Belum Ada Paket Soal</h3>
              <p className="text-xs sm:text-sm text-zinc-600">
                Klik tombol <strong>Buat Paket Soal Baru</strong> atau gunakan fitur{' '}
                <strong>Import Soal</strong>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => {
                const qCount = Array.isArray(pkg.questions) ? pkg.questions.length : 0;
                const statusColors: Record<PackageStatus, string> = {
                  Published: 'bg-[#BBF7D0] text-zinc-950',
                  Draft: 'bg-[#FEF08A] text-zinc-950',
                  Closed: 'bg-[#FECDD3] text-zinc-950'
                };
                return (
                  <article
                    key={pkg.id}
                    className="bg-white nb-card rounded-2xl p-5 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-extrabold text-zinc-900 bg-[#DCD6FF] border border-zinc-900 px-2 py-0.5 rounded">
                          {pkg.category}
                        </span>
                        <select
                          aria-label={`Status paket ${pkg.title}`}
                          value={pkg.status}
                          onChange={(e) => {
                            const nextStatus = e.target.value as PackageStatus;
                            onUpsertPackage({ ...pkg, status: nextStatus });
                            onNotify(`Status paket diubah menjadi "${nextStatus}".`, 'success');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border-2 border-zinc-900 outline-none cursor-pointer ${
                            statusColors[pkg.status]
                          }`}
                        >
                          <option value="Published">Published</option>
                          <option value="Draft">Draft</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>

                      <h3 className="font-extrabold text-base text-zinc-950 leading-snug mb-3">
                        {pkg.title}
                      </h3>

                      <div className="pt-3 border-t-2 border-zinc-900/15 text-xs space-y-1.5 tabular-nums">
                        <div className="flex justify-between">
                          <span className="text-zinc-600 font-medium">Jumlah Butir Soal:</span>
                          <strong className="text-zinc-950 font-extrabold">{qCount} Soal</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 font-medium">Durasi Ujian:</span>
                          <strong className="text-zinc-950 font-extrabold">{pkg.duration} Menit</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-600 font-medium">Token Kuis:</span>
                          <code className="px-2 py-0.5 rounded bg-[#FEF08A] border border-zinc-900 text-zinc-950 font-mono font-bold">
                            {pkg.token}
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t-2 border-zinc-900/15">
                      <button
                        type="button"
                        onClick={() => openQuestionManager(pkg.id)}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#C4B5FD] hover:bg-[#B39FFB] text-zinc-950 text-xs sm:text-sm font-extrabold nb-btn-sm"
                      >
                        Kelola Butir Soal ({qCount})
                      </button>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => openEditPackageModal(pkg)}
                          className="py-2 px-3 rounded-xl bg-white hover:bg-[#FAF7F0] text-zinc-900 text-xs font-bold nb-btn-sm inline-flex items-center justify-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Edit Info</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingPkg(pkg)}
                          className="py-2 px-3 rounded-xl bg-[#FECDD3] hover:bg-[#FDA4AF] text-zinc-950 text-xs font-bold nb-btn-sm inline-flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* QUESTION MANAGER VIEW */}
      {activeTab === 'packages' && managingPkg && (
        <div className="space-y-6">
          <div className="bg-[#DCD6FF] nb-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-zinc-950">
            <div>
              <button
                type="button"
                onClick={() => setManagingPkgId(null)}
                className="text-xs font-extrabold text-zinc-800 hover:underline mb-1 inline-flex items-center gap-1"
              >
                ← Kembali ke Daftar Paket
              </button>
              <h2 className="text-lg sm:text-xl font-extrabold">{managingPkg.title}</h2>
              <p className="text-xs font-bold text-zinc-800 mt-0.5 tabular-nums">
                {managingPkg.category} · {managingPkg.duration} Menit · Token:{' '}
                {managingPkg.token} · Status: {managingPkg.status}
              </p>
            </div>
            <button
              type="button"
              onClick={resetQuestionForm}
              className="px-4 py-2.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-zinc-950 text-xs sm:text-sm font-extrabold nb-btn-sm shrink-0"
            >
              + Tambah Soal Baru
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Manual Question Form */}
            <div className="lg:col-span-7 bg-white nb-card rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b-2 border-zinc-900/15 pb-3">
                <h3 className="font-extrabold text-base text-zinc-950">
                  {editingQuestionId ? 'Edit Butir Soal' : 'Tambah Butir Soal Manual'}
                </h3>
                {editingQuestionId && (
                  <span className="px-2.5 py-0.5 rounded-md border border-zinc-900 text-xs font-extrabold bg-[#FEF08A] text-zinc-950">
                    Mode Edit
                  </span>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="editor-passage" className="text-xs font-extrabold text-zinc-900">
                    Teks Bacaan / Wacana{' '}
                    <span className="text-zinc-500 font-medium">(Opsional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyPreviousPassage}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#BAE6FD] hover:bg-[#93DBFD] text-zinc-950 text-xs font-bold nb-btn-sm"
                  >
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Salin Teks Bacaan dari Nomor Sebelumnya</span>
                  </button>
                </div>
                <RichTextEditor
                  id="editor-passage"
                  value={qPassage}
                  onChange={setQPassage}
                  serif
                  maxHeightClass="max-h-56 overflow-y-auto custom-scroll"
                  placeholder="Ketik atau tempel teks bacaan/wacana di sini. Gunakan tombol toolbar untuk huruf miring (istilah asing/judul), tebal, garis bawah, atau KAPITAL..."
                  onNotify={onNotify}
                />
              </div>

              <div>
                <label
                  htmlFor="editor-question"
                  className="block text-xs font-extrabold text-zinc-900 mb-1.5"
                >
                  Pertanyaan <span className="text-rose-600">*</span>
                </label>
                <RichTextEditor
                  id="editor-question"
                  value={qText}
                  onChange={setQText}
                  placeholder="Tuliskan pokok pertanyaan di sini..."
                  onNotify={onNotify}
                />
              </div>

              <div className="space-y-3">
                <p className="text-xs font-extrabold text-zinc-900">
                  Pilihan Jawaban (A – E){' '}
                  <span className="text-zinc-500 font-medium">(Kosongkan E jika hanya A–D)</span>
                </p>

                {(
                  [
                    { key: 'A', val: qOptA, setter: setQOptA, req: true },
                    { key: 'B', val: qOptB, setter: setQOptB, req: true },
                    { key: 'C', val: qOptC, setter: setQOptC, req: true },
                    { key: 'D', val: qOptD, setter: setQOptD, req: true },
                    { key: 'E', val: qOptE, setter: setQOptE, req: false }
                  ] as const
                ).map((item) => (
                  <div key={item.key} className="space-y-1">
                    <label
                      htmlFor={`editor-opt-${item.key}`}
                      className="text-xs font-extrabold text-zinc-900 block"
                    >
                      Opsi {item.key} {item.req ? '*' : '(Opsional)'}
                    </label>
                    <RichTextEditor
                      id={`editor-opt-${item.key}`}
                      value={item.val}
                      onChange={item.setter}
                      compact
                      placeholder={`Isi pilihan jawaban ${item.key}...`}
                      onNotify={onNotify}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label
                  htmlFor="qform-correct"
                  className="block text-xs font-extrabold text-zinc-900 mb-1.5"
                >
                  Kunci Jawaban Benar <span className="text-rose-600">*</span>
                </label>
                <select
                  id="qform-correct"
                  value={qCorrect}
                  onChange={(e) => setQCorrect(e.target.value as OptionKey)}
                  className="w-full sm:w-48 px-3.5 py-2.5 rounded-xl border-2 border-zinc-900 text-sm font-extrabold bg-[#FEF08A] outline-none"
                >
                  {(['A', 'B', 'C', 'D', 'E'] as OptionKey[]).map((k) => (
                    <option key={k} value={k}>
                      Jawaban: {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="editor-explanation"
                  className="block text-xs font-extrabold text-zinc-900 mb-1.5"
                >
                  Pembahasan Soal
                </label>
                <RichTextEditor
                  id="editor-explanation"
                  value={qExplanation}
                  onChange={setQExplanation}
                  placeholder="Tuliskan penjelasan kaidah EYD V, alasan opsi benar, dan analisis kesalahan opsi lain..."
                  onNotify={onNotify}
                />
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveManualQuestion}
                  className="px-6 py-2.5 rounded-xl bg-[#BBF7D0] hover:bg-[#86EFAC] text-zinc-950 text-sm font-extrabold nb-btn"
                >
                  Simpan Butir Soal
                </button>
                <button
                  type="button"
                  onClick={resetQuestionForm}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF7F0] text-zinc-900 text-sm font-bold nb-btn-sm"
                >
                  Reset Form
                </button>
              </div>
            </div>

            {/* Saved Questions List */}
            <div className="lg:col-span-5 bg-white nb-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b-2 border-zinc-900/15 pb-3">
                <h3 className="font-extrabold text-base text-zinc-950 tabular-nums">
                  Daftar Butir Soal ({managingPkg.questions.length})
                </h3>
              </div>

              {managingPkg.questions.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-600">
                  Belum ada butir soal di paket ini. Silakan isi form di samping untuk menambahkan
                  soal.
                </div>
              ) : (
                <div className="space-y-3 max-h-[75vh] overflow-y-auto custom-scroll pr-1">
                  {managingPkg.questions.map((q, idx) => {
                    const hasPassage = Boolean(stripHtmlToText(q.passage));
                    return (
                      <div
                        key={q.id}
                        className="p-3.5 rounded-xl border-2 border-zinc-900 bg-[#FAF7F0] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-extrabold text-zinc-950 bg-[#DCD6FF] border border-zinc-900 px-1.5 py-0.5 rounded">
                              No. {idx + 1}
                            </span>
                            {hasPassage && (
                              <span className="text-zinc-800 font-bold">· Berwacana</span>
                            )}
                            <span className="text-zinc-950 font-extrabold">
                              · Kunci: {q.correctAnswer}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => loadQuestionIntoForm(q)}
                              aria-label={`Edit soal nomor ${idx + 1}`}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FEF08A] border-2 border-zinc-900 text-zinc-950 text-xs font-bold"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              aria-label={`Hapus soal nomor ${idx + 1}`}
                              className="px-2.5 py-1 rounded-lg bg-[#FECDD3] hover:bg-[#FDA4AF] border-2 border-zinc-900 text-zinc-950 text-xs font-bold"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                        <div
                          className="formatted-content text-xs text-zinc-800 line-clamp-3 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: sanitizeFormattedHtml(q.question) }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOCUMENT IMPORT */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="bg-white nb-card rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b-2 border-zinc-900/15">
              <div>
                <h2 className="text-lg font-extrabold text-zinc-950">
                  Import Soal Otomatis dari Dokumen
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 mt-0.5">
                  Unggah file <strong>Excel (.xlsx / .xls / .csv)</strong>,{' '}
                  <strong>Word (.docx)</strong>, atau <strong>PDF (.pdf)</strong>. Format ejaan (
                  <em>italic</em>, <strong>bold</strong>, <u>underline</u>, KAPITAL) akan
                  dipertahankan secara otomatis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  downloadExcelTemplateFile();
                  onNotify('Template Excel (.xlsx) berhasil diunduh.', 'success');
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#BBF7D0] hover:bg-[#86EFAC] text-zinc-950 text-xs sm:text-sm font-extrabold nb-btn shrink-0 whitespace-nowrap"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Unduh Template Excel (.xlsx)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
              <div className="lg:col-span-7">
                <label
                  htmlFor="file-import-input"
                  className="border-2 border-dashed border-zinc-900 bg-[#DCD6FF]/45 hover:bg-[#DCD6FF]/75 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#FEF08A] border-2 border-zinc-900 text-zinc-950 flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <span className="text-sm sm:text-base font-extrabold text-zinc-950">
                    Klik untuk Memilih File Soal
                  </span>
                  <span className="text-xs font-medium text-zinc-700 mt-1">
                    Mendukung format: <strong>.xlsx, .xls, .csv, .docx, .pdf</strong>
                  </span>
                  <input
                    id="file-import-input"
                    type="file"
                    accept=".xlsx,.xls,.csv,.docx,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {importLoading && (
                  <div className="mt-3 p-3 rounded-xl bg-[#FEF08A] border-2 border-zinc-900 text-xs font-bold text-zinc-950">
                    Sedang mengekstrak teks dan mempertahankan format ejaan dokumen...
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 bg-[#FAF7F0] rounded-2xl border-2 border-zinc-900 p-4 text-xs text-zinc-800 space-y-2.5">
                <h3 className="font-extrabold text-zinc-950">Panduan Struktur Dokumen:</h3>
                <p>
                  <strong>1. Excel / CSV:</strong> Gunakan kolom{' '}
                  <code className="bg-white px-1 py-0.5 rounded border border-zinc-900">Teks Bacaan</code>,{' '}
                  <code className="bg-white px-1 py-0.5 rounded border border-zinc-900">Pertanyaan</code>,{' '}
                  <code className="bg-white px-1 py-0.5 rounded border border-zinc-900">Opsi A</code> s.d.{' '}
                  <code className="bg-white px-1 py-0.5 rounded border border-zinc-900">Opsi E</code>,{' '}
                  <code className="bg-white px-1 py-0.5 rounded border border-zinc-900">Kunci Jawaban</code>, dan{' '}
                  <code className="bg-white px-1 py-0.5 rounded border border-zinc-900">Pembahasan</code>.
                </p>
                <p>
                  <strong>2. Word (.docx) &amp; PDF (.pdf):</strong> Format cetak <em>miring</em>,{' '}
                  <strong>tebal</strong>, dan <u>garis bawah</u> langsung dikonversi. Gunakan pola
                  penomoran <code className="bg-white px-1 rounded border border-zinc-900">1.</code>, opsi{' '}
                  <code className="bg-white px-1 rounded border border-zinc-900">A. B. C. D. E.</code>,{' '}
                  <code className="bg-white px-1 rounded border border-zinc-900">Kunci: A</code>, dan{' '}
                  <code className="bg-white px-1 rounded border border-zinc-900">Pembahasan: ...</code>.
                </p>
              </div>
            </div>
          </div>

          {importedQuestions.length > 0 && (
            <div className="bg-white nb-card-lg rounded-2xl p-6 space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-zinc-900/15 pb-4">
                <div>
                  <p className="text-xs font-extrabold text-zinc-950 bg-[#BBF7D0] border border-zinc-900 px-2 py-0.5 rounded w-fit">
                    Berhasil Mengekstrak {importedQuestions.length} Soal
                  </p>
                  <h3 className="text-lg font-extrabold text-zinc-950 mt-1">
                    Pratinjau Hasil Ekstraksi &amp; Pengaturan Paket
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setImportedQuestions([])}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-[#FECDD3] text-zinc-900 nb-btn-sm self-start"
                >
                  Batal / Tutup Pratinjau
                </button>
              </div>

              <div className="bg-[#FAF7F0] rounded-2xl p-4 sm:p-5 border-2 border-zinc-900 space-y-4">
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-sm font-extrabold text-zinc-900 cursor-pointer">
                    <input
                      type="radio"
                      name="import-target-mode"
                      checked={importTargetMode === 'new'}
                      onChange={() => setImportTargetMode('new')}
                    />
                    Buat Paket Soal Baru
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-extrabold text-zinc-900 cursor-pointer">
                    <input
                      type="radio"
                      name="import-target-mode"
                      checked={importTargetMode === 'existing'}
                      onChange={() => setImportTargetMode('existing')}
                    />
                    Tambahkan ke Paket yang Sudah Ada
                  </label>
                </div>

                {importTargetMode === 'new' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="imp-pkg-title"
                        className="block text-xs font-extrabold text-zinc-900 mb-1"
                      >
                        Judul Paket Soal *
                      </label>
                      <input
                        id="imp-pkg-title"
                        type="text"
                        value={impTitle}
                        onChange={(e) => setImpTitle(e.target.value)}
                        placeholder="Contoh: Tryout UTBK Literasi Bahasa Indonesia"
                        className="w-full px-3.5 py-2 rounded-xl border-2 border-zinc-900 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="imp-pkg-category"
                        className="block text-xs font-extrabold text-zinc-900 mb-1"
                      >
                        Kategori Jenjang
                      </label>
                      <select
                        id="imp-pkg-category"
                        value={impCategory}
                        onChange={(e) => setImpCategory(e.target.value as PackageCategory)}
                        className="w-full px-3 py-2 rounded-xl border-2 border-zinc-900 text-sm bg-white font-semibold"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="imp-pkg-duration"
                        className="block text-xs font-extrabold text-zinc-900 mb-1"
                      >
                        Durasi (Menit)
                      </label>
                      <input
                        id="imp-pkg-duration"
                        type="number"
                        min={1}
                        value={impDuration}
                        onChange={(e) => setImpDuration(Number(e.target.value) || 30)}
                        className="w-full px-3 py-2 rounded-xl border-2 border-zinc-900 text-sm bg-white font-semibold"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="imp-pkg-token"
                        className="block text-xs font-extrabold text-zinc-900 mb-1"
                      >
                        Token Kuis
                      </label>
                      <div className="flex gap-1">
                        <input
                          id="imp-pkg-token"
                          type="text"
                          value={impToken}
                          onChange={(e) => setImpToken(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 border-zinc-900 text-sm font-mono font-bold uppercase bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setImpToken(generateRandomToken())}
                          className="px-2.5 py-2 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] border-2 border-zinc-900 text-xs font-extrabold"
                          title="Acak Token"
                        >
                          Acak
                        </button>
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="imp-pkg-status"
                        className="block text-xs font-extrabold text-zinc-900 mb-1"
                      >
                        Status Paket
                      </label>
                      <select
                        id="imp-pkg-status"
                        value={impStatus}
                        onChange={(e) => setImpStatus(e.target.value as PackageStatus)}
                        className="w-full px-3 py-2 rounded-xl border-2 border-zinc-900 text-sm font-bold bg-white"
                      >
                        <option value="Published">Published (Tampil)</option>
                        <option value="Draft">Draft (Sembunyi)</option>
                        <option value="Closed">Closed (Ditutup)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2 flex items-center pt-4">
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={impShowExplanation}
                          onChange={(e) => setImpShowExplanation(e.target.checked)}
                        />
                        Tampilkan kunci jawaban &amp; pembahasan setelah siswa selesai
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="imp-existing-pkg"
                      className="block text-xs font-extrabold text-zinc-900 mb-1"
                    >
                      Pilih Paket Tujuan
                    </label>
                    <select
                      id="imp-existing-pkg"
                      value={impExistingPkgId}
                      onChange={(e) => setImpExistingPkgId(e.target.value)}
                      className="w-full sm:w-96 px-3.5 py-2.5 rounded-xl border-2 border-zinc-900 text-sm bg-white font-semibold"
                    >
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.category})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-4 max-h-[55vh] overflow-y-auto custom-scroll pr-1">
                {importedQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl border-2 border-zinc-900 bg-[#FAF7F0] space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-zinc-950 bg-[#DCD6FF] border border-zinc-900 px-2 py-0.5 rounded">
                        Soal #{idx + 1}
                      </span>
                      <span className="font-extrabold text-zinc-950 bg-[#BBF7D0] border border-zinc-900 px-2 py-0.5 rounded">
                        Kunci: {q.correctAnswer}
                      </span>
                    </div>
                    {stripHtmlToText(q.passage) && (
                      <div
                        className="p-3 rounded-xl bg-white border-2 border-zinc-900 text-xs font-serif text-zinc-800 formatted-content max-h-32 overflow-y-auto custom-scroll"
                        dangerouslySetInnerHTML={{ __html: sanitizeFormattedHtml(q.passage) }}
                      />
                    )}
                    <div
                      className="formatted-content text-sm font-semibold text-zinc-950"
                      dangerouslySetInnerHTML={{ __html: sanitizeFormattedHtml(q.question) }}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                      {(['A', 'B', 'C', 'D', 'E'] as OptionKey[])
                        .filter((k) => k !== 'E' || Boolean(stripHtmlToText(q.options.E)))
                        .map((k) => (
                          <div
                            key={k}
                            className={`px-3 py-1.5 rounded-lg border-2 border-zinc-900 ${
                              k === q.correctAnswer
                                ? 'bg-[#BBF7D0] font-bold text-zinc-950'
                                : 'bg-white text-zinc-800'
                            }`}
                          >
                            <span className="font-extrabold mr-1">{k}.</span>
                            <span
                              className="formatted-content"
                              dangerouslySetInnerHTML={{
                                __html: sanitizeFormattedHtml(q.options[k])
                              }}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t-2 border-zinc-900/15">
                <button
                  type="button"
                  onClick={() => setImportedQuestions([])}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF7F0] text-zinc-900 text-sm font-bold nb-btn-sm"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSaveImport}
                  className="px-6 py-2.5 rounded-xl bg-[#BBF7D0] hover:bg-[#86EFAC] text-zinc-950 text-sm font-extrabold nb-btn"
                >
                  ✓ Konfirmasi &amp; Simpan Semua Soal
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SCORES RECAP & BACKUP */}
      {activeTab === 'scores' && (
        <div className="space-y-6">
          <div className="bg-white nb-card rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-zinc-950">
                Backup &amp; Restore Bank Soal (JSON)
              </h2>
              <p className="text-xs text-zinc-600 mt-0.5">
                Cadangkan seluruh paket soal beserta format ejaannya atau pulihkan dari file JSON.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => {
                  exportBankJsonFile(packages);
                  onNotify('File backup Bank Soal (.json) berhasil diunduh.', 'success');
                }}
                className="px-4 py-2.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-zinc-950 text-xs sm:text-sm font-extrabold nb-btn-sm whitespace-nowrap"
              >
                Ekspor Bank Soal (.json)
              </button>
              <label className="px-4 py-2.5 rounded-xl bg-[#DCD6FF] hover:bg-[#C4B5FD] text-zinc-950 text-xs sm:text-sm font-extrabold nb-btn-sm cursor-pointer whitespace-nowrap">
                Impor Bank Soal (.json)
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBankJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="bg-white nb-card rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-zinc-900/15">
              <div>
                <h2 className="text-lg font-extrabold text-zinc-950">
                  Rekap Nilai &amp; Pengawasan Pengerjaan Siswa
                </h2>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Filter berdasarkan paket soal dan ekspor laporan ke Excel atau CSV.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSyncResultsFromCloud(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DCD6FF] hover:bg-[#C4B5FD] text-zinc-950 text-xs sm:text-sm font-extrabold nb-btn-sm whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sinkronkan Nilai Terbaru</span>
                </button>
                <select
                  aria-label="Filter rekap nilai berdasarkan paket soal"
                  value={scoreFilterPkgId}
                  onChange={(e) => setScoreFilterPkgId(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border-2 border-zinc-900 text-xs sm:text-sm font-bold bg-[#FAF7F0]"
                >
                  <option value="ALL">Semua Paket Soal</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (filteredResults.length === 0) {
                      onNotify('Tidak ada data nilai untuk diekspor.', 'warning');
                      return;
                    }
                    exportScoresWorkbook(filteredResults, 'xlsx');
                    onNotify('Laporan berhasil diekspor ke format .xlsx.', 'success');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#BBF7D0] hover:bg-[#86EFAC] text-zinc-950 text-xs sm:text-sm font-extrabold nb-btn-sm whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Ekspor Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (filteredResults.length === 0) {
                      onNotify('Tidak ada data nilai untuk diekspor.', 'warning');
                      return;
                    }
                    exportScoresWorkbook(filteredResults, 'csv');
                    onNotify('Laporan berhasil diekspor ke format .csv.', 'success');
                  }}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-[#FAF7F0] text-zinc-900 text-xs sm:text-sm font-bold nb-btn-sm whitespace-nowrap"
                >
                  Ekspor CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
              <div className="bg-[#BAE6FD] rounded-xl p-4 border-2 border-zinc-900 shadow-[3px_3px_0px_#18181B]">
                <span className="text-xs font-bold text-zinc-900 block">Total Pengerjaan</span>
                <strong className="text-xl font-extrabold text-zinc-950">
                  {filteredResults.length} Siswa
                </strong>
              </div>
              <div className="bg-[#DCD6FF] rounded-xl p-4 border-2 border-zinc-900 shadow-[3px_3px_0px_#18181B]">
                <span className="text-xs font-bold text-zinc-900 block">Rata-rata Skor</span>
                <strong className="text-xl font-extrabold text-zinc-950">{avgScore} / 100</strong>
              </div>
              <div className="bg-[#FECDD3] rounded-xl p-4 border-2 border-zinc-900 shadow-[3px_3px_0px_#18181B]">
                <span className="text-xs font-bold text-zinc-900 block">
                  Terkena Banned (3x Pelanggaran)
                </span>
                <strong className="text-xl font-extrabold text-zinc-950">{bannedCount} Siswa</strong>
              </div>
            </div>

            <div className="overflow-x-auto mt-4 border-2 border-zinc-900 rounded-xl">
              <table className="w-full text-left border-collapse text-sm tabular-nums">
                <thead>
                  <tr className="border-b-2 border-zinc-900 text-xs uppercase tracking-wider text-zinc-950 bg-[#FEF08A]">
                    <th className="py-3 px-4 font-extrabold">No</th>
                    <th className="py-3 px-4 font-extrabold">Nama Lengkap Siswa</th>
                    <th className="py-3 px-4 font-extrabold">Kelas</th>
                    <th className="py-3 px-4 font-extrabold">Paket Soal</th>
                    <th className="py-3 px-4 font-extrabold">Waktu Selesai</th>
                    <th className="py-3 px-4 font-extrabold">Keterangan Pelanggaran</th>
                    <th className="py-3 px-4 font-extrabold text-center">Benar / Salah</th>
                    <th className="py-3 px-4 font-extrabold text-center">Skor Akhir</th>
                    <th className="py-3 px-4 font-extrabold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-zinc-900/15 bg-white">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-8 text-center text-xs sm:text-sm text-zinc-600"
                      >
                        Belum ada data pengerjaan siswa pada filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((r, idx) => {
                      const vCount = Number(r.violationCount || 0);
                      const isBanned = Boolean(r.isBanned) || vCount >= 3;
                      const statusText =
                        r.examStatus ||
                        (isBanned
                          ? `${vCount} kali pelanggaran - BANNED`
                          : `${vCount} kali pelanggaran - Selesai Normal`);
                      const statusCls = isBanned
                        ? 'text-rose-700 font-extrabold'
                        : vCount > 0
                        ? 'text-amber-800 font-extrabold'
                        : 'text-emerald-800 font-bold';

                      return (
                        <tr key={r.id} className="hover:bg-[#FAF7F0] transition">
                          <td className="py-3 px-4 text-xs font-bold text-zinc-600">{idx + 1}</td>
                          <td className="py-3 px-4 font-extrabold text-zinc-950">
                            {r.studentName}
                          </td>
                          <td className="py-3 px-4 text-xs font-bold text-zinc-800">
                            {r.studentClass || '-'}
                          </td>
                          <td className="py-3 px-4 text-xs text-zinc-800 max-w-xs truncate">
                            {r.packageTitle}
                          </td>
                          <td className="py-3 px-4 text-xs text-zinc-600 whitespace-nowrap">
                            {formatDateIndo(r.finishedAt)}
                          </td>
                          <td className={`py-3 px-4 text-xs ${statusCls}`}>{statusText}</td>
                          <td className="py-3 px-4 text-center text-xs font-bold">
                            <span className="text-emerald-800">{r.correctCount}B</span> /{' '}
                            <span className="text-rose-700">{r.wrongCount}S</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded bg-[#DCD6FF] border border-zinc-900 font-extrabold text-xs text-zinc-950">
                              {r.score}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteResult(r.id);
                                onNotify('Data nilai dihapus.', 'info');
                              }}
                              aria-label={`Hapus data nilai ${r.studentName}`}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FECDD3] hover:bg-[#FDA4AF] border border-zinc-900 text-zinc-950"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FIREBASE CLOUD SETTINGS */}
      {activeTab === 'cloud' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white nb-card rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-zinc-900/15">
              <div>
                <h2 className="text-lg font-extrabold text-zinc-950">
                  Sinkronisasi Firebase Realtime Database
                </h2>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Hubungkan aplikasi ke database online gratis agar soal &amp; nilai siswa otomatis
                  tersinkronisasi antarperangkat.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-zinc-950 bg-[#BAE6FD] border-2 border-zinc-900 px-3 py-1 rounded-lg shrink-0">
                <Cloud className="w-4 h-4" aria-hidden="true" />
                <span>
                  {cloudStatus === 'connected'
                    ? 'Cloud Terhubung'
                    : cloudStatus === 'syncing'
                    ? 'Menyinkronkan...'
                    : 'Mode Lokal'}
                </span>
              </span>
            </div>

            <div className="rounded-xl p-4 bg-[#FAF7F0] border-2 border-zinc-900 text-xs text-zinc-800 space-y-1">
              <p className="font-extrabold text-zinc-950">Status Koneksi Saat Ini:</p>
              {activeFirebaseUrl && cloudStatus === 'connected' ? (
                <p>
                  Terhubung ke{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-zinc-900 font-mono text-xs">
                    {activeFirebaseUrl}
                  </code>
                  . Paket soal dan nilai siswa otomatis tersinkronisasi antarperangkat.
                </p>
              ) : activeFirebaseUrl ? (
                <p>
                  URL database sudah tersimpan, tetapi belum berhasil terhubung. Periksa koneksi
                  internet atau Rules Firebase (read/write: true).
                </p>
              ) : (
                <p>
                  Belum terhubung ke Firebase. Data soal dan nilai siswa saat ini hanya tersimpan di
                  LocalStorage perangkat ini.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <label
                htmlFor="cloud-url-input"
                className="block text-xs font-extrabold text-zinc-900"
              >
                URL Firebase Realtime Database <span className="text-rose-600">*</span>
              </label>
              <input
                id="cloud-url-input"
                type="url"
                value={cloudUrlInput}
                onChange={(e) => setCloudUrlInput(e.target.value)}
                placeholder="Contoh: https://cat-bimbel-default-rtdb.asia-southeast1.firebasedatabase.app"
                className="w-full px-4 py-3 rounded-xl border-2 border-zinc-900 bg-[#FAF7F0] focus:bg-white text-sm font-mono focus:shadow-[3px_3px_0px_#18181B] outline-none"
              />
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={cloudBusy}
                  onClick={async () => {
                    setCloudBusy(true);
                    await onConnectFirebase(cloudUrlInput);
                    setCloudBusy(false);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#DCD6FF] hover:bg-[#C4B5FD] disabled:opacity-50 text-zinc-950 text-xs sm:text-sm font-extrabold nb-btn"
                >
                  {cloudBusy ? 'Menghubungkan...' : 'Hubungkan & Sinkronkan Sekarang'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCloudUrlInput('');
                    onDisconnectFirebase();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF7F0] text-zinc-900 text-xs sm:text-sm font-bold nb-btn-sm"
                >
                  Putuskan Koneksi
                </button>
              </div>
            </div>

            <div className="pt-5 border-t-2 border-zinc-900/15 space-y-3">
              <div className="bg-[#BBF7D0] border-2 border-zinc-900 rounded-2xl p-4 sm:p-5 space-y-3">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-zinc-950">
                    Ekspor File Konfigurasi &amp; Hosting (Netlify / GitHub Pages)
                  </h3>
                  <p className="text-xs text-zinc-900 mt-1 leading-relaxed font-medium">
                    Unduh salinan halaman dengan URL Firebase Anda tertanam otomatis untuk
                    keperluan distribusi atau hosting statis.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadHostingConfig}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-[#FEF08A] text-zinc-950 text-xs sm:text-sm font-extrabold nb-btn inline-flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Unduh index.html Siap Hosting</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#FEF08A] nb-card rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-extrabold text-zinc-950">
              Panduan Setup Firebase Gratis (3 Menit)
            </h3>
            <ol className="space-y-3 text-xs sm:text-sm text-zinc-900 font-medium list-decimal list-inside leading-relaxed">
              <li>
                Buka <strong className="text-zinc-950">console.firebase.google.com</strong>, login
                dengan akun Google Anda, lalu klik <strong>Create a project</strong> (buat proyek
                baru).
              </li>
              <li>
                Di menu sebelah kiri, pilih <strong>Build → Realtime Database</strong>, lalu klik
                tombol <strong>Create Database</strong>.
              </li>
              <li>
                Pilih lokasi server terdekat (misalnya <em>Singapore / asia-southeast1</em>), lalu
                pada pengaturan keamanan pilih <strong>Start in test mode</strong> agar aplikasi
                dapat membaca &amp; menulis data secara otomatis.
              </li>
              <li>
                Salin tautan URL database yang muncul di bagian atas tabel data (berakhiran{' '}
                <code className="bg-white border border-zinc-900 px-1 py-0.5 rounded font-mono text-xs">
                  .firebaseio.com
                </code>{' '}
                atau{' '}
                <code className="bg-white border border-zinc-900 px-1 py-0.5 rounded font-mono text-xs">
                  .firebasedatabase.app
                </code>
                ).
              </li>
              <li>
                Tempelkan URL tersebut pada kolom di sebelah kiri, lalu klik{' '}
                <strong>Hubungkan &amp; Sinkronkan Sekarang</strong>.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Create/Edit Package Modal */}
      {pkgModalOpen && (
        <div
          className="fixed inset-0 bg-zinc-950/55 z-40 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pkg-modal-title"
        >
          <div className="bg-white nb-card-lg rounded-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="bg-[#DCD6FF] border-b-2 border-zinc-900 px-6 py-4 flex items-center justify-between">
              <h2 id="pkg-modal-title" className="text-base sm:text-lg font-extrabold text-zinc-950">
                {editingPkgId ? 'Edit Pengaturan Paket Soal' : 'Buat Paket Soal Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setPkgModalOpen(false)}
                className="bg-white hover:bg-[#FECDD3] text-zinc-900 p-1.5 rounded-lg nb-btn-sm"
                aria-label="Tutup modal paket soal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePackageForm} className="p-6 space-y-3.5">
              <div>
                <label
                  htmlFor="pkg-form-title"
                  className="block text-xs font-extrabold text-zinc-900 mb-1"
                >
                  Judul Paket Soal <span className="text-rose-600">*</span>
                </label>
                <input
                  id="pkg-form-title"
                  type="text"
                  required
                  value={pkgTitle}
                  onChange={(e) => setPkgTitle(e.target.value)}
                  placeholder="Contoh: Tryout SNBT Literasi Bahasa Indonesia Paket 2"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-zinc-900 bg-[#FAF7F0] focus:bg-white text-sm font-medium outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="pkg-form-category"
                    className="block text-xs font-extrabold text-zinc-900 mb-1"
                  >
                    Kategori Jenjang
                  </label>
                  <select
                    id="pkg-form-category"
                    value={pkgCategory}
                    onChange={(e) => setPkgCategory(e.target.value as PackageCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-zinc-900 text-sm bg-white font-semibold"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="pkg-form-duration"
                    className="block text-xs font-extrabold text-zinc-900 mb-1"
                  >
                    Durasi (Menit)
                  </label>
                  <input
                    id="pkg-form-duration"
                    type="number"
                    min={1}
                    max={300}
                    required
                    value={pkgDuration}
                    onChange={(e) => setPkgDuration(Number(e.target.value) || 30)}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-zinc-900 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="pkg-form-token"
                    className="block text-xs font-extrabold text-zinc-900 mb-1"
                  >
                    Token Kuis
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      id="pkg-form-token"
                      type="text"
                      required
                      value={pkgToken}
                      onChange={(e) => setPkgToken(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-zinc-900 text-sm font-mono font-bold uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => setPkgToken(generateRandomToken())}
                      className="px-3 py-2.5 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-xs font-extrabold border-2 border-zinc-900"
                      title="Acak Token"
                    >
                      Acak
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="pkg-form-status"
                    className="block text-xs font-extrabold text-zinc-900 mb-1"
                  >
                    Status Publikasi
                  </label>
                  <select
                    id="pkg-form-status"
                    value={pkgStatus}
                    onChange={(e) => setPkgStatus(e.target.value as PackageStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-zinc-900 text-sm font-bold bg-white"
                  >
                    <option value="Published">Published (Tampil di Siswa)</option>
                    <option value="Draft">Draft (Disembunyikan)</option>
                    <option value="Closed">Closed (Ditutup)</option>
                  </select>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-bold text-zinc-800 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pkgShowExplanation}
                  onChange={(e) => setPkgShowExplanation(e.target.checked)}
                />
                Tampilkan kunci jawaban &amp; pembahasan pada halaman hasil siswa
              </label>

              <div className="flex justify-end gap-3 pt-3 border-t-2 border-zinc-900/10">
                <button
                  type="button"
                  onClick={() => setPkgModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-900 bg-white hover:bg-[#FAF7F0] nb-btn-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#BBF7D0] hover:bg-[#86EFAC] text-zinc-950 text-sm font-extrabold nb-btn"
                >
                  Simpan Paket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Package Confirmation Modal */}
      {deletingPkg && (
        <div
          className="fixed inset-0 bg-zinc-950/55 z-40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-pkg-title"
        >
          <div className="bg-white nb-card-lg rounded-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-[#FECDD3] border-b-2 border-zinc-900 px-6 py-4">
              <h2 id="del-pkg-title" className="text-lg font-extrabold text-zinc-950">
                Hapus Paket Soal?
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-800 leading-relaxed">
                Paket <strong>&ldquo;{deletingPkg.title}&rdquo;</strong> beserta seluruh{' '}
                <strong>{(deletingPkg.questions || []).length} butir soal</strong> di dalamnya akan
                dihapus permanen.
              </p>
              <div className="flex justify-end gap-3 pt-2 border-t-2 border-zinc-900/10">
                <button
                  type="button"
                  onClick={() => setDeletingPkg(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-900 bg-white hover:bg-[#FAF7F0] nb-btn-sm"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeletePackage(deletingPkg.id);
                    setDeletingPkg(null);
                    onNotify('Paket soal dihapus.', 'info');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#FECDD3] hover:bg-[#FDA4AF] text-zinc-950 text-sm font-extrabold nb-btn"
                >
                  Ya, Hapus Permanen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
