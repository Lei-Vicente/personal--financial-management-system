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

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  date: string;
  description: string;
  payment_method: string;
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
