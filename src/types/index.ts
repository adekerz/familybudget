// -- INCOME SOURCES --
export interface IncomeSourceConfig {
  id: string;
  name: string;
  day: number | 'last';
}

// -- INCOME --
export type IncomeSource =
  | 'husband_salary'
  | 'wife_advance'
  | 'wife_salary'
  | 'general'
  | string; // для пользовательских источников

export interface Income {
  id: string;
  amount: number;
  date: string;
  source: IncomeSource;
  note?: string;
  distribution: Distribution;
  createdAt: string;
}

export interface Distribution {
  mandatory: number;
  flexible: number;
  savings: number;
  customRatios?: {
    mandatory: number;
    flexible: number;
    savings: number;
  };
}

// -- EXPENSES --
export type ExpenseType = 'mandatory' | 'flexible' | 'savings';

export interface Expense {
  id: string;
  amount: number;
  date: string;
  categoryId: string;
  description?: string;
  type: ExpenseType;
  paidBy: string; // 'husband' | 'wife' | 'shared' или пользовательский
  createdAt: string;
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

// -- PERIOD --
export interface Period {
  id: string;
  startDate: string;
  endDate: string;
  expectedIncome: number;
  actualIncome: number;
  source: IncomeSource;
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
  daysUntilNextIncome: number;
  nextIncomeDate: string;
  nextIncomeSource: string;
  dailyFlexibleLimit: number;
  fixedTotal: number;
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

// -- PAGE ROUTING --
export type PageTab =
  | 'dashboard' | 'income' | 'expenses' | 'analytics'
  | 'goals' | 'settings' | 'assistant' | 'admin';

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
}

export interface Space {
  id: string;
  name: string;
}
