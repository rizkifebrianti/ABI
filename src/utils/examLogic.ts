import type { ExamPackage, ExamResult, OptionKey, Question } from '../types/cat';
import { sanitizeFormattedHtml, stripHtmlToText } from './htmlSanitizer';

export interface ScoreComputation {
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  totalQuestions: number;
  score: number;
}

export function calculateExamScore(
  questions: Question[],
  answers: Record<string, OptionKey | undefined>
): ScoreComputation {
  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;

  for (const q of questions) {
    const userAns = answers[q.id];
    if (!userAns) {
      blankCount += 1;
    } else if (userAns === q.correctAnswer) {
      correctCount += 1;
    } else {
      wrongCount += 1;
    }
  }

  const totalQuestions = questions.length;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return {
    correctCount,
    wrongCount,
    blankCount,
    totalQuestions,
    score
  };
}

export interface ScorePredicate {
  label: string;
  tone: 'danger' | 'success' | 'primary' | 'warning';
}

export function getScorePredicate(score: number, isBanned: boolean): ScorePredicate {
  if (isBanned) {
    return { label: 'Diskualifikasi (Batas Pelanggaran)', tone: 'danger' };
  }
  if (score >= 85) {
    return { label: 'Sangat Memuaskan', tone: 'success' };
  }
  if (score >= 70) {
    return { label: 'Baik / Lulus KKM', tone: 'primary' };
  }
  return { label: 'Perlu Pendalaman Materi', tone: 'warning' };
}

export function formatTimerClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const remSec = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
}

export function buildExamResultRecord(params: {
  pkg: ExamPackage;
  studentName: string;
  studentClass: string;
  answers: Record<string, OptionKey>;
  totalSeconds: number;
  remainingSeconds: number;
  violationCount: number;
  isForcedBan: boolean;
  finishedAt?: string;
}): ExamResult {
  const questions = params.pkg.questions || [];
  const stats = calculateExamScore(questions, params.answers);
  const durationUsedSeconds = Math.max(1, params.totalSeconds - params.remainingSeconds);
  const finishedAt = params.finishedAt || new Date().toISOString();

  const examStatus = params.isForcedBan
    ? `${params.violationCount} kali pelanggaran - BANNED (Ujian Dihentikan & Dikumpulkan Otomatis)`
    : `${params.violationCount} kali pelanggaran - Ujian Selesai Normal`;

  return {
    id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    packageId: params.pkg.id,
    packageTitle: params.pkg.title,
    category: params.pkg.category,
    studentName: params.studentName,
    studentClass: params.studentClass,
    finishedAt,
    durationUsedSeconds,
    correctCount: stats.correctCount,
    wrongCount: stats.wrongCount,
    blankCount: stats.blankCount,
    totalQuestions: stats.totalQuestions,
    score: stats.score,
    violationCount: params.violationCount,
    isBanned: params.isForcedBan,
    examStatus
  };
}

export function parseStructuredBlocksToQuestions(blocks: string[]): Question[] {
  const questions: Question[] = [];
  let sharedPassage = '';
  let current: {
    passage: string;
    question: string;
    options: Record<OptionKey, string>;
    correctAnswer: OptionKey;
    explanation: string;
  } | null = null;

  const pushCurrent = () => {
    if (current && stripHtmlToText(current.question) && stripHtmlToText(current.options.A)) {
      questions.push({
        id: `q-doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        passage: current.passage || sharedPassage,
        question: current.question,
        options: current.options,
        correctAnswer: current.correctAnswer || 'A',
        explanation: current.explanation || ''
      });
    }
    current = null;
  };

  for (const htmlLine of blocks) {
    const plain = stripHtmlToText(htmlLine);
    if (!plain) continue;

    if (/^(wacana|teks\s*bacaan|bacaan)\s*[:.-]/i.test(plain)) {
      pushCurrent();
      sharedPassage = htmlLine.replace(/^(<[^>]+>)*\s*(wacana|teks\s*bacaan|bacaan)\s*[:.-]\s*/i, '');
      continue;
    }

    if (/^\d+[.)]\s+/.test(plain)) {
      pushCurrent();
      const qClean = htmlLine.replace(/^(<[^>]+>)*\s*\d+[.)]\s*/, '');
      current = {
        passage: sharedPassage,
        question: qClean,
        options: { A: '', B: '', C: '', D: '', E: '' },
        correctAnswer: 'A',
        explanation: ''
      };
      continue;
    }

    if (!current) {
      sharedPassage = sharedPassage ? `${sharedPassage}<p>${htmlLine}</p>` : `<p>${htmlLine}</p>`;
      continue;
    }

    const optMatch = plain.match(/^([A-E])[.)]\s+/i);
    if (optMatch) {
      const letter = optMatch[1].toUpperCase() as OptionKey;
      current.options[letter] = htmlLine.replace(/^(<[^>]+>)*\s*[A-E][.)]\s*/i, '');
      continue;
    }

    const keyMatch = plain.match(/^(kunci(\s*jawaban)?|jawaban)\s*[:.-]\s*([A-E])/i);
    if (keyMatch) {
      current.correctAnswer = keyMatch[3].toUpperCase() as OptionKey;
      continue;
    }

    if (/^(pembahasan|penjelasan)\s*[:.-]/i.test(plain)) {
      current.explanation = htmlLine.replace(/^(<[^>]+>)*\s*(pembahasan|penjelasan)\s*[:.-]\s*/i, '');
      continue;
    }

    if (current.explanation) {
      current.explanation += `<br/>${htmlLine}`;
    } else if (!stripHtmlToText(current.options.A)) {
      current.question += `<br/>${htmlLine}`;
    }
  }

  pushCurrent();
  return questions;
}

export function parseExcelRowsToQuestions(rows: Array<Record<string, unknown>>): Question[] {
  return rows
    .map((row) => {
      const getCol = (keys: string[]) => {
        for (const k of Object.keys(row)) {
          const norm = k.trim().toLowerCase();
          if (keys.includes(norm)) return String(row[k] ?? '').trim();
        }
        return '';
      };

      const passage = sanitizeFormattedHtml(getCol(['teks bacaan', 'wacana', 'bacaan', 'passage']));
      const question = sanitizeFormattedHtml(getCol(['pertanyaan', 'soal', 'question']));
      const optA = sanitizeFormattedHtml(getCol(['opsi a', 'pilihan a', 'a']));
      const optB = sanitizeFormattedHtml(getCol(['opsi b', 'pilihan b', 'b']));
      const optC = sanitizeFormattedHtml(getCol(['opsi c', 'pilihan c', 'c']));
      const optD = sanitizeFormattedHtml(getCol(['opsi d', 'pilihan d', 'd']));
      const optE = sanitizeFormattedHtml(getCol(['opsi e', 'pilihan e', 'e']));
      let key = getCol(['kunci jawaban', 'kunci', 'jawaban', 'answer'])
        .toUpperCase()
        .replace(/[^A-E]/g, '');
      if (!key) key = 'A';
      const explanation = sanitizeFormattedHtml(getCol(['pembahasan', 'penjelasan', 'explanation']));

      if (!stripHtmlToText(question) || !stripHtmlToText(optA)) return null;

      return {
        id: `q-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        passage,
        question,
        options: { A: optA, B: optB, C: optC, D: optD, E: optE },
        correctAnswer: key.charAt(0) as OptionKey,
        explanation
      };
    })
    .filter((q): q is Question => q !== null);
}
