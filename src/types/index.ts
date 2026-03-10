// ============================================
// BillPro - Core Type Definitions
// ============================================

export type Language = "en" | "ur";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type PaymentMethod = "cash" | "bank_transfer" | "cheque" | "online";
export type UserRole = "owner" | "admin" | "accountant" | "viewer";

// --- User / Business ---
export interface Business {
  id: string;
  user_id: string;
  name_en: string;
  name_ur: string;
  address_en: string;
  address_ur: string;
  phone: string;
  email: string;
  ntn_number?: string; // National Tax Number
  logo_url?: string;
  currency?: string;
  invoice_template?: string;
  created_at: string;
}

// --- Customer ---
export interface Customer {
  id: string;
  business_id: string;
  name_en: string;
  name_ur: string;
  phone: string;
  email?: string;
  address_en?: string;
  address_ur?: string;
  city_en?: string;
  city_ur?: string;
  balance: number; // Outstanding balance in PKR
  portal_token?: string | null;
  created_at: string;
}

// --- Invoice ---
export interface Invoice {
  id: string;
  business_id: string;
  customer_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount: number;
  total: number; // All amounts in PKR
  notes_en?: string;
  notes_ur?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  customer?: Customer;
  items?: InvoiceItem[];
}

// --- Invoice Item ---
export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description_en: string;
  description_ur: string;
  quantity: number;
  unit_price: number; // PKR
  total: number; // PKR
  product_id?: string | null;
}

// --- Payment ---
export interface Payment {
  id: string;
  invoice_id: string;
  amount: number; // PKR
  payment_method: PaymentMethod;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

// --- Product ---
export interface Product {
  id: string;
  business_id: string;
  name_en: string;
  name_ur: string;
  description_en: string;
  description_ur: string;
  unit_price: number;
  unit: string;
  is_active: boolean;
  stock_quantity: number | null;
  created_at: string;
  updated_at: string;
}

// --- Recurring Invoice ---
export type RecurringFrequency = "weekly" | "monthly" | "quarterly" | "yearly";

export interface RecurringInvoice {
  id: string;
  business_id: string;
  customer_id: string;
  frequency: RecurringFrequency;
  next_date: string;
  end_date: string | null;
  items_template: { description_en: string; description_ur: string; quantity: number; unit_price: number }[];
  tax_percentage: number;
  discount: number;
  notes_en: string;
  notes_ur: string;
  is_active: boolean;
  last_generated_at: string | null;
  total_generated: number;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

// --- Expense Category ---
export interface ExpenseCategory {
  id: string;
  business_id: string;
  name_en: string;
  name_ur: string;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
}

// --- Expense ---
export interface Expense {
  id: string;
  business_id: string;
  category_id: string | null;
  description_en: string;
  description_ur: string;
  amount: number;
  expense_date: string;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  category?: ExpenseCategory;
}

// --- Business Member ---
export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: UserRole;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

// --- Business Invite ---
export interface BusinessInvite {
  id: string;
  business_id: string;
  email: string;
  role: UserRole;
  token: string;
  invited_by: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

// --- Activity Log ---
export interface ActivityLog {
  id: string;
  business_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string;
  details: Record<string, any>;
  created_at: string;
}

// --- Subscription ---
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled" | "expired";

export interface SubscriptionPlan {
  id: string;
  name: string;
  name_ur: string;
  description: string;
  description_ur: string;
  price: number;
  currency: string;
  interval: "monthly" | "yearly";
  max_users: number;
  max_invoices_per_month: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  business_id: string;
  plan_id: string | null;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  activated_by: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  plan?: SubscriptionPlan;
  business?: Business;
}

// --- Dashboard Stats ---
export interface DashboardStats {
  total_invoices: number;
  total_revenue: number; // PKR
  pending_amount: number; // PKR
  total_customers: number;
  recent_invoices: Invoice[];
  monthly_revenue: { month: string; amount: number }[];
}

// --- i18n ---
export interface Translations {
  [key: string]: string | Translations;
}
