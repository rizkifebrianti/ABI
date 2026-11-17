import type { ExamPackage, ExamResult } from '../types/cat';

export function normalizeFirebaseList(rawData: unknown): ExamPackage[] {
  if (!rawData || typeof rawData !== 'object') return [];
  const list = Array.isArray(rawData) ? rawData : Object.values(rawData);
  return (list as Array<Partial<ExamPackage> | null | undefined>)
    .filter((pkg): pkg is Partial<ExamPackage> => Boolean(pkg && typeof pkg === 'object'))
    .map((pkg) => {
      const rawQuestions = pkg.questions as unknown;
      const normalizedQuestions = Array.isArray(rawQuestions)
        ? rawQuestions.filter(Boolean)
        : rawQuestions && typeof rawQuestions === 'object'
        ? Object.values(rawQuestions).filter(Boolean)
        : [];
      return {
        id: pkg.id || `pkg-${Date.now()}`,
        title: pkg.title || 'Paket Tanpa Judul',
        category: pkg.category || 'UTBK / SNBT',
        duration: Number(pkg.duration) || 30,
        token: pkg.token || 'INDO2026',
        status: pkg.status || 'Published',
        showExplanation: pkg.showExplanation !== false,
        createdAt: pkg.createdAt || new Date().toISOString(),
        questions: normalizedQuestions
      };
    });
}

export async function fetchPackagesFromFirebase(dbUrl: string): Promise<ExamPackage[]> {
  const res = await fetch(`${dbUrl}/packages.json`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  return normalizeFirebaseList(data);
}

export async function pushPackagesToFirebase(dbUrl: string, packages: ExamPackage[]): Promise<void> {
  const res = await fetch(`${dbUrl}/packages.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(packages)
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function postResultToFirebase(dbUrl: string, result: ExamResult): Promise<string | null> {
  const payload = { ...result };
  delete payload._firebaseKey;
  const res = await fetch(`${dbUrl}/results.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = (await res.json()) as { name?: string } | null;
  return json?.name || null;
}

export async function fetchResultsFromFirebase(dbUrl: string): Promise<ExamResult[]> {
  const res = await fetch(`${dbUrl}/results.json`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const raw = (await res.json()) as Record<string, ExamResult> | null;
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw)
    .filter(([, val]) => Boolean(val && typeof val === 'object'))
    .map(([fbKey, val]) => ({
      ...val,
      _firebaseKey: fbKey
    }));
}

export async function deleteResultFromFirebase(dbUrl: string, firebaseKey: string): Promise<void> {
  await fetch(`${dbUrl}/results/${firebaseKey}.json`, { method: 'DELETE' });
}
