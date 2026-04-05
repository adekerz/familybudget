import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions, TableCell, Content, Margins } from 'pdfmake/interfaces';
import type { Income, Expense, SavingsGoal, BudgetSummary, PayPeriodSummary } from '../types';
import { formatMoney } from './format';
import { parseLocalDate } from './dates';

(pdfMake as any).vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : pdfFonts;

const HEADER_COLOR = '#2274A5';
const ROW_ALT = '#F5F2EC';
const ROW_WHITE = '#FFFDF8';
const TOTAL_ROW = '#E7DFC6';
const BORDER_COLOR = '#DCD7C8';

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
  const now_ = new Date();
  const nowStr = now_.toLocaleDateString('ru-RU');

  const cards = [
    { label: 'Обязательные', budget: summary.mandatoryBudget, spent: summary.mandatorySpent },
    { label: 'Гибкие',       budget: summary.flexibleBudget,  spent: summary.flexibleSpent },
    { label: 'Накопления',   budget: summary.savingsBudget,   spent: summary.savingsActual },
    { label: 'Фиксированные', budget: summary.fixedTotal,     spent: summary.fixedTotal },
  ];

  const monthIncomes = incomes.filter((inc) => {
    const d = parseLocalDate(inc.date);
    return d.getMonth() === now_.getMonth() && d.getFullYear() === now_.getFullYear();
  });

  // Фильтруем расходы по полю date (не createdAt), как и useBudgetStore
  const monthExpenses = expenses.filter((exp) => {
    const d = parseLocalDate(exp.date);
    return d.getMonth() === now_.getMonth() && d.getFullYear() === now_.getFullYear();
  });

  const content: Content[] = [];

  const cardBody: TableCell[][] = [[]];
  cards.forEach(c => {
    cardBody[0].push({
      stack: [
        { text: c.label, fontSize: 7, color: '#646464', alignment: 'center', margin: [0, 6, 0, 4] as Margins },
        { text: formatMoney(c.spent), fontSize: 8.5, bold: true, color: '#1E1E1E', alignment: 'center', margin: [0, 0, 0, 4] as Margins },
        { text: 'из ' + formatMoney(c.budget), fontSize: 6.5, color: '#828282', alignment: 'center', margin: [0, 0, 0, 6] as Margins }
      ],
      fillColor: ROW_WHITE,
      border: [true, true, true, true],
      borderColor: [BORDER_COLOR, BORDER_COLOR, BORDER_COLOR, BORDER_COLOR],
    });
  });

  content.push({
    table: {
      widths: ['*', '*', '*', '*'],
      body: cardBody
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => BORDER_COLOR,
      vLineColor: () => BORDER_COLOR,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
      defaultBorder: false
    },
    margin: [0, 10, 0, 20] as Margins
  });

  const tableLayout = {
    hLineWidth: () => 0,
    vLineWidth: () => 0,
    hLineColor: () => '#FFFFFF',
    vLineColor: () => '#FFFFFF',
    paddingLeft: () => 4,
    paddingRight: () => 4,
    paddingTop: () => 4,
    paddingBottom: () => 4,
  };

  content.push({ text: 'Доходы', style: 'sectionHeader' });
  if (monthIncomes.length > 0) {
    const totalInc = monthIncomes.reduce((s, i) => s + i.amount, 0);
    const incBody: TableCell[][] = [
      [
        { text: 'Дата', style: 'tableHeader' },
        { text: 'Источник', style: 'tableHeader' },
        { text: 'Сумма', style: 'tableHeader' }
      ],
      ...monthIncomes.map((inc, i) => [
        { text: parseLocalDate(inc.date).toLocaleDateString('ru-RU'), fillColor: i % 2 !== 0 ? ROW_ALT : '#FFFFFF' },
        { text: inc.source, fillColor: i % 2 !== 0 ? ROW_ALT : '#FFFFFF' },
        { text: formatMoney(inc.amount), fillColor: i % 2 !== 0 ? ROW_ALT : '#FFFFFF' }
      ]),
      [
        { text: '', fillColor: TOTAL_ROW },
        { text: 'Итого', fillColor: TOTAL_ROW, bold: true },
        { text: formatMoney(totalInc), fillColor: TOTAL_ROW, bold: true }
      ]
    ];

    content.push({
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto'],
        body: incBody
      },
      layout: tableLayout,
      margin: [0, 0, 0, 20] as Margins
    });
  } else {
    content.push({ text: 'Нет доходов за текущий месяц', style: 'emptyMessage' });
  }

  content.push({ text: 'Расходы', style: 'sectionHeader' });
  if (monthExpenses.length > 0) {
    const totalExp = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const expBody: TableCell[][] = [
      [
        { text: 'Дата', style: 'tableHeader' },
        { text: 'Название', style: 'tableHeader' },
        { text: 'Категория', style: 'tableHeader' },
        { text: 'Сумма', style: 'tableHeader' }
      ],
      ...monthExpenses.map((exp, i) => [
        { text: parseLocalDate(exp.date).toLocaleDateString('ru-RU'), fillColor: i % 2 !== 0 ? ROW_ALT : '#FFFFFF' },
        { text: exp.description ?? '', fillColor: i % 2 !== 0 ? ROW_ALT : '#FFFFFF' },
        { text: getCategoryName(exp.categoryId), fillColor: i % 2 !== 0 ? ROW_ALT : '#FFFFFF' },
        { text: formatMoney(exp.amount), fillColor: i % 2 !== 0 ? ROW_ALT : '#FFFFFF' }
      ]),
      [
        { text: '', fillColor: TOTAL_ROW },
        { text: '', fillColor: TOTAL_ROW },
        { text: 'Итого', fillColor: TOTAL_ROW, bold: true },
        { text: formatMoney(totalExp), fillColor: TOTAL_ROW, bold: true }
      ]
    ];

    content.push({
      table: {
        headerRows: 1,
        widths: ['auto', '*', '*', 'auto'],
        body: expBody
      },
      layout: tableLayout,
      margin: [0, 0, 0, 20] as Margins
    });
  } else {
    content.push({ text: 'Нет расходов за текущий месяц', style: 'emptyMessage' });
  }

  content.push({ text: 'Цели', style: 'sectionHeader' });
  if (goals.length > 0) {
    const goalsBody: TableCell[][] = [
      [
        { text: 'Цель', style: 'tableHeader' },
        { text: 'Накоплено', style: 'tableHeader' },
        { text: 'Нужно', style: 'tableHeader' },
        { text: '%', style: 'tableHeader' }
      ],
      ...goals.map((g, i) => {
        const pct = g.targetAmount > 0
          ? Math.round((g.currentAmount / g.targetAmount) * 100) + '%'
          : '—';
        return [
          { text: g.name, fillColor: i % 2 !== 0 ? ROW_ALT : '#FFFFFF' },
          { text: formatMoney(g.currentAmount), fillColor: i % 2 !== 0 ? ROW_ALT : '#FFFFFF' },
          { text: formatMoney(g.targetAmount), fillColor: i % 2 !== 0 ? ROW_ALT : '#FFFFFF' },
          { text: pct, fillColor: i % 2 !== 0 ? ROW_ALT : '#FFFFFF' }
        ];
      })
    ];

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: goalsBody
      },
      layout: tableLayout,
      margin: [0, 0, 0, 20] as Margins
    });
  } else {
    content.push({ text: 'Нет целей', style: 'emptyMessage' });
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [40, 80, 40, 60] as Margins,
    background: function() {
      return {
        canvas: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            w: 595.28,
            h: 62.36,
            color: HEADER_COLOR
          }
        ]
      };
    },
    header: () => {
      return {
        columns: [
          { text: 'Flux', bold: true, fontSize: 14, color: '#FFFFFF' },
          { text: `${monthName()} · ${nowStr}`, fontSize: 9, color: '#FFFFFF', alignment: 'right', margin: [0, 4, 0, 0] as Margins }
        ],
        margin: [40, 20, 40, 0] as Margins
      };
    },
    footer: (currentPage: number, pageCount: number) => {
      return {
        stack: [
          {
            canvas: [
              { type: 'rect', x: 0, y: 0, w: 595.28, h: 28.35, color: '#F5F2EC' }
            ],
          },
          {
            columns: [
              { text: 'Flux', fontSize: 7, color: '#646464', margin: [40, -18, 0, 0] as Margins },
              { text: `Страница ${currentPage} из ${pageCount}`, fontSize: 7, color: '#646464', alignment: 'right', margin: [0, -18, 40, 0] as Margins }
            ],
          }
        ],
        margin: [0, 0, 0, 0] as Margins
      };
    },
    content: content,
    styles: {
      sectionHeader: {
        fontSize: 10,
        bold: true,
        color: '#1E1E1E',
        margin: [0, 0, 0, 8] as Margins
      },
      tableHeader: {
        fontSize: 8,
        bold: true,
        fillColor: HEADER_COLOR,
        color: '#FFFFFF'
      },
      emptyMessage: {
        fontSize: 8,
        color: '#969696',
        margin: [0, 0, 0, 16] as Margins
      }
    },
    defaultStyle: {
      fontSize: 8,
      color: '#1E1E1E'
    }
  };

  const fileName = `family-budget-${now_.toISOString().split('T')[0]}.pdf`;
  pdfMake.createPdf(docDefinition).download(fileName);
}

export function generatePeriodPDF(
  summary: PayPeriodSummary,
  actualExpenses: Expense[],
  getCategoryName: (id: string) => string,
): void {
  const fmt = (n: number) =>
    new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

  const now = new Date();
  const nowStr = now.toLocaleDateString('ru-RU');

  const periodLabel =
    `${new Date(summary.period.startDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}` +
    ` — ` +
    `${new Date(summary.period.endDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const content: Content[] = [];

  // --- Карточки сводки ---
  const totalPlannedExpense = summary.plannedTransactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const totalActualExpense = actualExpenses
    .filter(e => e.type !== 'transfer')
    .reduce((s, e) => s + e.amount, 0);

  const cards = [
    { label: 'ЗП',           value: fmt(summary.period.salaryAmount) },
    { label: 'Запланировано', value: fmt(totalPlannedExpense) },
    { label: 'Потрачено',     value: fmt(totalActualExpense) },
    { label: 'Остаток',       value: fmt(summary.safeToSpend) },
  ];

  content.push({
    table: {
      widths: ['*', '*', '*', '*'],
      body: [[
        ...cards.map(c => ({
          stack: [
            { text: c.label, fontSize: 7, color: '#646464', alignment: 'center', margin: [0, 6, 0, 4] as Margins },
            { text: c.value, fontSize: 9, bold: true, color: '#1E1E1E', alignment: 'center', margin: [0, 0, 0, 6] as Margins },
          ],
          fillColor: '#FFFDF8',
          border: [true, true, true, true],
          borderColor: [BORDER_COLOR, BORDER_COLOR, BORDER_COLOR, BORDER_COLOR],
        } as TableCell))
      ]]
    },
    layout: {
      hLineWidth: () => 1, vLineWidth: () => 1,
      hLineColor: () => BORDER_COLOR, vLineColor: () => BORDER_COLOR,
      paddingLeft: () => 0, paddingRight: () => 0,
      paddingTop: () => 0, paddingBottom: () => 0,
      defaultBorder: false,
    },
    margin: [0, 10, 0, 20] as Margins,
  });

  const tableLayout = {
    hLineWidth: () => 0, vLineWidth: () => 0,
    hLineColor: () => '#FFF', vLineColor: () => '#FFF',
    paddingLeft: () => 4, paddingRight: () => 4,
    paddingTop: () => 4, paddingBottom: () => 4,
  };

  // --- Плановые расходы ---
  content.push({ text: 'Запланированные расходы', style: 'sectionHeader' });
  const plannedExp = summary.plannedTransactions.filter(t => t.type === 'expense');
  if (plannedExp.length > 0) {
    const body: TableCell[][] = [
      [
        { text: 'Название', style: 'tableHeader' },
        { text: 'Дата',     style: 'tableHeader' },
        { text: 'Тип',      style: 'tableHeader' },
        { text: 'Статус',   style: 'tableHeader' },
        { text: 'Сумма',    style: 'tableHeader' },
      ],
      ...plannedExp.map((t, i) => [
        { text: t.title,           fillColor: i % 2 !== 0 ? ROW_ALT : '#FFF' },
        { text: t.scheduledDate,   fillColor: i % 2 !== 0 ? ROW_ALT : '#FFF' },
        { text: t.isFixed ? 'Фикс.' : 'Перем.', fillColor: i % 2 !== 0 ? ROW_ALT : '#FFF' },
        { text: t.status === 'paid' ? '✓ Оплачено' : t.status === 'skipped' ? 'Пропущено' : 'Ожидает', fillColor: i % 2 !== 0 ? ROW_ALT : '#FFF' },
        { text: fmt(t.amount), fillColor: i % 2 !== 0 ? ROW_ALT : '#FFF' },
      ]),
      [
        { text: '', fillColor: TOTAL_ROW }, { text: '', fillColor: TOTAL_ROW },
        { text: '', fillColor: TOTAL_ROW },
        { text: 'Итого', bold: true, fillColor: TOTAL_ROW },
        { text: fmt(totalPlannedExpense), bold: true, fillColor: TOTAL_ROW },
      ],
    ];
    content.push({
      table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto', 'auto'], body },
      layout: tableLayout,
      margin: [0, 0, 0, 20] as Margins,
    });
  } else {
    content.push({ text: 'Нет запланированных расходов', style: 'emptyMessage' });
  }

  // --- Фактические расходы ---
  content.push({ text: 'Фактические расходы', style: 'sectionHeader' });
  const spendingExp = actualExpenses.filter(e => e.type !== 'transfer');
  if (spendingExp.length > 0) {
    const sorted = [...spendingExp].sort((a, b) => a.date.localeCompare(b.date));
    const body: TableCell[][] = [
      [
        { text: 'Дата',      style: 'tableHeader' },
        { text: 'Описание',  style: 'tableHeader' },
        { text: 'Категория', style: 'tableHeader' },
        { text: 'Сумма',     style: 'tableHeader' },
      ],
      ...sorted.map((e, i) => [
        { text: parseLocalDate(e.date).toLocaleDateString('ru-RU'), fillColor: i % 2 !== 0 ? ROW_ALT : '#FFF' },
        { text: e.description ?? '', fillColor: i % 2 !== 0 ? ROW_ALT : '#FFF' },
        { text: getCategoryName(e.categoryId), fillColor: i % 2 !== 0 ? ROW_ALT : '#FFF' },
        { text: fmt(e.amount), fillColor: i % 2 !== 0 ? ROW_ALT : '#FFF' },
      ]),
      [
        { text: '', fillColor: TOTAL_ROW }, { text: '', fillColor: TOTAL_ROW },
        { text: 'Итого', bold: true, fillColor: TOTAL_ROW },
        { text: fmt(totalActualExpense), bold: true, fillColor: TOTAL_ROW },
      ],
    ];
    content.push({
      table: { headerRows: 1, widths: ['auto', '*', '*', 'auto'], body },
      layout: tableLayout,
      margin: [0, 0, 0, 20] as Margins,
    });
  } else {
    content.push({ text: 'Нет фактических расходов', style: 'emptyMessage' });
  }

  // --- Накопительные фонды ---
  if (summary.sinkingFunds.length > 0) {
    content.push({ text: 'Накопительные фонды', style: 'sectionHeader' });
    const body: TableCell[][] = [
      [
        { text: 'Фонд', style: 'tableHeader' },
        { text: 'Накоплено', style: 'tableHeader' },
        { text: 'Цель', style: 'tableHeader' },
        { text: '%', style: 'tableHeader' },
        { text: 'Дата цели', style: 'tableHeader' },
      ],
      ...summary.sinkingFunds.map((f, i) => [
        { text: f.name, fillColor: i % 2 !== 0 ? ROW_ALT : '#FFF' },
        { text: fmt(f.currentSaved), fillColor: i % 2 !== 0 ? ROW_ALT : '#FFF' },
        { text: fmt(f.targetAmount), fillColor: i % 2 !== 0 ? ROW_ALT : '#FFF' },
        { text: `${f.progressPercent ?? 0}%`, fillColor: i % 2 !== 0 ? ROW_ALT : '#FFF' },
        { text: f.targetDate, fillColor: i % 2 !== 0 ? ROW_ALT : '#FFF' },
      ]),
    ];
    content.push({
      table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto', 'auto'], body },
      layout: tableLayout,
      margin: [0, 0, 0, 20] as Margins,
    });
  }

  // --- Pace ---
  content.push({
    text: `Темп трат: ${
      summary.pace.status === 'on_track' ? 'В норме' :
      summary.pace.status === 'warning' ? 'Внимание' : 'Перерасход'
    } · Прогноз остатка к ЗП: ${fmt(summary.pace.projectedEndBalance)}`,
    style: 'emptyMessage',
    margin: [0, 0, 0, 0] as Margins,
  });

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [40, 80, 40, 60] as Margins,
    background: () => ({
      canvas: [{ type: 'rect', x: 0, y: 0, w: 595.28, h: 62.36, color: HEADER_COLOR }],
    }),
    header: () => ({
      columns: [
        { text: 'Flux — Отчёт периода', bold: true, fontSize: 13, color: '#FFFFFF' },
        { text: `${periodLabel} · ${nowStr}`, fontSize: 8, color: '#FFFFFF', alignment: 'right', margin: [0, 4, 0, 0] as Margins },
      ],
      margin: [40, 20, 40, 0] as Margins,
    }),
    footer: (currentPage: number, pageCount: number) => ({
      stack: [
        { canvas: [{ type: 'rect', x: 0, y: 0, w: 595.28, h: 28.35, color: '#F5F2EC' }] },
        {
          columns: [
            { text: 'Flux', fontSize: 7, color: '#646464', margin: [40, -18, 0, 0] as Margins },
            { text: `Страница ${currentPage} из ${pageCount}`, fontSize: 7, color: '#646464', alignment: 'right', margin: [0, -18, 40, 0] as Margins },
          ],
        },
      ],
      margin: [0, 0, 0, 0] as Margins,
    }),
    content,
    styles: {
      sectionHeader: { fontSize: 10, bold: true, color: '#1E1E1E', margin: [0, 0, 0, 8] as Margins },
      tableHeader: { fontSize: 8, bold: true, fillColor: HEADER_COLOR, color: '#FFFFFF' },
      emptyMessage: { fontSize: 8, color: '#969696', margin: [0, 0, 0, 16] as Margins },
    },
    defaultStyle: { fontSize: 8, color: '#1E1E1E' },
  };

  const fileName = `period-${summary.period.startDate}--${summary.period.endDate}.pdf`;
  pdfMake.createPdf(docDefinition).download(fileName);
}
