import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions, TableCell, Content, Margins } from 'pdfmake/interfaces';
import type { Income, Expense, SavingsGoal, BudgetSummary } from '../types';
import { formatMoney } from './format';

(pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;

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
    const d = new Date(inc.date);
    return d.getMonth() === now_.getMonth() && d.getFullYear() === now_.getFullYear();
  });

  const monthExpenses = expenses.filter((exp) => {
    const d = new Date(exp.createdAt);
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
        { text: new Date(inc.date).toLocaleDateString('ru-RU'), fillColor: i % 2 !== 0 ? ROW_ALT : '#FFFFFF' },
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
        { text: new Date(exp.createdAt).toLocaleDateString('ru-RU'), fillColor: i % 2 !== 0 ? ROW_ALT : '#FFFFFF' },
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
        const pct = Math.round((g.currentAmount / g.targetAmount) * 100) + '%';
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
          { text: 'FamilyBudget', bold: true, fontSize: 14, color: '#FFFFFF' },
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
              { text: 'FamilyBudget', fontSize: 7, color: '#646464', margin: [40, -18, 0, 0] as Margins },
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
