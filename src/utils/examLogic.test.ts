import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateExamScore,
  getScorePredicate,
  formatTimerClock,
  parseStructuredBlocksToQuestions,
  parseExcelRowsToQuestions
} from './examLogic';
import { sanitizeFormattedHtml, stripHtmlToText } from './htmlSanitizer';
import type { Question } from '../types/cat';

const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'q1',
    passage: '<p>Wacana uji</p>',
    question: 'Soal 1',
    options: { A: 'Opsi A', B: 'Opsi B', C: 'Opsi C', D: 'Opsi D', E: '' },
    correctAnswer: 'B',
    explanation: 'Penjelasan 1'
  },
  {
    id: 'q2',
    passage: '',
    question: 'Soal 2',
    options: { A: 'Opsi A', B: 'Opsi B', C: 'Opsi C', D: 'Opsi D', E: 'Opsi E' },
    correctAnswer: 'D',
    explanation: 'Penjelasan 2'
  }
];

test('sanitizeFormattedHtml preserves EYD V formatting tags and strips scripts', () => {
  const dirty =
    '<p>Istilah <i>artificial intelligence</i> dan <b>EYD V</b> serta <u>garis bawah</u>.<script>alert(1)</script><span onclick="hack()">aman</span></p>';
  const clean = sanitizeFormattedHtml(dirty);
  assert.match(clean, /<i>artificial intelligence<\/i>/);
  assert.match(clean, /<b>EYD V<\/b>/);
  assert.match(clean, /<u>garis bawah<\/u>/);
  assert.doesNotMatch(clean, /<script>/i);
  assert.doesNotMatch(clean, /onclick=/i);
});

test('stripHtmlToText converts formatted HTML into clean readable plain text', () => {
  assert.equal(stripHtmlToText('<p>Halo <i>Dunia</i> &amp; EYD</p>'), 'Halo Dunia & EYD');
});

test('calculateExamScore counts correct, wrong, blank, and percentage score', () => {
  const result = calculateExamScore(SAMPLE_QUESTIONS, { q1: 'B' });
  assert.equal(result.correctCount, 1);
  assert.equal(result.wrongCount, 0);
  assert.equal(result.blankCount, 1);
  assert.equal(result.totalQuestions, 2);
  assert.equal(result.score, 50);

  const allCorrect = calculateExamScore(SAMPLE_QUESTIONS, { q1: 'B', q2: 'D' });
  assert.equal(allCorrect.score, 100);
});

test('getScorePredicate distinguishes banned vs score tiers', () => {
  assert.equal(getScorePredicate(100, true).tone, 'danger');
  assert.equal(getScorePredicate(90, false).label, 'Sangat Memuaskan');
  assert.equal(getScorePredicate(75, false).label, 'Baik / Lulus KKM');
  assert.equal(getScorePredicate(50, false).label, 'Perlu Pendalaman Materi');
});

test('formatTimerClock formats mm:ss with zero padding', () => {
  assert.equal(formatTimerClock(1500), '25:00');
  assert.equal(formatTimerClock(65), '01:05');
  assert.equal(formatTimerClock(-5), '00:00');
});

test('parseStructuredBlocksToQuestions extracts wacana, formatted options, key, and explanation', () => {
  const blocks = [
    'Wacana: Penggunaan kata <i>daring</i> sudah baku.',
    '1. Manakah penulisan yang <b>tepat</b>?',
    'A. <i>online</i> saja',
    'B. daring tanpa cetak miring',
    'C. <u>daring</u> miring',
    'D. DARiNG',
    'Kunci: B',
    'Pembahasan: Kata <b>daring</b> sudah diserap resmi.'
  ];
  const parsed = parseStructuredBlocksToQuestions(blocks);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].correctAnswer, 'B');
  assert.match(parsed[0].passage, /<i>daring<\/i>/);
  assert.match(parsed[0].question, /<b>tepat<\/b>/);
  assert.equal(parsed[0].options.B, 'daring tanpa cetak miring');
  assert.match(parsed[0].explanation, /<b>daring<\/b>/);
});

test('parseExcelRowsToQuestions normalizes column aliases and formatting', () => {
  const parsed = parseExcelRowsToQuestions([
    {
      'Teks Bacaan': '<p>Wacana</p>',
      Pertanyaan: 'Soal <b>baku</b>',
      'Opsi A': 'apotik',
      'Opsi B': 'apotek',
      'Opsi C': 'analisa',
      'Opsi D': 'resiko',
      'Kunci Jawaban': 'b',
      Pembahasan: 'Bentuk baku adalah <b>apotek</b>.'
    }
  ]);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].correctAnswer, 'B');
  assert.equal(parsed[0].options.B, 'apotek');
});
