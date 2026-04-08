// -- ACCOUNTS --
export interface Account {
  id: string;
  spaceId: string;
  name: string;
  currency: string;
  balance: number;
  isActive: boolean;
  createdAt: string;
  // FOS v2 fields
  bankId?: string;
  accountType?: 'debit' | 'credit' | 'savings' | 'deposit' | 'cash' | 'ewallet';
  initialBalance?: number;
  creditLimit?: number;
  interestRate?: number;
  isExcludedFromTotal?: boolean;
  last4?: string;
  color?: string;
  sortOrder?: number;
}

// -- BANKS --
export interface Bank {
  id: string;
  spaceId: string;
  name: string;
  bankType: 'bank' | 'cash' | 'ewallet';
  color: string;
  icon: string;
  bik?: string;
  isActive: boolean;
  createdAt: string;
  sortOrder: number;
}

// -- BALANCE SNAPSHOT --
export interface BalanceSnapshot {
  id: string;
  accountId: string;
  balance: number;
  snapshotDate: string;
  source: 'calculated' | 'manual_correction';
  createdAt: string;
}

// -- UNIFIED TRANSACTION --
export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'confirmed' | 'pending' | 'cancelled';

export interface Transaction {
  id: string;
  spaceId: string;
  amount: number;
  fromAccountId?: string;
  toAccountId?: string;
  type: TransactionType;
  categoryId: string;
  subcategory?: string;
  description?: string;
  date: string;
  time?: string;
  paidBy: string;
  recurringId?: string;
  status: TransactionStatus;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  createdAt: string;
  updatedAt: string;
}

// -- RECURRING TRANSACTION --
export interface RecurringTransaction {
  id: string;
  spaceId: string;
  amount: number;
  fromAccountId?: string;
  toAccountId?: string;
  type: TransactionType;
  categoryId: string;
  description?: string;
  paidBy: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  dayOfMonth?: number;
  dayOfWeek?: number;
  startDate: string;
  endDate?: string;
  nextOccurrence: string;
  isActive: boolean;
  isAutoConfirm: boolean;
  autoAdjustAmount: boolean;
  isMandatory: boolean;
  priority: number;
  createdAt: string;
}

// -- CATEGORY TARGET --
export interface CategoryTarget {
  id: string;
  spaceId: string;
  categoryId: string;
  targetAmount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  targetDate?: string;
  targetType: 'limit' | 'goal' | 'allocation';
  allowRollover: boolean;
  rolloverAmount: number;
  isActive: boolean;
  createdAt: string;
}

// -- BUDGET PERIOD --
export interface BudgetPeriodFOS {
  id: string;
  spaceId: string;
  startDate: string;
  endDate: string;
  periodType: 'monthly' | 'biweekly' | 'custom';
  openingBalance?: number;
  status: 'active' | 'closed' | 'future';
  createdAt: string;
}

// -- SAFE TO SPEND RESULT --
export interface SafeToSpendResult {
  amount: number;
  liquidCash: number;
  upcomingMandatory: number;
  underfundedTargets: number;
  daysInPeriod: number;
  dailyBudget: number;
  riskLevel: 'safe' | 'caution' | 'danger' | 'critical';
}

// -- CASHFLOW --
export interface CashflowEvent {
  type: TransactionType;
  description: string;
  amount: number;
  categoryId?: string;
}

export interface CashflowProjection {
  date: string;
  projectedBalance: number;
  events: CashflowEvent[];
  isNegative: boolean;
}

// -- RISK --
export type RiskWarningType = 'overdraft' | 'overspending' | 'cash_gap' | 'target_miss' | 'low_balance';
export type RiskSeverity = 'info' | 'warning' | 'critical';

export interface RiskWarning {
  type: RiskWarningType;
  severity: RiskSeverity;
  message: string;
  relatedAmount: number;
  relatedDate?: string;
  relatedCategory?: string;
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
  | 'goals' | 'settings' | 'assistant' | 'admin' | 'debts' | 'deposits' | 'accounts';

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
