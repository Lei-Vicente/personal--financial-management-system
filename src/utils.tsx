import React from 'react';
import {
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Film,
  HeartPulse,
  GraduationCap,
  Zap,
  Briefcase,
  Laptop,
  TrendingUp,
  MoreHorizontal,
  Coffee,
  Plane,
  Gift,
  Phone,
  Shield,
  CreditCard,
  PiggyBank,
  DollarSign,
  Tag,
  AlertCircle,
  Clock,
  Sparkles,
  LucideIcon
} from 'lucide-react';

export const CURRENCY_MAP: Record<string, { symbol: string; label: string }> = {
  PHP: { symbol: '₱', label: 'PHP — Philippine Peso' },
  USD: { symbol: '$', label: 'USD — US Dollar' },
  EUR: { symbol: '€', label: 'EUR — Euro' },
  GBP: { symbol: '£', label: 'GBP — British Pound' },
  JPY: { symbol: '¥', label: 'JPY — Japanese Yen' },
  CAD: { symbol: 'CA$', label: 'CAD — Canadian Dollar' },
  AUD: { symbol: 'A$', label: 'AUD — Australian Dollar' },
  SGD: { symbol: 'S$', label: 'SGD — Singapore Dollar' },
};

export function formatMoney(amount: number | string | null | undefined, currency = 'PHP', showSign = false): string {
  const meta = CURRENCY_MAP[currency] || { symbol: currency + ' ', label: currency };
  const num = typeof amount === 'number' ? amount : Number(amount);
  const safeAmount = isNaN(num) || amount === null || amount === undefined ? 0 : num;
  const absAmount = Math.abs(safeAmount);
  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  });

  if (showSign) {
    if (safeAmount > 0) return `+${meta.symbol}${formatted}`;
    if (safeAmount < 0) return `-${meta.symbol}${formatted}`;
  }
  return `${meta.symbol}${formatted}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const ICON_REGISTRY: Record<string, LucideIcon> = {
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Film,
  HeartPulse,
  GraduationCap,
  Zap,
  Briefcase,
  Laptop,
  TrendingUp,
  MoreHorizontal,
  Coffee,
  Plane,
  Gift,
  Phone,
  Shield,
  CreditCard,
  PiggyBank,
  DollarSign,
  Tag,
  AlertCircle,
  Clock,
  Sparkles,
};

export function getCategoryIcon(name: string | undefined, className = 'w-4 h-4'): React.ReactElement {
  const IconComponent = (name && ICON_REGISTRY[name]) ? ICON_REGISTRY[name] : Tag;
  return <IconComponent className={className} />;
}

// Token storage key
const TOKEN_STORAGE_KEY = 'finance_app_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

// ==========================================
// Client-Side In-Memory Cache (SWR Pattern)
// ==========================================
interface CacheEntry {
  data: any;
  timestamp: number;
}

const clientCache = new Map<string, CacheEntry>();
const CLIENT_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export function clearClientCache(prefix?: string) {
  if (!prefix) {
    clientCache.clear();
    return;
  }
  for (const key of clientCache.keys()) {
    if (key.startsWith(prefix)) {
      clientCache.delete(key);
    }
  }
}

export function getCachedData<T = any>(url: string): T | null {
  const entry = clientCache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.timestamp < CLIENT_CACHE_TTL) {
    return entry.data as T;
  }
  return null;
}

export function setCachedData(url: string, data: any) {
  clientCache.set(url, { data, timestamp: Date.now() });
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<any> {
  const method = (options.method || 'GET').toUpperCase();
  // Clear client cache on state mutations
  if (method !== 'GET') {
    clearClientCache();
  }

  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    // If unauthorized, token might be invalid
    setStoredToken(null);
    clearClientCache();
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong while connecting to the server.');
    }
    return data;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Server error occurred.');
  }

  return response;
}

export async function apiFetchCached<T = any>(
  url: string,
  options?: RequestInit,
  onBackgroundUpdate?: (freshData: T) => void
): Promise<T> {
  const cached = getCachedData<T>(url);
  if (cached) {
    // Trigger background revalidation if callback provided
    if (onBackgroundUpdate) {
      apiFetch(url, options)
        .then((fresh) => {
          setCachedData(url, fresh);
          onBackgroundUpdate(fresh);
        })
        .catch(() => {
          // ignore background revalidation errors if cached copy exists
        });
    }
    return cached;
  }

  const data = await apiFetch(url, options);
  setCachedData(url, data);
  return data as T;
}

export async function downloadCsvFile(endpoint: string, defaultFilename = 'transactions.csv'): Promise<void> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(endpoint, {
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to download CSV');
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
