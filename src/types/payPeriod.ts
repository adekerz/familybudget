export type PeriodStatus = 'active' | 'closed' | 'projected';
export type PlannedTxType = 'income' | 'expense';
export type PlannedTxStatus = 'pending' | 'paid' | 'skipped';
export type PaceStatus = 'on_track' | 'warning' | 'danger';

export interface PayPeriod {
  id: string;
  spaceId: string;
  startDate: string;
  endDate: string;
  salaryAmount: number;
  status: PeriodStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlannedTransaction {
  id: string;
  spaceId: string;
  payPeriodId?: string;
  title: string;
  amount: number;
  type: PlannedTxType;
  categoryId?: string;
  scheduledDate: string;
  isRecurring: boolean;
  recurrenceRule?: { frequency: 'monthly' | 'weekly'; dayOfMonth?: number };
  isFixed: boolean;
  status: PlannedTxStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SinkingFund {
  id: string;
  spaceId: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  currentSaved: number;
  categoryId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // вычисляемые (на клиенте)
  monthlyContribution?: number;
  monthsLeft?: number;
  progressPercent?: number;
}

export interface PaceResult {
  status: PaceStatus;
  expectedSpent: number;
  actualSpent: number;
  paceRatio: number;
  projectedEndBalance: number;
  daysRemaining: number;
  variableBudget: number;
  progressPercent: number;
}

export interface PayPeriodSummary {
  period: PayPeriod;
  safeToSpend: number;
  pace: PaceResult;
  plannedTransactions: PlannedTransaction[];
  sinkingFunds: SinkingFund[];
  upcomingDays7: PlannedTransaction[];
}
