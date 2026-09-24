export interface User {
  id: string;
  email: string;
  full_name: string;
  is_verified: number;
  created_at: string;
  currency: string;
  monthly_income: number;
  timezone: string;
  onboarding_completed: number;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  icon: string;
  color: string;
  is_default: number;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'WALLET' | 'CREDIT' | 'INVESTMENT' | 'OTHER';
  balance: number;
  base_balance?: number;
  current_balance?: number;
  currency: string;
  color: string;
  icon: string;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id?: string | null;
  account_name?: string;
  account_type?: string;
  account_icon?: string;
  to_account_id?: string | null;
  to_account_name?: string;
  to_account_type?: string;
  to_account_icon?: string;
  category_id?: string | null;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  amount: number;
  date: string;
  description: string;
  payment_method: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  frequency: 'ONCE' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  category_id?: string | null;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  account_id?: string | null;
  account_name?: string;
  account_icon?: string;
  account_type?: string;
  is_paid: boolean;
  paid_date?: string | null;
  notes?: string;
  is_overdue?: boolean;
  is_due_soon?: boolean;
  days_until_due?: number;
  created_at: string;
  updated_at: string;
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  account_id?: string | null;
  account_name?: string;
  account_icon?: string;
  account_type?: string;
  category_id: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  description: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  start_date: string;
  end_date?: string | null;
  next_date: string;
  is_active: boolean;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  budget_amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  daily_average: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'EXCEEDED';
  status_warning: string | null;
  month: string;
  recent_expenses: Array<{
    id: string;
    amount: number;
    date: string;
    description: string;
    payment_method: string;
  }>;
}

export interface SavingsContribution {
  id: string;
  goal_id?: string;
  user_id?: string;
  amount: number;
  note: string;
  date: string;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  remaining: number;
  percentage: number;
  target_date: string | null;
  description: string;
  created_at: string;
  contributions: SavingsContribution[];
}

export interface DashboardAnalytics {
  balance: {
    total_balance: number;
    change_pct: number;
    current_net: number;
    previous_net: number;
  };
  income: {
    current_month: number;
    previous_month: number;
    change_pct: number;
  };
  expense: {
    current_month: number;
    previous_month: number;
    change_pct: number;
    largest_category: {
      name: string;
      amount: number;
      color: string;
      icon: string;
    } | null;
  };
  category_breakdown: Array<{
    id: string;
    name: string;
    color: string;
    icon: string;
    total: number;
    count: number;
    percentage: number;
  }>;
}

export interface SpendingChartPoint {
  label: string;
  income: number;
  expense: number;
  net: number;
}
