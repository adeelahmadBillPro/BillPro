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
