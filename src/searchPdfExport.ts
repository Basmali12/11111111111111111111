import {jsPDF} from 'jspdf';
import {iraqLogo, militaryBanner} from './brandAssets';

export interface PdfSearchCard { section: string; lines: string[]; headingLines?: string[]; fields?: {label:string; value:string}[] }

export function wrapPdfLine(text: string, maxWidth: number, measure: (text: string) => number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth) { line = candidate; continue; }
    if (line) { lines.push(line); line = ''; }
    // Long identifiers and unbroken notes must also fit inside the margins.
    for (const character of word) {
      if (line && measure(line + character) > maxWidth) { lines.push(line); line = ''; }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function downloadSearchPdf(cards: PdfSearchCard[], query: string, selected: boolean) {
  if (!cards.length) throw new Error('لا توجد سجلات للتنزيل.');
  await Promise.all([
    document.fonts.load('24px Cairo', 'معلومات السجل'),
    document.fonts.load('bold 30px Cairo', 'هيئة الحشد الشعبي'),
  ]);
  await document.fonts.ready;
  const loadImage = async (source: string) => {
    const image = new Image(); image.src = source;
    await image.decode(); return image;
  };
  const [logo, banner] = await Promise.all([loadImage(iraqLogo), loadImage(militaryBanner)]);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const width = 1240, height = 1754, margin = 80, bottom = height - (selected ? 310 : 100);
  let canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!, y = 0, page = 0;
  const text = (value: string, size = 24, bold = false, color = '#172d29') => {
    ctx.font = `${bold ? 'bold ' : ''}${size}px Cairo, sans-serif`;
    ctx.fillStyle = color; ctx.direction = 'rtl'; ctx.textAlign = 'right';
    ctx.fillText(value, width - margin, y); y += size + 16;
  };
  const finishPage = () => {
    if (selected) {
      const signatures = ['توقيع ضابط الإدارة', 'ختم الفوج أو القسم', 'توقيع مسؤول وحدة بنك المعلومات'];
      const columnWidth = (width - margin * 2) / signatures.length;
      ctx.font = 'bold 22px Cairo, sans-serif'; ctx.fillStyle = '#173c2e';
      ctx.direction = 'rtl'; ctx.textAlign = 'center';
      signatures.forEach((label, index) => {
        const center = width - margin - columnWidth * (index + 0.5);
        const lines = wrapPdfLine(label, columnWidth - 24, value => ctx.measureText(value).width);
        lines.forEach((line, offset) => ctx.fillText(line, center, height - 145 + offset * 32));
      });
    }
    ctx.direction = 'rtl'; ctx.textAlign = 'right';
    ctx.font = '20px Cairo, sans-serif'; ctx.fillStyle = '#5b6d68';
    ctx.fillText(`جميع الحقوق محفوظة — اللواء - 22 - بنك المعلومات • صفحة ${page}`, width - margin, height - 48);
    pdf.addImage(canvas, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    canvas.width = 0; canvas.height = 0;
  };
  const newPage = () => {
    if (page) { finishPage(); pdf.addPage(); }
    page++;
    canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#f3f8f6'; ctx.fillRect(margin, 42, width - margin * 2, 250);
    ctx.drawImage(logo, margin + 24, 62, 105, 150);
    ctx.save(); ctx.globalAlpha = 0.28;
    ctx.drawImage(banner, width - margin - 210, 62, 190, 150); ctx.restore();
    ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.fillStyle = '#173c2e';
    ctx.font = 'bold 28px Cairo, sans-serif';
    ctx.fillText('جمهورية العراق • هيئة الحشد الشعبي', width / 2, 96);
    ctx.font = 'bold 25px Cairo, sans-serif';
    ctx.fillText('اللواء الثاني والعشرون • شعبة الإدارة ونظام المعلومات', width / 2, 146);
    ctx.font = 'bold 23px Cairo, sans-serif';
    ctx.fillText(selected ? 'تقرير البحث الشامل — السجلات المحددة' : 'تقرير البحث الشامل — جميع النتائج', width / 2, 195);
    y = 248;
    ctx.font = '22px Cairo, sans-serif';
    for (const line of wrapPdfLine(`البحث: ${query} • التاريخ: ${new Date().toLocaleDateString('ar-IQ')}`, width - margin * 2, value => ctx.measureText(value).width)) text(line, 22);
    y = Math.max(y + 24, 330);
  };
  newPage();
  for (const card of cards) {
    if (selected) {
      const fields = card.fields?.length ? card.fields : [{label:'بيانات السجل', value:card.lines.join(' ')}];
      const cardWidth = width - margin * 2;
      const heading = () => {
        ctx.fillStyle = '#087459'; ctx.beginPath(); ctx.roundRect(margin, y, cardWidth, 62, 12); ctx.fill();
        ctx.font = 'bold 26px Cairo, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'right'; ctx.direction = 'rtl';
        ctx.fillText(card.section, width - margin - 20, y + 40); y += 98;
      };
      if (y + 300 > bottom) newPage();
      heading();
      ctx.font = 'bold 26px Cairo, sans-serif';
      for (const line of card.fields?.length ? card.headingLines || [] : []) {
        for (const part of wrapPdfLine(line, cardWidth - 36, value => ctx.measureText(value).width)) {
          if (y + 50 > bottom) { newPage(); heading(); }
          text(part, 26, true);
        }
      }
      y += 16;
      for (let start = 0; start < fields.length; start += 3) {
        const rowFields = fields.slice(start, start + 3);
        const cellWidth = (cardWidth - 16 * (rowFields.length - 1)) / rowFields.length;
        ctx.font = 'bold 24px Cairo, sans-serif';
        const row = rowFields.map(field => ({...field, wrapped:wrapPdfLine(field.value || '—', cellWidth - 32, value => ctx.measureText(value).width)}));
        while (row.some(field => field.wrapped.length)) {
          if (y + 130 > bottom) { newPage(); heading(); }
          const capacity = Math.max(1, Math.floor((bottom - y - 70) / 36));
          const count = Math.min(capacity, Math.max(...row.map(field => field.wrapped.length)));
          const rowHeight = 66 + count * 36;
          row.forEach((field, index) => {
            const x = width - margin - cellWidth - index * (cellWidth + 16);
            ctx.fillStyle = '#f3f8f6'; ctx.strokeStyle = '#c8dbd3'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.roundRect(x, y, cellWidth, rowHeight, 12); ctx.fill(); ctx.stroke();
            ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.fillStyle = '#628174'; ctx.font = '22px Cairo, sans-serif';
            ctx.fillText(field.label, x + cellWidth - 16, y + 32);
            ctx.fillStyle = '#173c2e'; ctx.font = 'bold 24px Cairo, sans-serif';
            field.wrapped.splice(0, count).forEach((value, line) => ctx.fillText(value, x + cellWidth - 16, y + 72 + line * 36));
          });
          y += rowHeight + 18;
          if (row.some(field => field.wrapped.length)) {newPage(); heading();}
        }
      }
      y += 30;
      continue;
    }
    ctx.font = '24px Cairo, sans-serif';
    const lines = card.lines.flatMap(line => wrapPdfLine(line, width - margin * 2, value => ctx.measureText(value).width));
    if (y + 90 + lines.length * 40 > bottom && y > 300) newPage();
    text(card.section, 26, true, '#00795b');
    for (const line of lines) {
      if (y + 40 > bottom) { newPage(); text(`${card.section} — تابع`, 26, true, '#00795b'); }
      text(line);
    }
    y += 14;
    ctx.strokeStyle = '#d0ddd8'; ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(width - margin, y); ctx.stroke();
    y += 38;
  }
  finishPage();
  const date = new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Baghdad'}).replace(/\//g, '-');
  pdf.save(`نتائج_البحث_${selected ? 'المحددة' : 'الشاملة'}_${date}.pdf`);
}

export function collectPdfSearchCards(root: HTMLElement, selectedOnly: boolean): PdfSearchCard[] {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;direction:rtl;pointer-events:none';
  host.setAttribute('aria-hidden', 'true'); document.body.appendChild(host);
  try {
    return Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-select]'))
      .filter(label => !selectedOnly || label.dataset.pdfSelect === 'selected')
      .map(label => {
        const section = label.closest('section');
        const title = section?.firstElementChild?.textContent?.trim().replace(/\([0-9٠-٩]+\)/g, '').trim() || 'سجل';
        const clone = label.parentElement!.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('button,label,input,svg').forEach(element => element.remove());
        host.replaceChildren(clone);
        const lines = clone.innerText.split(/\n+/).map(line => line.trim()).filter(Boolean);
        const fieldNodes = Array.from(clone.querySelectorAll<HTMLElement>('.grid > div')).filter(node => node.children.length >= 2);
        const fields = fieldNodes.map(node => ({label:(node.firstElementChild as HTMLElement).innerText.trim(),value:Array.from(node.children).slice(1).map(child => (child as HTMLElement).innerText.trim()).join(' ')}));
        fieldNodes.forEach(node => node.remove());
        clone.querySelectorAll<HTMLElement>('p[class*="bg-black"]').forEach(node => {
          fields.push({label:'الملاحظات', value:node.innerText.trim()}); node.remove();
        });
        const headingLines = clone.innerText.split(/\n+/).map(line => line.trim()).filter(Boolean);
        return {section:title, lines, fields, headingLines};
      });
  } finally { host.remove(); }
}
