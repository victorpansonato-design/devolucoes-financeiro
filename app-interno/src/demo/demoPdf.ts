// Gera um PDF de uma página, válido e mínimo, marcado como DEMONSTRAÇÃO. Serve para o comprovante dos exemplos
// e para o botão "baixar comprovante fictício" — ninguém precisa ter um arquivo à mão na apresentação.

const WIN_ANSI_EXTRA: Record<string, number> = { '—': 0x97, '–': 0x96, '•': 0x95, '“': 0x93, '”': 0x94, '’': 0x92, '·': 0xb7 };

function pdfText(text: string) {
  let out = '';
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (char === '\\' || char === '(' || char === ')') out += `\\${char}`;
    else if (code >= 32 && code < 127) out += char;
    else if (WIN_ANSI_EXTRA[char]) out += `\\${WIN_ANSI_EXTRA[char]!.toString(8).padStart(3, '0')}`;
    else if (code >= 160 && code <= 255) out += `\\${code.toString(8).padStart(3, '0')}`;
    else out += '?';
  }
  return `(${out})`;
}

export interface ProofPdfContent {
  title: string;
  lines: [label: string, value: string][];
}

export function buildDemoProofPdf({ title, lines }: ProofPdfContent): Uint8Array {
  const body = [
    'q 0.92 0.93 0.94 rg BT /F2 64 Tf 0.866 0.5 -0.5 0.866 110 190 Tm ' + pdfText('DEMONSTRAÇÃO') + ' Tj ET Q',
    '0.953 0.957 0.965 rg 0 752 595 90 re f',
    '0 0.314 0.616 rg BT /F2 18 Tf 50 792 Td ' + pdfText('UniAnchieta · Financeiro') + ' Tj ET',
    '0.42 0.45 0.5 rg BT /F1 10 Tf 50 774 Td ' + pdfText('Documento fictício gerado pela demonstração — sem valor bancário') + ' Tj ET',
    '0.063 0.075 0.09 rg BT /F2 16 Tf 50 700 Td ' + pdfText(title) + ' Tj ET',
    ...lines.flatMap(([label, value], i) => {
      const y = 664 - i * 26;
      return [
        '0.42 0.45 0.5 rg BT /F1 10 Tf 50 ' + y + ' Td ' + pdfText(label) + ' Tj ET',
        '0.063 0.075 0.09 rg BT /F2 11 Tf 220 ' + y + ' Td ' + pdfText(value) + ' Tj ET',
      ];
    }),
    '0.42 0.45 0.5 rg BT /F1 9 Tf 50 60 Td ' + pdfText('Nenhum pagamento real foi executado. Não utilize este arquivo fora da apresentação.') + ' Tj ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${body.length} >>\nstream\n${body}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((content, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${content}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  return Uint8Array.from(pdf, c => c.charCodeAt(0));
}

export const demoProofBlob = (content: ProofPdfContent) => new Blob([buildDemoProofPdf(content) as BlobPart], { type: 'application/pdf' });
