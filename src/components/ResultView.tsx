import React from 'react';
import { ShieldCheck, ShieldAlert, Ban } from 'lucide-react';
import type { LastResultBundle, OptionKey } from '../types/cat';
import { formatDateIndo, sanitizeFormattedHtml, stripHtmlToText } from '../utils/htmlSanitizer';
import { getScorePredicate } from '../utils/examLogic';

interface ResultViewProps {
  bundle: LastResultBundle;
  onReturnHome: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ bundle, onReturnHome }) => {
  const { record, pkg, answers } = bundle;
  const predicate = getScorePredicate(record.score, record.isBanned);

  const predicateStyles: Record<typeof predicate.tone, string> = {
    danger: 'bg-[#FECDD3] text-zinc-950',
    success: 'bg-[#BBF7D0] text-zinc-950',
    primary: 'bg-[#DCD6FF] text-zinc-950',
    warning: 'bg-[#FEF08A] text-zinc-950'
  };

  const bannerConfig = record.isBanned
    ? {
        cls: 'bg-[#FECDD3] text-zinc-950',
        icon: <Ban className="w-5 h-5 shrink-0 text-zinc-950" aria-hidden="true" />,
        title: 'UJIAN DIBANNED & DIKUMPULKAN OTOMATIS',
        desc: `Siswa tercatat melakukan ${record.violationCount} kali pelanggaran keluar dari layar/tab ujian.`
      }
    : record.violationCount > 0
    ? {
        cls: 'bg-[#FEF08A] text-zinc-950',
        icon: <ShieldAlert className="w-5 h-5 shrink-0 text-zinc-950" aria-hidden="true" />,
        title: 'Catatan Pengawasan Ujian',
        desc: `${record.violationCount} kali pelanggaran terdeteksi — Ujian Selesai Normal.`
      }
    : {
        cls: 'bg-[#BBF7D0] text-zinc-950',
        icon: <ShieldCheck className="w-5 h-5 shrink-0 text-zinc-950" aria-hidden="true" />,
        title: 'Status Pengawasan Ujian Bersih',
        desc: '0 kali pelanggaran — Ujian Selesai Normal tanpa berpindah tab/aplikasi.'
      };

  return (
    <section className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Main Score Card */}
      <div className="bg-white nb-card-lg rounded-2xl overflow-hidden mb-8">
        <div className="bg-[#DCD6FF] border-b-2 border-zinc-900 p-6 sm:p-8 text-zinc-950 text-center">
          <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-800 mb-2">
            Hasil Evaluasi Ujian CAT
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold mb-1">{record.packageTitle}</h1>
          <p className="text-zinc-800 text-sm font-medium">
            Peserta: <strong className="text-zinc-950">{record.studentName}</strong>
            <span className="mx-2 text-zinc-600">·</span>
            Kelas: <strong className="text-zinc-950">{record.studentClass}</strong>
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <div
            className={`mb-6 rounded-xl p-4 border-2 border-zinc-900 flex items-start sm:items-center gap-3 text-xs sm:text-sm font-semibold ${bannerConfig.cls}`}
            data-testid="result-violation-banner"
          >
            {bannerConfig.icon}
            <div className="flex-1">
              <span className="font-extrabold block">{bannerConfig.title}</span>
              <span className="font-medium">{bannerConfig.desc}</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-around gap-6 pb-6 border-b-2 border-zinc-900/15">
            <div className="text-center">
              <div className="w-36 h-36 rounded-full border-2 border-zinc-900 shadow-[4px_4px_0px_#18181B] bg-[#FEF08A] flex flex-col items-center justify-center mx-auto tabular-nums">
                <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-800">
                  Skor Akhir
                </span>
                <span
                  className="text-4xl font-black text-zinc-950 mt-0.5"
                  data-testid="result-score-value"
                >
                  {record.score}
                </span>
              </div>
              <span
                className={`inline-block mt-3 px-3 py-1 rounded-lg border-2 border-zinc-900 text-xs font-extrabold ${predicateStyles[predicate.tone]}`}
              >
                {predicate.label}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-5 w-full md:w-auto tabular-nums">
              <div className="bg-[#BBF7D0] border-2 border-zinc-900 shadow-[3px_3px_0px_#18181B] rounded-xl p-4 text-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-zinc-950 block">
                  {record.correctCount}
                </span>
                <span className="text-xs font-bold text-zinc-900 mt-1 block">Jawaban Benar</span>
              </div>
              <div className="bg-[#FECDD3] border-2 border-zinc-900 shadow-[3px_3px_0px_#18181B] rounded-xl p-4 text-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-zinc-950 block">
                  {record.wrongCount}
                </span>
                <span className="text-xs font-bold text-zinc-900 mt-1 block">Jawaban Salah</span>
              </div>
              <div className="bg-[#FAF7F0] border-2 border-zinc-900 shadow-[3px_3px_0px_#18181B] rounded-xl p-4 text-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-zinc-950 block">
                  {record.blankCount}
                </span>
                <span className="text-xs font-bold text-zinc-800 mt-1 block">Tidak Dijawab</span>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs font-medium text-zinc-600">
              Selesai dikerjakan pada {formatDateIndo(record.finishedAt)}
            </p>
            <button
              type="button"
              onClick={onReturnHome}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#C4B5FD] hover:bg-[#B39FFB] text-zinc-950 text-sm font-extrabold nb-btn"
            >
              ← Kembali ke Halaman Awal
            </button>
          </div>
        </div>
      </div>

      {/* Answer Key & Explanation Breakdown */}
      {pkg.showExplanation && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-extrabold text-zinc-950">
              Rincian Kunci Jawaban &amp; Pembahasan
            </h2>
            <span className="text-xs font-bold text-zinc-700">Evaluasi per butir soal</span>
          </div>

          <div className="space-y-5">
            {(pkg.questions || []).map((q, idx) => {
              const userAns = answers[q.id] || null;
              const isCorrect = userAns === q.correctAnswer;
              const optKeys: OptionKey[] = (['A', 'B', 'C', 'D', 'E'] as OptionKey[]).filter(
                (k) => k !== 'E' || Boolean(stripHtmlToText(q.options?.E))
              );

              return (
                <article
                  key={q.id}
                  className="bg-white nb-card rounded-2xl p-5 sm:p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-zinc-900/15 pb-3">
                    <span className="font-extrabold text-sm text-zinc-950 bg-[#DCD6FF] border border-zinc-900 px-2.5 py-0.5 rounded-lg">
                      Soal Nomor {idx + 1}
                    </span>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span>
                        Jawaban Anda: <strong>{userAns || '-'}</strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Kunci: <strong>{q.correctAnswer}</strong>
                      </span>
                      {!userAns ? (
                        <span className="px-2 py-0.5 rounded-md border border-zinc-900 font-bold bg-[#FAF7F0] text-zinc-800">
                          Tidak Dijawab
                        </span>
                      ) : isCorrect ? (
                        <span className="px-2 py-0.5 rounded-md border border-zinc-900 font-extrabold bg-[#BBF7D0] text-zinc-950">
                          ✓ Benar
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md border border-zinc-900 font-extrabold bg-[#FECDD3] text-zinc-950">
                          ✕ Salah
                        </span>
                      )}
                    </div>
                  </div>

                  {stripHtmlToText(q.passage) && (
                    <div
                      className="bg-[#FAF7F0] border-2 border-zinc-900 rounded-xl p-4 text-xs sm:text-sm font-serif text-zinc-800 formatted-content max-h-48 overflow-y-auto custom-scroll"
                      dangerouslySetInnerHTML={{ __html: sanitizeFormattedHtml(q.passage) }}
                    />
                  )}

                  <div
                    className="formatted-content text-sm sm:text-base font-semibold text-zinc-950"
                    dangerouslySetInnerHTML={{ __html: sanitizeFormattedHtml(q.question) }}
                  />

                  <div className="space-y-2 text-xs sm:text-sm">
                    {optKeys.map((k) => {
                      const isKey = k === q.correctAnswer;
                      const isPickedWrong = k === userAns && !isKey;
                      const cls = isKey
                        ? 'bg-[#BBF7D0] border-zinc-900 text-zinc-950 font-semibold'
                        : isPickedWrong
                        ? 'bg-[#FECDD3] border-zinc-900 text-zinc-950'
                        : 'bg-white border-zinc-900/30 text-zinc-800';

                      return (
                        <div
                          key={k}
                          className={`p-2.5 rounded-xl border-2 flex items-start gap-2.5 ${cls}`}
                        >
                          <span className="font-extrabold shrink-0">{k}.</span>
                          <span
                            className="formatted-content flex-1"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeFormattedHtml(q.options?.[k] || '')
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {stripHtmlToText(q.explanation) && (
                    <div className="bg-[#BAE6FD] border-2 border-zinc-900 rounded-xl p-4 text-xs sm:text-sm text-zinc-950 space-y-1">
                      <span className="font-extrabold block text-xs uppercase tracking-wider">
                        Pembahasan:
                      </span>
                      <div
                        className="formatted-content leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: sanitizeFormattedHtml(q.explanation) }}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
