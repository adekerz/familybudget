import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Income, Expense, SavingsGoal, BudgetSummary } from '../types';

const HEADER_COLOR: [number, number, number] = [34, 116, 165];
const ROW_ALT: [number, number, number] = [245, 242, 236];
const ROW_WHITE: [number, number, number] = [255, 253, 248];
const TOTAL_ROW: [number, number, number] = [231, 223, 198];

function fmt(n: number): string {
  return n.toLocaleString('ru-RU') + ' тг';
}

function monthName(): string {
  return new Date().toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
}

export function generateBudgetPDF(
  incomes: Income[],
  expenses: Expense[],
  goals: SavingsGoal[],
  summary: BudgetSummary,
  getCategoryName: (id: string) => string,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleDateString('ru-RU');

  // ── Header ──────────────────────────────────────────────
  doc.setFillColor(...HEADER_COLOR);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('FamilyBudget', 14, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(monthName() + ' · ' + now, pageW - 14, 14, { align: 'right' });

  let y = 32;

  // ── Budget cards ─────────────────────────────────────────
  const cards = [
    { label: 'Обязательные', budget: summary.mandatoryBudget, spent: summary.mandatorySpent },
    { label: 'Гибкие',       budget: summary.flexibleBudget,  spent: summary.flexibleSpent },
    { label: 'Накопления',   budget: summary.savingsBudget,   spent: summary.savingsActual },
    { label: 'Фиксированные', budget: summary.fixedTotal,     spent: summary.fixedTotal },
  ];

  const cardW = (pageW - 28 - 9) / 4;
  cards.forEach((c, i) => {
    const x = 14 + i * (cardW + 3);
    doc.setFillColor(...ROW_WHITE);
    doc.roundedRect(x, y, cardW, 20, 2, 2, 'F');
    doc.setDrawColor(220, 215, 200);
    doc.roundedRect(x, y, cardW, 20, 2, 2, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(c.label, x + cardW / 2, y + 6, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text(fmt(c.spent), x + cardW / 2, y + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(130, 130, 130);
    doc.text('из ' + fmt(c.budget), x + cardW / 2, y + 17.5, { align: 'center' });
  });

  y += 28;

  // ── Incomes table ────────────────────────────────────────
  const now_ = new Date();
  const monthIncomes = incomes.filter((inc) => {
    const d = new Date(inc.date);
    return d.getMonth() === now_.getMonth() && d.getFullYear() === now_.getFullYear();
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('Доходы', 14, y);
  y += 4;

  if (monthIncomes.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Дата', 'Источник', 'Сумма']],
      body: [
        ...monthIncomes.map((inc) => [
          new Date(inc.date).toLocaleDateString('ru-RU'),
          inc.source,
          fmt(inc.amount),
        ]),
        ['', 'Итого', fmt(monthIncomes.reduce((s, i) => s + i.amount, 0))],
      ],
      headStyles: { fillColor: HEADER_COLOR, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: ROW_ALT },
      didParseCell: (data) => {
        if (data.row.index === monthIncomes.length) {
          data.cell.styles.fillColor = TOTAL_ROW;
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 14, right: 14 },
      tableWidth: 'auto',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Нет доходов за текущий месяц', 14, y + 4);
    y += 12;
  }

  // ── Expenses table ───────────────────────────────────────
  const monthExpenses = expenses.filter((exp) => {
    const d = new Date(exp.createdAt);
    return d.getMonth() === now_.getMonth() && d.getFullYear() === now_.getFullYear();
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('Расходы', 14, y);
  y += 4;

  if (monthExpenses.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Дата', 'Название', 'Категория', 'Сумма']],
      body: [
        ...monthExpenses.map((exp) => [
          new Date(exp.createdAt).toLocaleDateString('ru-RU'),
          exp.description ?? '',
          getCategoryName(exp.categoryId),
          fmt(exp.amount),
        ]),
        ['', '', 'Итого', fmt(monthExpenses.reduce((s, e) => s + e.amount, 0))],
      ],
      headStyles: { fillColor: HEADER_COLOR, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: ROW_ALT },
      didParseCell: (data) => {
        if (data.row.index === monthExpenses.length) {
          data.cell.styles.fillColor = TOTAL_ROW;
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 14, right: 14 },
      tableWidth: 'auto',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Нет расходов за текущий месяц', 14, y + 4);
    y += 12;
  }

  // ── Goals table ───────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('Цели', 14, y);
  y += 4;

  if (goals.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Цель', 'Накоплено', 'Нужно', '%']],
      body: goals.map((g) => [
        g.name,
        fmt(g.currentAmount),
        fmt(g.targetAmount),
        Math.round((g.currentAmount / g.targetAmount) * 100) + '%',
      ]),
      headStyles: { fillColor: HEADER_COLOR, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: ROW_ALT },
      margin: { left: 14, right: 14 },
      tableWidth: 'auto',
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Нет целей', 14, y + 4);
  }

  // ── Footer ────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(245, 242, 236);
    doc.rect(0, pageH - 10, pageW, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('FamilyBudget', 14, pageH - 3.5);
    doc.text(`Страница ${i} из ${pageCount}`, pageW - 14, pageH - 3.5, { align: 'right' });
  }

  const fileName = `family-budget-${now_.toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
