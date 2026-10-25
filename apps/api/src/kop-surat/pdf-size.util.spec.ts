import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { detectPdfPaperSize } from './pdf-size.util';

const pdfWithMediaBox = (width: number, height: number) =>
  Buffer.from(`%PDF-1.7\n1 0 obj\n<< /MediaBox [0 0 ${width} ${height}] >>\nendobj`);

describe('detectPdfPaperSize', () => {
  it.each([
    [595.28, 841.89, 'A4'],
    [612, 792, 'Letter'],
    [612, 1008, 'Legal'],
    [419.53, 595.28, 'A5'],
    [841.89, 1190.55, 'A3'],
  ])('detects %s paper', (width, height, expected) => {
    expect(detectPdfPaperSize(pdfWithMediaBox(width, height)).paperSize).toBe(expected);
  });

  it('detects a compressed MediaBox and preserves custom dimensions', () => {
    const compressed = deflateSync(Buffer.from('/MediaBox [0 0 500 700]'));
    const pdf = Buffer.concat([
      Buffer.from('%PDF-1.7\nstream\n', 'latin1'),
      compressed,
      Buffer.from('\nendstream', 'latin1'),
    ]);

    expect(detectPdfPaperSize(pdf).paperSize).toBe('Kustom (176x247 mm)');
    expect(detectPdfPaperSize(Buffer.from('%PDF-1.7')).paperSize).toBe('A4');
  });
});
