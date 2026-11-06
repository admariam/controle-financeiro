import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Category, Expense } from '../types/db';
import type { MonthSummary } from './finance';
import { expenseTiming } from './finance';
import { formatDate, formatDateTime, formatTimestampDate, monthLabel } from './dates';
import { formatBRL } from './money';

export interface ReportPdfInput {
  month: string;
  balanceCents: number | null;
  summary: MonthSummary;
  expenses: Expense[];
  categories: Category[];
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const GREEN: [number, number, number] = [4, 120, 87];
const AMBER: [number, number, number] = [180, 83, 9];
const RED: [number, number, number] = [185, 28, 28];
const SLATE_900: [number, number, number] = [15, 23, 42];
const SLATE_500: [number, number, number] = [100, 116, 139];
const SLATE_200: [number, number, number] = [226, 232, 240];
const SLATE_100: [number, number, number] = [241, 245, 249];

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function drawHeader(doc: jsPDF, month: string): void {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...SLATE_900);
  doc.text('Controle Financeiro', MARGIN, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...SLATE_500);
  doc.text(`Relatório de despesas · ${monthLabel(month)}`, MARGIN, 26);

  doc.setFontSize(8);
  doc.text(
    `Emitido em ${formatDateTime(new Date().toISOString())}`,
    PAGE_WIDTH - MARGIN,
    19,
    { align: 'right' },
  );

  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 31, PAGE_WIDTH - MARGIN, 31);
}

function drawKpis(doc: jsPDF, input: ReportPdfInput): void {
  const gap = 4;
  const boxWidth = (CONTENT_WIDTH - gap * 3) / 4;
  const boxHeight = 23;
  const y = 37;

  const items = [
    {
      label: 'Saldo bancário',
      value: input.balanceCents === null ? 'Não informado' : formatBRL(input.balanceCents),
      tone: input.balanceCents !== null && input.balanceCents < 0 ? RED : SLATE_900,
    },
    {
      label: 'Total pago',
      value: formatBRL(input.summary.paidCents),
      tone: GREEN,
    },
    {
      label: 'Total pendente',
      value: formatBRL(input.summary.pendingCents),
      tone: AMBER,
    },
    {
      label: 'Saldo projetado',
      value:
        input.balanceCents === null
          ? '—'
          : formatBRL(input.balanceCents - input.summary.pendingCents),
      tone:
        input.balanceCents !== null && input.balanceCents - input.summary.pendingCents < 0
          ? RED
          : GREEN,
    },
  ];

  items.forEach((item, index) => {
    const x = MARGIN + index * (boxWidth + gap);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...SLATE_200);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_500);
    doc.text(item.label, x + 3, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...item.tone);
    doc.text(item.value, x + 3, y + 15);
  });
}

function drawCategoryChart(
  doc: jsPDF,
  startY: number,
  expenses: Expense[],
  categories: Category[],
): number {
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    totals.set(
      expense.category_id,
      (totals.get(expense.category_id) ?? 0) + expense.amount_cents,
    );
  }

  const rows = [...totals.entries()]
    .map(([categoryId, value]) => ({
      name: categoryName.get(categoryId) ?? 'Outros',
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...SLATE_900);
  doc.text('Despesas por categoria', MARGIN, startY);

  if (rows.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_500);
    doc.text('Sem despesas no mês selecionado.', MARGIN, startY + 7);
    return startY + 14;
  }

  const maxValue = Math.max(...rows.map((row) => row.value), 1);
  const trackX = MARGIN + 45;
  const trackWidth = 100;
  let y = startY + 5;

  for (const row of rows) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_500);
    doc.text(truncate(row.name, 26), MARGIN, y + 4);

    doc.setFillColor(...SLATE_100);
    doc.roundedRect(trackX, y, trackWidth, 5, 1, 1, 'F');

    const barWidth = Math.max(1.5, (row.value / maxValue) * trackWidth);
    doc.setFillColor(5, 150, 105);
    doc.roundedRect(trackX, y, barWidth, 5, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_900);
    doc.text(formatBRL(row.value), PAGE_WIDTH - MARGIN, y + 4, { align: 'right' });

    y += 7;
  }

  return y + 2;
}

function drawStatusChart(doc: jsPDF, startY: number, summary: MonthSummary): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...SLATE_900);
  doc.text('Contas pagas x pendentes', MARGIN, startY);

  const y = startY + 5;
  const total = summary.paidCents + summary.pendingCents;
  const barWidth = CONTENT_WIDTH;

  doc.setFillColor(...SLATE_100);
  doc.roundedRect(MARGIN, y, barWidth, 7, 1.5, 1.5, 'F');

  if (total > 0) {
    const paidWidth = (summary.paidCents / total) * barWidth;
    const pendingWidth = barWidth - paidWidth;

    if (paidWidth > 0) {
      doc.setFillColor(5, 150, 105);
      doc.roundedRect(MARGIN, y, Math.max(paidWidth, 1), 7, 1.5, 1.5, 'F');
    }

    if (pendingWidth > 0) {
      doc.setFillColor(217, 119, 6);
      doc.roundedRect(MARGIN + paidWidth, y, Math.max(pendingWidth, 1), 7, 1.5, 1.5, 'F');
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_500);
  doc.text(
    `Pagas: ${formatBRL(summary.paidCents)}   ·   Pendentes: ${formatBRL(summary.pendingCents)}`,
    MARGIN,
    y + 13,
  );

  return y + 19;
}

export function createMonthlyReportPdf(input: ReportPdfInput): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  drawHeader(doc, input.month);
  drawKpis(doc, input);

  let cursor = drawCategoryChart(doc, 68, input.expenses, input.categories);
  cursor = drawStatusChart(doc, cursor + 2, input.summary);

  const categoryName = new Map(input.categories.map((category) => [category.id, category.name]));
  const sortedExpenses = [...input.expenses].sort((a, b) =>
    a.due_date.localeCompare(b.due_date),
  );

  const body =
    sortedExpenses.length === 0
      ? [['Nenhuma despesa no mês', '—', '—', '—', formatBRL(0)]]
      : sortedExpenses.map((expense) => {
          const status = expense.paid_at
            ? `Paga em ${formatTimestampDate(expense.paid_at)}`
            : expenseTiming(expense) === 'overdue'
              ? 'Vencida'
              : 'Pendente';

          return [
            expense.name,
            categoryName.get(expense.category_id) ?? '—',
            formatDate(expense.due_date),
            status,
            formatBRL(expense.amount_cents),
          ];
        });

  let tableStart = cursor + 4;
  if (tableStart > 240) {
    doc.addPage();
    tableStart = 22;
  }

  autoTable(doc, {
    startY: tableStart,
    head: [['Conta', 'Categoria', 'Vencimento', 'Situação', 'Valor']],
    body,
    theme: 'grid',
    margin: { top: 18, left: MARGIN, right: MARGIN, bottom: 18 },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 42 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 22, halign: 'right' },
    },
    didDrawPage: () => {
      const pageNumber = doc.getCurrentPageInfo().pageNumber;
      if (pageNumber > 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...SLATE_500);
        doc.text(`Controle Financeiro · ${monthLabel(input.month)}`, MARGIN, 10);
      }
    },
  });

  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Controle Financeiro', MARGIN, PAGE_HEIGHT - 7);
    doc.text(`Página ${page} de ${pageCount}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 7, {
      align: 'center',
    });
    doc.text(
      `Valores em reais · ${monthLabel(input.month)}`,
      PAGE_WIDTH - MARGIN,
      PAGE_HEIGHT - 7,
      { align: 'right' },
    );
  }

  return doc;
}

export function buildMonthlyReportPdf(input: ReportPdfInput): void {
  const doc = createMonthlyReportPdf(input);
  doc.save(`controle-financeiro-${input.month}.pdf`);
}
