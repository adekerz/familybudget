// -- ACCOUNTS --
export interface Account {
  id: string;
  spaceId: string;
  name: string;
  currency: string;
  balance: number;
  isActive: boolean;
  createdAt: string;
}

// -- INCOME SOURCES --
export interface IncomeSourceConfig {
  id: string;
  name: string;
  day: number | 'last';
}

// -- INCOME --
export type IncomeSource =
  | 'salary_1'
  | 'general'
  | string; // для пользовательских источников

export interface Income {
  id: string;
  amount: number;
  date: string;
  source: IncomeSource;
  note?: string;
  distribution: Distribution;
  accountId?: string;   // ссылка на accounts.id (nullable)
  bank?: string;        // kaspi | halyk | freedom | forte | other
  createdAt: string;
  deletedAt?: string | null;
}

export interface DistributionRatios {
  mandatory: number;
  flexible: number;
  savings: number;
}

export interface Distribution {
  mandatory: number;
  flexible: number;
  savings: number;
  customRatios?: DistributionRatios;
}

// -- EXPENSES --
export type ExpenseType = 'mandatory' | 'flexible' | 'savings' | 'transfer';

export interface Expense {
  id: string;
  amount: number;
  date: string;
  categoryId: string;
  description?: string;
  type: ExpenseType;
  paidBy: string; // 'me' | 'partner' | 'shared' или пользовательский
  accountId?: string;   // ссылка на accounts.id (nullable для обратной совместимости)
  toAccountId?: string;  // для type='transfer': целевой счёт
  bank?: string;        // kaspi | halyk | freedom | forte | other
  createdAt: string;
  deletedAt?: string | null;
}

// -- CATEGORIES --
export interface Category {
  id: string;
  name: string;
  type: ExpenseType;
  icon: string;
  color: string;
  monthlyLimit?: number;
  isQuickAccess: boolean;
  sortOrder: number;
}

// -- SAVINGS GOALS --
export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  icon: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

// -- GOAL CONTRIBUTIONS --
export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  note?: string;
  createdAt: string;
}

// -- PERIOD --
export interface Period {
  id: string;
  startDate: string;
  endDate: string;
  expectedIncome: number;
  actualIncome: number;
  source: IncomeSource;
}

export type BudgetPeriodType = 'day' | 'week' | 'month' | 'custom';

export interface BudgetPeriodRange {
  start: Date;
  end: Date;
}

// -- BUDGET COMPUTED --
export interface BudgetSummary {
  totalBalance: number;
  mandatoryBudget: number;
  mandatorySpent: number;
  mandatoryRemaining: number;
  flexibleBudget: number;
  flexibleSpent: number;
  flexibleRemaining: number;
  savingsBudget: number;
  savingsActual: number;
  savingsRemaining: number;
  forecastFlexibleSpend: number;
  daysUntilNextIncome: number;
  nextIncomeDate: string;
  nextIncomeSource: string;
  nextIncomeAmount: number;
  dailyFlexibleLimit: number;
  fixedTotal: number;
  periodStart: string; // ISO date — начало текущего бюджетного периода (дата последнего дохода)
}

// -- FIXED EXPENSES --
export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  icon: string;
  isActive: boolean;
  createdAt: string;
}

// -- RECURRING EXPENSES --
export interface RecurringExpense {
  id: string;
  spaceId: string;
  name: string;
  amount: number;
  categoryId: string;
  type: ExpenseType;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  dayOfMonth?: number;
  dayOfWeek?: number;
  accountId?: string;
  isActive: boolean;
  lastGenerated?: string;
  createdAt: string;
}

// -- DEPOSITS --
export interface Deposit {
  id: string;
  spaceId: string;
  name: string;
  accountId?: string;
  initialAmount: number;
  currentAmount: number;
  interestRate: number;
  startDate: string;
  endDate?: string;
  isReplenishable: boolean;
  capitalization: boolean;
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'end';
  createdAt: string;
}

// -- DEBTS --
export type DebtDirection = 'i_owe' | 'owe_me'; // я должен | мне должны

export interface Debt {
  id: string;
  spaceId: string;
  personName: string;
  direction: DebtDirection;
  totalAmount: number;
  paidAmount: number;
  note?: string;
  dueDate?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  note?: string;
  createdAt: string;
}

// -- PAGE ROUTING --
export type PageTab =
  | 'dashboard' | 'income' | 'expenses' | 'analytics'
  | 'goals' | 'settings' | 'assistant' | 'admin' | 'budget' | 'debts' | 'deposits';

// -- PAY PERIOD ENGINE --
export type { PayPeriod, PlannedTransaction, SinkingFund, PaceResult, PayPeriodSummary, PeriodStatus, PlannedTxType, PlannedTxStatus, PaceStatus } from './payPeriod';

// -- AUTH v2 --
export type UserRole = 'admin' | 'member';

export interface AppUser {
  id: string;
  username: string;
  spaceId: string;
  spaceName?: string;
  role: UserRole;
  themeId: string;
  lastLoginAt?: string;
  sessionExpiresAt?: string;
  mustChangePassword?: boolean;
  hasPasskey?: boolean;
  onboarded?: boolean;
}

export interface Space {
  id: string;
  name: string;
}
