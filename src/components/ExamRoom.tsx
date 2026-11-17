import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { ExamPackage, ExamResult, OptionKey } from '../types/cat';
import { sanitizeFormattedHtml, stripHtmlToText } from '../utils/htmlSanitizer';
import { buildExamResultRecord, formatTimerClock } from '../utils/examLogic';

interface ExamRoomProps {
  pkg: ExamPackage;
  studentName: string;
  studentClass: string;
  onNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onComplete: (result: ExamResult, pkg: ExamPackage, answers: Record<string, OptionKey>) => void;
}

export const ExamRoom: React.FC<ExamRoomProps> = ({
  pkg,
  studentName,
  studentClass,
  onNotify,
  onComplete
}) => {
  const totalSeconds = Math.max(1, Number(pkg.duration || 30)) * 60;
  const questions = pkg.questions || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [doubts, setDoubts] = useState<Record<string, boolean>>({});
  const [fontSize, setFontSize] = useState(16);
  const [mobileTab, setMobileTab] = useState<'passage' | 'question'>('passage');
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [violationCount, setViolationCount] = useState(0);
  const [violationModalReason, setViolationModalReason] = useState<string | null>(null);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const remainingRef = useRef(remainingSeconds);
  remainingRef.current = remainingSeconds;
  const violationRef = useRef(violationCount);
  violationRef.current = violationCount;
  const lastViolationAtRef = useRef(0);
  const finishedRef = useRef(false);
  const passageContainerRef = useRef<HTMLDivElement>(null);

  const finalizeExam = useCallback(
    (isForcedBan: boolean, finalViolationCount?: number) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const vCount = finalViolationCount ?? violationRef.current;
      const record = buildExamResultRecord({
        pkg,
        studentName,
        studentClass,
        answers: answersRef.current,
        totalSeconds,
        remainingSeconds: remainingRef.current,
        violationCount: vCount,
        isForcedBan
      });
      onComplete(record, pkg, answersRef.current);
    },
    [onComplete, pkg, studentClass, studentName, totalSeconds]
  );

  // Countdown Timer
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (finishedRef.current) return;
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          onNotify('Waktu pengerjaan telah habis! Jawaban otomatis dikumpulkan.', 'warning');
          remainingRef.current = 0;
          finalizeExam(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [finalizeExam, onNotify]);

  // Anti-Cheating Security Listeners
  useEffect(() => {
    const registerViolation = (reason: string) => {
      if (finishedRef.current) return;
      const now = Date.now();
      if (now - lastViolationAtRef.current < 1500) return;
      lastViolationAtRef.current = now;

      const nextCount = violationRef.current + 1;
      violationRef.current = nextCount;
      setViolationCount(nextCount);

      if (nextCount >= 3) {
        setViolationModalReason(null);
        setShowConfirmFinish(false);
        onNotify('Pelanggaran ke-3 terdeteksi! Ujian otomatis dibanned dan dikumpulkan.', 'error');
        finalizeExam(true, nextCount);
      } else {
        setViolationModalReason(reason);
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        registerViolation('Terdeteksi berpindah tab browser atau menyembunyikan layar ujian.');
      }
    };
    const handleBlur = () => {
      registerViolation('Terdeteksi meninggalkan jendela ujian atau membuka aplikasi lain.');
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      onNotify('Klik kanan dinonaktifkan selama ujian berlangsung.', 'warning');
    };
    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      onNotify('Menyalin atau memotong teks soal tidak diperbolehkan.', 'warning');
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
    };
  }, [finalizeExam, onNotify]);

  // Reset passage scroll when switching question
  useEffect(() => {
    if (passageContainerRef.current) {
      passageContainerRef.current.scrollTop = 0;
    }
  }, [currentIndex]);

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const hasPassage = Boolean(stripHtmlToText(currentQuestion.passage));
  const selectedOpt = answers[currentQuestion.id] || null;
  const isDoubt = Boolean(doubts[currentQuestion.id]);
  const answeredCount = questions.filter((q) => Boolean(answers[q.id])).length;
  const unansweredCount = questions.length - answeredCount;
  const fontPct = Math.round((fontSize / 16) * 100);

  const optKeys: OptionKey[] = (['A', 'B', 'C', 'D', 'E'] as OptionKey[]).filter((key) => {
    if (key !== 'E') return true;
    return Boolean(stripHtmlToText(currentQuestion.options?.E));
  });

  const violationBadgeClass =
    violationCount === 0
      ? 'bg-[#BBF7D0] text-zinc-950'
      : violationCount === 1
      ? 'bg-[#FEF08A] text-zinc-950'
      : 'bg-[#FECDD3] text-zinc-950';

  return (
    <section className="flex-1 flex flex-col bg-[#FAF7F0] min-h-screen select-none">
      {/* Top Exam Header */}
      <header className="bg-white border-b-2 border-zinc-900 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
          <div className="min-w-0 w-full sm:w-auto sm:flex-1">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <span className="font-extrabold text-zinc-950 bg-[#DCD6FF] border border-zinc-900 px-1.5 py-0.5 rounded shrink-0">
                {pkg.category}
              </span>
              <h1 className="font-extrabold text-sm sm:text-base text-zinc-950 truncate">
                {pkg.title}
              </h1>
            </div>
            <p className="text-xs text-zinc-600 truncate mt-0.5">
              Peserta: <strong className="text-zinc-950">{studentName}</strong>
              <span className="mx-1.5 text-zinc-400">·</span>
              Kelas: <strong className="text-zinc-950">{studentClass}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Violation Counter */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 border-zinc-900 text-xs font-extrabold tabular-nums ${violationBadgeClass}`}
              title="Batas maksimal pindah tab/aplikasi adalah 3 kali"
              data-testid="exam-violation-counter"
            >
              {violationCount === 0 ? (
                <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : (
                <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">Pelanggaran:</span>
              <span>{violationCount}/3</span>
            </div>

            {/* Font Size Control */}
            <div
              className="inline-flex items-center bg-[#FAF7F0] rounded-lg p-0.5 border-2 border-zinc-900"
              role="group"
              aria-label="Atur ukuran huruf bacaan dan soal"
            >
              <button
                type="button"
                onClick={() => setFontSize((s) => Math.max(13, s - 1))}
                className="px-2.5 py-1 rounded-md text-xs font-extrabold text-zinc-900 hover:bg-[#FEF08A] transition"
                aria-label="Perkecil huruf"
              >
                A-
              </button>
              <span className="px-1.5 text-[11px] font-bold text-zinc-700 hidden sm:inline tabular-nums">
                {fontPct}%
              </span>
              <button
                type="button"
                onClick={() => setFontSize((s) => Math.min(22, s + 1))}
                className="px-2.5 py-1 rounded-md text-xs font-extrabold text-zinc-900 hover:bg-[#FEF08A] transition"
                aria-label="Perbesar huruf"
              >
                A+
              </button>
            </div>

            {/* Countdown Timer */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-zinc-900 font-mono text-sm font-extrabold tabular-nums ${
                remainingSeconds <= 60 ? 'bg-[#FECDD3] text-zinc-950' : 'bg-[#FEF08A] text-zinc-950'
              }`}
              data-testid="exam-timer"
            >
              <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{formatTimerClock(remainingSeconds)}</span>
            </div>

            {/* Finish Button */}
            <button
              type="button"
              onClick={() => setShowConfirmFinish(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#BBF7D0] hover:bg-[#86EFAC] text-zinc-950 text-xs sm:text-sm font-extrabold nb-btn-sm whitespace-nowrap shrink-0"
            >
              Selesai
            </button>
          </div>
        </div>

        {/* Mobile Split Switcher */}
        {hasPassage && (
          <div className="lg:hidden border-t-2 border-zinc-900 bg-[#FAF7F0] px-3 py-1.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMobileTab('passage')}
              className={`py-1.5 px-3 rounded-lg text-xs font-extrabold border-2 border-zinc-900 transition ${
                mobileTab === 'passage'
                  ? 'bg-[#BAE6FD] text-zinc-950 shadow-[2px_2px_0px_#18181B]'
                  : 'bg-white text-zinc-800'
              }`}
            >
              Teks Bacaan
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('question')}
              className={`py-1.5 px-3 rounded-lg text-xs font-extrabold border-2 border-zinc-900 transition ${
                mobileTab === 'question'
                  ? 'bg-[#DCD6FF] text-zinc-950 shadow-[2px_2px_0px_#18181B]'
                  : 'bg-white text-zinc-800'
              }`}
            >
              Pertanyaan &amp; Opsi
            </button>
          </div>
        )}
      </header>

      {/* Main Split-Screen Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 flex flex-col lg:flex-row gap-5">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[65vh]">
          {/* Left Panel: Reading Passage */}
          {hasPassage && (
            <div
              className={`lg:col-span-6 bg-white nb-card rounded-2xl flex-col overflow-hidden lg:max-h-[calc(100vh-120px)] ${
                mobileTab === 'passage' ? 'flex' : 'hidden lg:flex'
              }`}
            >
              <div className="px-4 py-3 bg-[#BAE6FD] border-b-2 border-zinc-900 flex items-center justify-between">
                <span className="text-xs font-extrabold tracking-wide text-zinc-950">
                  Wacana / Teks Bacaan
                </span>
                <span className="text-[11px] text-zinc-800 font-bold">Gulir mandiri</span>
              </div>
              <div
                ref={passageContainerRef}
                style={{ fontSize: `${fontSize}px` }}
                className="p-5 sm:p-6 overflow-y-auto custom-scroll formatted-content font-serif text-zinc-900 leading-relaxed flex-1"
                dangerouslySetInnerHTML={{ __html: sanitizeFormattedHtml(currentQuestion.passage) }}
              />
            </div>
          )}

          {/* Right Panel: Question & Options */}
          <div
            className={`${
              hasPassage ? 'lg:col-span-6' : 'lg:col-span-12'
            } bg-white nb-card rounded-2xl flex-col overflow-hidden lg:max-h-[calc(100vh-120px)] ${
              hasPassage && mobileTab === 'passage' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="px-4 sm:px-6 py-3 bg-[#DCD6FF] border-b-2 border-zinc-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 tabular-nums">
                <span className="px-3 py-1 rounded-lg bg-white border-2 border-zinc-900 text-zinc-950 font-extrabold text-xs sm:text-sm">
                  Soal No. {currentIndex + 1}
                </span>
                <span className="text-xs font-bold text-zinc-800">dari {questions.length} soal</span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDoubts((prev) => ({
                    ...prev,
                    [currentQuestion.id]: !prev[currentQuestion.id]
                  }))
                }
                aria-pressed={isDoubt}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold nb-btn-sm ${
                  isDoubt
                    ? 'bg-[#FEF08A] text-zinc-950'
                    : 'bg-white text-zinc-900 hover:bg-[#FEF08A]'
                }`}
              >
                <span>{isDoubt ? '☑' : '☐'}</span>
                <span>Ragu-ragu</span>
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto custom-scroll flex-1 space-y-5">
              <div
                style={{ fontSize: `${fontSize}px` }}
                className="formatted-content text-zinc-950 font-semibold leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeFormattedHtml(currentQuestion.question) }}
              />

              <div
                className="space-y-3"
                style={{ fontSize: `${Math.max(13, fontSize - 1)}px` }}
                role="radiogroup"
                aria-label={`Pilihan jawaban soal nomor ${currentIndex + 1}`}
              >
                {optKeys.map((key) => {
                  const isSelected = selectedOpt === key;
                  const rawOpt = currentQuestion.options?.[key] || '';
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [currentQuestion.id]: key
                        }))
                      }
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl border-2 border-zinc-900 transition flex items-start gap-3.5 ${
                        isSelected
                          ? 'bg-[#DCD6FF] shadow-[4px_4px_0px_#18181B]'
                          : 'bg-white hover:bg-[#FAF7F0] shadow-[2px_2px_0px_#18181B]'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-lg border-2 border-zinc-900 flex items-center justify-center text-xs sm:text-sm font-extrabold shrink-0 transition ${
                          isSelected
                            ? 'bg-[#FEF08A] text-zinc-950'
                            : 'bg-[#FAF7F0] text-zinc-900'
                        }`}
                      >
                        {key}
                      </span>
                      <span
                        className="formatted-content flex-1 pt-0.5 text-zinc-900 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: sanitizeFormattedHtml(rawOpt) }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3.5 bg-[#FAF7F0] border-t-2 border-zinc-900 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-white text-zinc-900 hover:bg-[#FEF08A] disabled:opacity-40 disabled:pointer-events-none nb-btn-sm"
              >
                ← Sebelumnya
              </button>

              {currentIndex === questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmFinish(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-[#BBF7D0] hover:bg-[#86EFAC] text-zinc-950 nb-btn"
                >
                  Selesai &amp; Kumpulkan ✓
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-[#C4B5FD] hover:bg-[#B39FFB] text-zinc-950 nb-btn"
                >
                  Selanjutnya →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Navigator Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 bg-white nb-card rounded-2xl p-4 flex flex-col justify-between lg:max-h-[calc(100vh-120px)]">
          <div>
            <h2 className="text-xs font-extrabold tracking-wide text-zinc-900 mb-3 flex items-center justify-between tabular-nums">
              <span>Navigasi Nomor Soal</span>
              <span className="bg-[#DCD6FF] border border-zinc-900 px-2 py-0.5 rounded font-extrabold text-zinc-950">
                {answeredCount}/{questions.length}
              </span>
            </h2>

            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2 max-h-60 lg:max-h-[42vh] overflow-y-auto custom-scroll pr-1">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const qDoubt = Boolean(doubts[q.id]);
                const qAnswered = Boolean(answers[q.id]);

                let colorClass = 'bg-white text-zinc-900 hover:bg-[#FAF7F0]';
                if (qDoubt) {
                  colorClass = 'bg-[#FEF08A] text-zinc-950';
                } else if (qAnswered) {
                  colorClass = 'bg-[#BBF7D0] text-zinc-950';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Soal nomor ${idx + 1}`}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`h-9 rounded-lg border-2 border-zinc-900 text-xs font-extrabold transition flex items-center justify-center tabular-nums ${colorClass} ${
                      isCurrent ? 'shadow-[3px_3px_0px_#18181B] -translate-y-0.5' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t-2 border-zinc-900/15 space-y-2 text-xs font-semibold text-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-[#BBF7D0] border-2 border-zinc-900 inline-block shrink-0" />
              <span>Sudah dijawab</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-[#FEF08A] border-2 border-zinc-900 inline-block shrink-0" />
              <span>Ragu-ragu</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-white border-2 border-zinc-900 inline-block shrink-0" />
              <span>Belum dijawab</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Confirm Finish Modal */}
      {showConfirmFinish && (
        <div
          className="fixed inset-0 bg-zinc-950/55 z-40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-finish-title"
        >
          <div className="bg-white nb-card-lg rounded-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-[#BBF7D0] border-b-2 border-zinc-900 px-6 py-4">
              <h2 id="confirm-finish-title" className="text-lg font-extrabold text-zinc-950">
                Konfirmasi Pengumpulan Ujian
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-800 leading-relaxed">
                Anda telah menjawab <strong>{answeredCount}</strong> dari{' '}
                <strong>{questions.length}</strong> soal.
                {unansweredCount > 0 ? (
                  <span className="text-zinc-950 bg-[#FEF08A] border-2 border-zinc-900 rounded-lg px-2.5 py-1.5 font-bold block mt-2 text-xs">
                    Masih ada {unansweredCount} soal yang belum dijawab.
                  </span>
                ) : (
                  <span className="text-zinc-950 bg-[#BBF7D0] border-2 border-zinc-900 rounded-lg px-2.5 py-1.5 font-bold block mt-2 text-xs">
                    Seluruh soal sudah terisi dengan lengkap.
                  </span>
                )}
              </p>
              <div className="flex justify-end gap-3 pt-2 border-t-2 border-zinc-900/10">
                <button
                  type="button"
                  onClick={() => setShowConfirmFinish(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-900 bg-white hover:bg-[#FAF7F0] nb-btn-sm"
                >
                  Periksa Kembali
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmFinish(false);
                    finalizeExam(false);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#BBF7D0] hover:bg-[#86EFAC] text-zinc-950 text-sm font-extrabold nb-btn"
                >
                  Ya, Kumpulkan Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Anti-Cheating Warning Modal (Violations 1 & 2) */}
      {violationModalReason && (
        <div
          className="fixed inset-0 bg-zinc-950/55 z-50 flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="violation-modal-title"
        >
          <div className="bg-white nb-card-lg rounded-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-[#FECDD3] border-b-2 border-zinc-900 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-900 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-zinc-950" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 tabular-nums">
                  Peringatan Anti-Nyontek ({violationCount}/3)
                </p>
                <h2 id="violation-modal-title" className="text-base font-extrabold text-zinc-950">
                  Pelanggaran Fokus Layar Terdeteksi!
                </h2>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-800 font-medium leading-relaxed">
                {violationModalReason}
              </p>

              <div className="rounded-xl bg-[#FEF08A] border-2 border-zinc-900 p-3.5 text-xs text-zinc-950 leading-relaxed">
                Sisa toleransi Anda tinggal <strong>{3 - violationCount} kali</strong>. Jika
                mencapai <strong>3 kali pelanggaran</strong>, ujian akan langsung dihentikan (
                <strong>BANNED</strong>) dan jawaban Anda dikumpulkan otomatis.
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setViolationModalReason(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#FECDD3] hover:bg-[#FDA4AF] text-zinc-950 text-sm font-extrabold nb-btn"
                >
                  Saya Mengerti &amp; Lanjutkan Ujian
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
