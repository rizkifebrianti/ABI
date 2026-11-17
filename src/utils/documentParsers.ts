import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ExamPackage, ExamResult, Question } from '../types/cat';
import { escapeHtmlText, formatDateIndo, sanitizeFormattedHtml, stripHtmlToText } from './htmlSanitizer';
import { parseExcelRowsToQuestions, parseStructuredBlocksToQuestions } from './examLogic';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function parseQuestionsFromFile(file: File): Promise<Question[]> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
    return parseExcelRowsToQuestions(rows);
  }

  if (ext === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value || '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const blocks = Array.from(tempDiv.querySelectorAll('p, li'))
      .map((el) => sanitizeFormattedHtml(el.innerHTML))
      .filter((line) => stripHtmlToText(line).length > 0);
    return parseStructuredBlocksToQuestions(blocks);
  }

  if (ext === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const lines: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      let currentLine = '';
      let lastY: number | null = null;

      for (const rawItem of content.items) {
        if (!('str' in rawItem)) continue;
        const item = rawItem as { str: string; transform?: number[]; fontName?: string };
        const y = item.transform ? Math.round(item.transform[5]) : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 6) {
          if (stripHtmlToText(currentLine)) lines.push(sanitizeFormattedHtml(currentLine));
          currentLine = '';
        }
        lastY = y;

        let str = escapeHtmlText(item.str || '');
        const fontName = (item.fontName || '').toLowerCase();
        if (fontName.includes('bold') && fontName.includes('italic')) {
          str = `<b><i>${str}</i></b>`;
        } else if (fontName.includes('bold')) {
          str = `<b>${str}</b>`;
        } else if (fontName.includes('italic') || fontName.includes('oblique')) {
          str = `<i>${str}</i>`;
        }
        currentLine += str + ' ';
      }

      if (stripHtmlToText(currentLine)) {
        lines.push(sanitizeFormattedHtml(currentLine));
      }
    }

    return parseStructuredBlocksToQuestions(lines);
  }

  throw new Error('Format file tidak didukung. Gunakan .xlsx, .xls, .csv, .docx, atau .pdf.');
}

export function downloadExcelTemplateFile(): void {
  const sampleRows = [
    {
      'Teks Bacaan':
        '<p>Penggunaan bahasa Indonesia yang baik dan benar dalam karya tulis ilmiah menuntut ketelitian terhadap kaidah <i>Ejaan Bahasa Indonesia yang Disempurnakan (EYD) Edisi V</i>.</p>',
      Pertanyaan: 'Penulisan kata serapan yang <b>BAKU</b> sesuai kaidah EYD Edisi V adalah ....',
      'Opsi A': 'apotik',
      'Opsi B': 'analisa',
      'Opsi C': 'diagnosis',
      'Opsi D': 'resiko',
      'Opsi E': 'praktek',
      'Kunci Jawaban': 'C',
      Pembahasan:
        'Bentuk baku dalam KBBI adalah <b>diagnosis</b>, <i>apotek</i>, <i>analisis</i>, <i>risiko</i>, dan <i>praktik</i>.'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Soal_CAT');
  XLSX.writeFile(wb, 'Template_Import_Soal_CAT_Bahasa_Indonesia.xlsx');
}

export function exportScoresWorkbook(results: ExamResult[], format: 'xlsx' | 'csv'): void {
  const rows = results.map((r, i) => {
    const vCount = Number(r.violationCount || 0);
    const isBanned = Boolean(r.isBanned) || vCount >= 3;
    return {
      No: i + 1,
      'Nama Lengkap Siswa': r.studentName,
      Kelas: r.studentClass || '-',
      'Paket Soal': r.packageTitle,
      Jenjang: r.category,
      'Waktu Selesai': formatDateIndo(r.finishedAt),
      'Jumlah Pelanggaran': vCount,
      'Keterangan Status Ujian': isBanned ? 'BANNED (3x Pelanggaran)' : 'Selesai Normal',
      'Jawaban Benar': r.correctCount,
      'Jawaban Salah': r.wrongCount,
      'Tidak Dijawab': r.blankCount,
      'Skor Akhir': r.score
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap_Nilai_CAT');

  if (format === 'csv') {
    XLSX.writeFile(wb, 'Rekap_Nilai_CAT_Bahasa_Indonesia.csv', { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, 'Rekap_Nilai_CAT_Bahasa_Indonesia.xlsx');
  }
}

export function exportBankJsonFile(packages: ExamPackage[]): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'CAT Bahasa Indonesia',
    packages
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Backup_Bank_Soal_CAT_Bindo_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
