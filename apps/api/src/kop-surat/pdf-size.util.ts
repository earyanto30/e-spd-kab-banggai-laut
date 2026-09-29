import * as zlib from 'zlib';

export interface PdfPaperDimensions {
  paperSize: string;
  widthMm: number;
  heightMm: number;
}

export function detectPdfPaperSize(buffer: Buffer): PdfPaperDimensions {
  const content = buffer.toString('latin1');
  let mediaBoxMatch = content.match(/\/MediaBox\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\]/i);

  if (!mediaBoxMatch) {
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;
    while ((match = streamRegex.exec(content)) !== null) {
      try {
        const streamBuffer = Buffer.from(match[1], 'latin1');
        const inflated = zlib.inflateSync(streamBuffer).toString('latin1');
        mediaBoxMatch = inflated.match(/\/MediaBox\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\]/i);
        if (mediaBoxMatch) break;
      } catch {
        // Continue if not a valid deflate stream
      }
    }
  }

  if (!mediaBoxMatch) {
    return { paperSize: 'A4', widthMm: 210, heightMm: 297 };
  }

  const wPt = Math.abs(parseFloat(mediaBoxMatch[3]) - parseFloat(mediaBoxMatch[1]));
  const hPt = Math.abs(parseFloat(mediaBoxMatch[4]) - parseFloat(mediaBoxMatch[2]));

  const minDim = Math.min(wPt, hPt);
  const maxDim = Math.max(wPt, hPt);
  const widthMm = Math.round(minDim * 0.352778);
  const heightMm = Math.round(maxDim * 0.352778);

  // Match paper sizes with ~6pt (~2mm) tolerance
  if (Math.abs(minDim - 595.28) <= 6 && Math.abs(maxDim - 841.89) <= 6) {
    return { paperSize: 'A4', widthMm, heightMm };
  }
  if (
    (Math.abs(minDim - 595.28) <= 6 && Math.abs(maxDim - 935.43) <= 6) ||
    (Math.abs(minDim - 612) <= 6 && Math.abs(maxDim - 936) <= 6)
  ) {
    return { paperSize: 'F4 / Folio', widthMm, heightMm };
  }
  if (Math.abs(minDim - 612) <= 6 && Math.abs(maxDim - 792) <= 6) {
    return { paperSize: 'Letter', widthMm, heightMm };
  }
  if (Math.abs(minDim - 612) <= 6 && Math.abs(maxDim - 1008) <= 6) {
    return { paperSize: 'Legal', widthMm, heightMm };
  }
  if (Math.abs(minDim - 419.53) <= 6 && Math.abs(maxDim - 595.28) <= 6) {
    return { paperSize: 'A5', widthMm, heightMm };
  }
  if (Math.abs(minDim - 841.89) <= 6 && Math.abs(maxDim - 1190.55) <= 6) {
    return { paperSize: 'A3', widthMm, heightMm };
  }

  return { paperSize: `Kustom (${widthMm}x${heightMm} mm)`, widthMm, heightMm };
}
