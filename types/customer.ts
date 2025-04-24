export interface CustomerAddress {
  city: string;
  state: string;
  number: string;
  street: string;
  zipCode: string;
  complement?: string;
  neighborhood: string;
}

export interface CustomerCategory {
  id: string;
  name: string;
  description: string;
  ticketValue: string;
  isCustomTicket: boolean;
  frequencyPerMonth: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  tinyId?: string | null;
  externalId: string; // Corresponde ao ID do Clerk
  name: string;
  type: string;
  document: string;
  email: string;
  phone: string;
  birthDate: string;
  address: CustomerAddress;
  creditLimit?: number | null;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  source: string;
  __category__?: CustomerCategory;
}

export interface CustomerLimitPeriod {
  start: string;
  end: string;
}

export interface CustomerFrequencyLimit {
  limit: number;
  used: number;
  remaining: number;
  hasLimit: boolean;
  period: CustomerLimitPeriod;
}

export interface CustomerValueLimit {
  limit: string;
  used: number;
  remaining: number;
  hasLimit: boolean;
  period: CustomerLimitPeriod;
}

export interface CustomerOrderLimits {
  customerId: string;
  dailyOrderLimit: number;
  weeklyOrderLimit: number;
  monthlyOrderLimit: number;
  minimumOrderValue: number;
  maximumOrderValue: number;
  remainingDailyLimit: number;
  remainingWeeklyLimit: number;
  remainingMonthlyLimit: number;
  lastUpdated: string;
}