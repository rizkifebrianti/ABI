export type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E';

export type PackageStatus = 'Published' | 'Draft' | 'Closed';

export type PackageCategory = 'SMP' | 'SMA' | 'UTBK / SNBT' | 'Kedinasan / CPNS';

export interface QuestionOptions {
  A: string;
  B: string;
  C: string;
  D: string;
  E: string;
}

export interface Question {
  id: string;
  passage: string;
  question: string;
  options: QuestionOptions;
  correctAnswer: OptionKey;
  explanation: string;
}

export interface ExamPackage {
  id: string;
  title: string;
  category: PackageCategory;
  duration: number;
  token: string;
  status: PackageStatus;
  showExplanation: boolean;
  createdAt: string;
  questions: Question[];
}

export interface ExamResult {
  id: string;
  packageId: string;
  packageTitle: string;
  category: PackageCategory | string;
  studentName: string;
  studentClass: string;
  finishedAt: string;
  durationUsedSeconds: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  totalQuestions: number;
  score: number;
  violationCount: number;
  isBanned: boolean;
  examStatus: string;
  _firebaseKey?: string;
}

export interface ActiveExamSession {
  pkg: ExamPackage;
  studentName: string;
  studentClass: string;
  answers: Record<string, OptionKey>;
  doubts: Record<string, boolean>;
  totalSeconds: number;
  remainingSeconds: number;
  violationCount: number;
  isBanned: boolean;
}

export interface LastResultBundle {
  record: ExamResult;
  pkg: ExamPackage;
  answers: Record<string, OptionKey>;
}

export type CloudStatusState = 'local' | 'syncing' | 'connected';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}
