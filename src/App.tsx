import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Lock, RefreshCw, X } from 'lucide-react';
import { INITIAL_PACKAGES, INITIAL_RESULTS, STORAGE_KEYS } from './data/seedData';
import type {
  CloudStatusState,
  ExamPackage,
  ExamResult,
  LastResultBundle,
  OptionKey,
  ToastItem
} from './types/cat';
import {
  getActiveFirebaseUrl,
  loadStoredArray,
  saveStoredValue,
  setStoredFirebaseUrl
} from './utils/storage';
import {
  deleteResultFromFirebase,
  fetchPackagesFromFirebase,
  fetchResultsFromFirebase,
  postResultToFirebase,
  pushPackagesToFirebase
} from './utils/cloudSync';
import { StudentPortal } from './components/StudentPortal';
import { ExamRoom } from './components/ExamRoom';
import { ResultView } from './components/ResultView';
import { AdminDashboard } from './components/AdminDashboard';

type AppView = 'portal' | 'exam' | 'result' | 'admin';

export default function App() {
  const [packages, setPackages] = useState<ExamPackage[]>(() =>
    loadStoredArray<ExamPackage>(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES)
  );
  const [results, setResults] = useState<ExamResult[]>(() =>
    loadStoredArray<ExamResult>(STORAGE_KEYS.RESULTS, INITIAL_RESULTS)
  );
  const [activeView, setActiveView] = useState<AppView>('portal');
  const [cloudStatus, setCloudStatus] = useState<CloudStatusState>('local');
  const [activeFirebaseUrl, setActiveFirebaseUrl] = useState<string>(() => getActiveFirebaseUrl());

  // Exam & Result Session
  const [activeExamSession, setActiveExamSession] = useState<{
    pkg: ExamPackage;
    studentName: string;
    studentClass: string;
  } | null>(null);
  const [lastResultBundle, setLastResultBundle] = useState<LastResultBundle | null>(null);

  // Admin Auth
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminLoginModalOpen, setAdminLoginModalOpen] = useState(false);
  const [adminPwdInput, setAdminPwdInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [syncSpinning, setSyncSpinning] = useState(false);

  const notify = useCallback(
    (message: string, type: ToastItem['type'] = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3800);
    },
    []
  );

  const syncFromCloud = useCallback(
    async (manualNotify: boolean) => {
      const dbUrl = getActiveFirebaseUrl();
      setActiveFirebaseUrl(dbUrl);
      if (!dbUrl) {
        setCloudStatus('local');
        if (manualNotify) {
          notify('Aplikasi berjalan dalam Mode Lokal. Daftar paket dimuat ulang.', 'info');
        }
        return false;
      }

      setSyncSpinning(true);
      setCloudStatus('syncing');
      try {
        const cloudPackages = await fetchPackagesFromFirebase(dbUrl);
        if (cloudPackages.length > 0) {
          setPackages(cloudPackages);
          saveStoredValue(STORAGE_KEYS.PACKAGES, cloudPackages);
        }
        setCloudStatus('connected');
        if (manualNotify) {
          notify('Daftar paket soal berhasil disinkronkan dari Cloud!', 'success');
        }
        return true;
      } catch {
        setCloudStatus('local');
        if (manualNotify) {
          notify('Gagal terhubung ke Cloud. Menggunakan data tersimpan lokal.', 'warning');
        }
        return false;
      } finally {
        setSyncSpinning(false);
      }
    },
    [notify]
  );

  const syncResultsFromCloud = useCallback(
    async (manualNotify: boolean) => {
      const dbUrl = getActiveFirebaseUrl();
      if (!dbUrl) {
        if (manualNotify) {
          notify(
            'Database Cloud belum diatur. Menampilkan data nilai dari penyimpanan lokal.',
            'info'
          );
        }
        return;
      }

      try {
        const cloudEntries = await fetchResultsFromFirebase(dbUrl);
        if (cloudEntries.length > 0) {
          setResults((prev) => {
            const merged = new Map<string, ExamResult>();
            prev.forEach((item) => {
              if (item?.id) merged.set(item.id, item);
            });
            cloudEntries.forEach((item) => {
              if (item?.id) merged.set(item.id, item);
            });
            const next = Array.from(merged.values()).sort(
              (a, b) => new Date(b.finishedAt || 0).getTime() - new Date(a.finishedAt || 0).getTime()
            );
            saveStoredValue(STORAGE_KEYS.RESULTS, next);
            return next;
          });
        }
        setCloudStatus('connected');
        if (manualNotify) {
          notify('Rekap nilai & pelanggaran siswa berhasil disinkronkan dari Cloud!', 'success');
        }
      } catch {
        if (manualNotify) {
          notify('Gagal mengambil data nilai terbaru dari Cloud.', 'warning');
        }
      }
    },
    [notify]
  );

  useEffect(() => {
    if (getActiveFirebaseUrl()) {
      syncFromCloud(false);
    }
  }, [syncFromCloud]);

  // ==================== PACKAGE & RESULT MUTATIONS ====================
  const pushPackagesSafe = (nextPackages: ExamPackage[]) => {
    const dbUrl = getActiveFirebaseUrl();
    if (!dbUrl) return;
    pushPackagesToFirebase(dbUrl, nextPackages)
      .then(() => setCloudStatus('connected'))
      .catch(() => setCloudStatus('local'));
  };

  const handleUpsertPackage = (pkg: ExamPackage) => {
    setPackages((prev) => {
      const idx = prev.findIndex((p) => p.id === pkg.id);
      const next = idx >= 0 ? prev.map((p) => (p.id === pkg.id ? pkg : p)) : [pkg, ...prev];
      saveStoredValue(STORAGE_KEYS.PACKAGES, next);
      pushPackagesSafe(next);
      return next;
    });
  };

  const handleDeletePackage = (pkgId: string) => {
    setPackages((prev) => {
      const next = prev.filter((p) => p.id !== pkgId);
      saveStoredValue(STORAGE_KEYS.PACKAGES, next);
      pushPackagesSafe(next);
      return next;
    });
  };

  const handleReplaceAllPackages = (nextPackages: ExamPackage[]) => {
    setPackages(nextPackages);
    saveStoredValue(STORAGE_KEYS.PACKAGES, nextPackages);
    pushPackagesSafe(nextPackages);
  };

  const handleExamComplete = (
    record: ExamResult,
    pkg: ExamPackage,
    answers: Record<string, OptionKey>
  ) => {
    setResults((prev) => {
      const next = [record, ...prev];
      saveStoredValue(STORAGE_KEYS.RESULTS, next);
      return next;
    });

    const dbUrl = getActiveFirebaseUrl();
    if (dbUrl) {
      postResultToFirebase(dbUrl, record)
        .then((fbKey) => {
          if (!fbKey) return;
          setResults((prev) => {
            const next = prev.map((r) =>
              r.id === record.id ? { ...r, _firebaseKey: fbKey } : r
            );
            saveStoredValue(STORAGE_KEYS.RESULTS, next);
            return next;
          });
          setCloudStatus('connected');
        })
        .catch(() => {});
    }

    setLastResultBundle({ record, pkg, answers });
    setActiveExamSession(null);
    setActiveView('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteResult = (resId: string) => {
    setResults((prev) => {
      const target = prev.find((r) => r.id === resId);
      const next = prev.filter((r) => r.id !== resId);
      saveStoredValue(STORAGE_KEYS.RESULTS, next);
      const dbUrl = getActiveFirebaseUrl();
      if (dbUrl && target?._firebaseKey) {
        deleteResultFromFirebase(dbUrl, target._firebaseKey).catch(() => {});
      }
      return next;
    });
  };

  // ==================== CLOUD CONNECTION HANDLERS ====================
  const handleConnectFirebase = async (rawUrl: string) => {
    const cleanUrl = rawUrl.trim().replace(/\/+$/, '');
    if (!cleanUrl || !cleanUrl.startsWith('https://')) {
      notify('Masukkan URL Firebase Realtime Database yang valid (diawali https://).', 'error');
      return;
    }

    setStoredFirebaseUrl(cleanUrl);
    setActiveFirebaseUrl(cleanUrl);
    setCloudStatus('syncing');

    try {
      const cloudPkgs = await fetchPackagesFromFirebase(cleanUrl);
      if (cloudPkgs.length === 0) {
        await pushPackagesToFirebase(cleanUrl, packages);
      } else {
        setPackages(cloudPkgs);
        saveStoredValue(STORAGE_KEYS.PACKAGES, cloudPkgs);
      }
      await syncResultsFromCloud(false);
      setCloudStatus('connected');
      notify('Berhasil terhubung dan menyinkronkan data dengan Firebase Cloud!', 'success');
    } catch (err) {
      setCloudStatus('local');
      notify(
        err instanceof Error ? err.message : 'Gagal terhubung ke Firebase Database.',
        'error'
      );
    }
  };

  const handleDisconnectFirebase = () => {
    setStoredFirebaseUrl('');
    setActiveFirebaseUrl('');
    setCloudStatus('local');
    notify('Koneksi Firebase diputuskan. Aplikasi kembali ke Mode Lokal.', 'info');
  };

  // ==================== ADMIN AUTH HANDLERS ====================
  const handleAdminNavClick = () => {
    if (isAdminAuth) {
      setActiveView('admin');
      return;
    }
    setAdminPwdInput('');
    setAdminLoginError(false);
    setAdminLoginModalOpen(true);
  };

  const handleVerifyAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPwdInput === 'UjianKikay21') {
      setIsAdminAuth(true);
      setAdminLoginModalOpen(false);
      setActiveView('admin');
      notify('Berhasil masuk ke Dashboard Admin.', 'success');
    } else {
      setAdminLoginError(true);
    }
  };

  const navigateHome = () => {
    setActiveExamSession(null);
    setActiveView('portal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (getActiveFirebaseUrl()) {
      syncFromCloud(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F0] text-zinc-900">
      {/* Global Toasts */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const styles: Record<ToastItem['type'], string> = {
            success: 'bg-[#BBF7D0] text-zinc-950',
            error: 'bg-[#FECDD3] text-zinc-950',
            warning: 'bg-[#FEF08A] text-zinc-950',
            info: 'bg-[#BAE6FD] text-zinc-950'
          };
          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-xl px-4 py-3 text-xs sm:text-sm font-bold nb-card flex items-center gap-2.5 animate-fade-in ${styles[t.type]}`}
            >
              <span className="flex-1 leading-snug">{t.message}</span>
            </div>
          );
        })}
      </div>

      {/* Top Navigation Bar (Hidden during Exam) */}
      {activeView !== 'exam' && (
        <header className="bg-white border-b-2 border-zinc-900 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-6">
            <button
              type="button"
              onClick={navigateHome}
              className="flex items-center gap-2 sm:gap-2.5 text-left group min-w-0 focus-visible:outline-2 focus-visible:outline-zinc-900 rounded-lg"
            >
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FEF08A] text-zinc-950 border-2 border-zinc-900 shadow-[2px_2px_0px_#18181B] flex items-center justify-center group-hover:bg-[#DCD6FF] transition shrink-0">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              </span>
              <span className="font-extrabold text-sm sm:text-lg tracking-tight text-zinc-950 truncate">
                CAT Bahasa Indonesia
              </span>
            </button>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span
                className="hidden sm:inline-block text-xs font-bold text-zinc-700 whitespace-nowrap"
                data-testid="cloud-status-label"
              >
                {cloudStatus === 'connected'
                  ? 'Cloud Terhubung'
                  : cloudStatus === 'syncing'
                  ? 'Menyinkronkan...'
                  : 'Mode Lokal'}
              </span>

              <button
                type="button"
                onClick={() => syncFromCloud(true)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#BAE6FD] text-zinc-950 hover:bg-[#93DBFD] nb-btn-sm whitespace-nowrap shrink-0"
                title="Muat Ulang Paket Soal Terbaru"
                aria-label="Refresh Soal"
              >
                <RefreshCw
                  className={`w-4 h-4 ${syncSpinning ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Refresh Soal</span>
              </button>

              <button
                type="button"
                onClick={handleAdminNavClick}
                aria-label={isAdminAuth ? 'Dashboard Admin' : 'Login Admin'}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-[#FEF08A] text-zinc-950 hover:bg-[#FDE047] nb-btn-sm whitespace-nowrap shrink-0"
              >
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
                <span className="sm:hidden">Admin</span>
                <span className="hidden sm:inline">
                  {isAdminAuth ? 'Dashboard Admin' : 'Login Admin'}
                </span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main View Switch */}
      {activeView === 'portal' && (
        <StudentPortal
          packages={packages}
          onStartExam={(pkg, studentName, studentClass) => {
            setActiveExamSession({
              pkg: JSON.parse(JSON.stringify(pkg)) as ExamPackage,
              studentName,
              studentClass
            });
            setActiveView('exam');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {activeView === 'exam' && activeExamSession && (
        <ExamRoom
          pkg={activeExamSession.pkg}
          studentName={activeExamSession.studentName}
          studentClass={activeExamSession.studentClass}
          onNotify={notify}
          onComplete={handleExamComplete}
        />
      )}

      {activeView === 'result' && lastResultBundle && (
        <ResultView bundle={lastResultBundle} onReturnHome={navigateHome} />
      )}

      {activeView === 'admin' && isAdminAuth && (
        <AdminDashboard
          packages={packages}
          results={results}
          cloudStatus={cloudStatus}
          activeFirebaseUrl={activeFirebaseUrl}
          onNavigatePortal={navigateHome}
          onLogout={() => {
            setIsAdminAuth(false);
            notify('Anda telah keluar dari sesi Admin.', 'info');
            navigateHome();
          }}
          onUpsertPackage={handleUpsertPackage}
          onDeletePackage={handleDeletePackage}
          onDeleteResult={handleDeleteResult}
          onReplaceAllPackages={handleReplaceAllPackages}
          onSyncResultsFromCloud={syncResultsFromCloud}
          onConnectFirebase={handleConnectFirebase}
          onDisconnectFirebase={handleDisconnectFirebase}
          onNotify={notify}
        />
      )}

      {/* Footer (Hidden during Exam) */}
      {activeView !== 'exam' && (
        <footer className="bg-white border-t-2 border-zinc-900 py-5 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-medium text-zinc-700">
            <span>
              © 2026 <strong>CAT Bahasa Indonesia</strong> — Platform Evaluasi Bimbingan Belajar
              Privat
            </span>
            <span>Mendukung Pelestarian Ejaan Bahasa Indonesia (EYD Edisi V)</span>
          </div>
        </footer>
      )}

      {/* Admin Login Modal */}
      {adminLoginModalOpen && (
        <div
          className="fixed inset-0 bg-zinc-950/55 z-40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-login-title"
        >
          <div className="bg-white nb-card-lg rounded-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-[#FEF08A] border-b-2 border-zinc-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-white text-zinc-950 border-2 border-zinc-900 flex items-center justify-center">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="admin-login-title" className="text-base font-extrabold text-zinc-950">
                    Login Administrator
                  </h2>
                  <p className="text-xs font-medium text-zinc-800">
                    Masukkan kata sandi pengelola bank soal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminLoginModalOpen(false)}
                className="bg-white hover:bg-[#FECDD3] text-zinc-900 p-1.5 rounded-lg nb-btn-sm"
                aria-label="Tutup modal login admin"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyAdminPassword} className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="admin-password-input"
                  className="block text-xs font-extrabold text-zinc-900 mb-1.5"
                >
                  Kata Sandi Admin
                </label>
                <input
                  id="admin-password-input"
                  type="password"
                  required
                  autoFocus
                  value={adminPwdInput}
                  onChange={(e) => {
                    setAdminPwdInput(e.target.value);
                    if (adminLoginError) setAdminLoginError(false);
                  }}
                  placeholder="Masukkan kata sandi..."
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-900 bg-[#FAF7F0] focus:bg-white text-sm font-medium focus:shadow-[3px_3px_0px_#18181B] outline-none transition"
                />
              </div>

              {adminLoginError && (
                <div
                  role="alert"
                  className="text-xs font-bold text-zinc-950 bg-[#FECDD3] border-2 border-zinc-900 rounded-xl px-3.5 py-2.5"
                >
                  Kata sandi administrator salah!
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdminLoginModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-900 bg-white hover:bg-[#FAF7F0] nb-btn-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#DCD6FF] hover:bg-[#C4B5FD] text-zinc-950 text-sm font-extrabold nb-btn"
                >
                  Masuk Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
