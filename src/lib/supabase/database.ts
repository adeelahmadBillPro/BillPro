import { createClient } from "./client";
import type { Customer, Invoice, InvoiceItem, Payment, InvoiceStatus, Expense, ExpenseCategory } from "@/types";

function getClient() {
  return createClient();
}

// ============================================
// CUSTOMERS
// ============================================

export async function getCustomers(businessId: string) {
  const { data, error } = await getClient()
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return { data: data as Customer[] | null, error };
}

export async function getCustomer(id: string) {
  const { data, error } = await getClient()
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();
  return { data: data as Customer | null, error };
}

export async function createCustomer(customer: Partial<Customer>) {
  const { data, error } = await getClient()
    .from("customers")
    .insert(customer)
    .select()
    .single();
  return { data: data as Customer | null, error };
}

export async function updateCustomer(id: string, updates: Partial<Customer>) {
  const { data, error } = await getClient()
    .from("customers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data: data as Customer | null, error };
}

export async function deleteCustomer(id: string) {
  const { error } = await getClient()
    .from("customers")
    .delete()
    .eq("id", id);
  return { error };
}

// ============================================
// INVOICES
// ============================================

export async function getInvoices(businessId: string) {
  const { data, error } = await getClient()
    .from("invoices")
    .select("*, customer:customers(id, name_en, name_ur, phone)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return { data: data as (Invoice & { customer: Customer })[] | null, error };
}

export async function getInvoice(id: string) {
  const { data, error } = await getClient()
    .from("invoices")
    .select("*, customer:customers(*), items:invoice_items(*)")
    .eq("id", id)
    .single();
  return { data, error };
}

export async function getNextInvoiceNumber(businessId: string) {
  const { data } = await getClient()
    .from("invoices")
    .select("invoice_number")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const lastNum = parseInt(data[0].invoice_number.replace("INV-", "")) || 0;
    return `INV-${String(lastNum + 1).padStart(3, "0")}`;
  }
  return "INV-001";
}

export async function createInvoice(
  invoice: Partial<Invoice>,
  items: Partial<InvoiceItem>[]
) {
  // Insert invoice
  const { data: inv, error: invError } = await getClient()
    .from("invoices")
    .insert(invoice)
    .select()
    .single();

  if (invError || !inv) return { data: null, error: invError };

  // Insert items
  const itemsWithInvoiceId = items.map((item) => ({
    ...item,
    invoice_id: inv.id,
  }));

  const { error: itemsError } = await getClient()
    .from("invoice_items")
    .insert(itemsWithInvoiceId);

  if (itemsError) return { data: null, error: itemsError };

  // Update customer balance
  if (invoice.customer_id && invoice.total) {
    const { data: cust } = await getClient()
      .from("customers")
      .select("balance")
      .eq("id", invoice.customer_id)
      .single();

    if (cust) {
      await getClient()
        .from("customers")
        .update({ balance: (Number(cust.balance) || 0) + (invoice.total || 0) })
        .eq("id", invoice.customer_id);
    }
  }

  return { data: inv as Invoice, error: null };
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const { data, error } = await getClient()
    .from("invoices")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteInvoice(id: string) {
  const { error } = await getClient()
    .from("invoices")
    .delete()
    .eq("id", id);
  return { error };
}

// ============================================
// PAYMENTS
// ============================================

export async function getPayments(businessId: string) {
  const { data, error } = await getClient()
    .from("payments")
    .select("*, invoice:invoices(id, invoice_number, customer_id, business_id, customer:customers(name_en, name_ur))")
    .order("created_at", { ascending: false });

  // Filter by business via invoice relationship
  const filtered = data?.filter(
    (p: any) => p.invoice?.business_id === businessId
  );
  return { data: filtered || null, error };
}

export async function createPayment(payment: Partial<Payment>) {
  const { data, error } = await getClient()
    .from("payments")
    .insert(payment)
    .select()
    .single();

  if (!error && data) {
    // Get invoice to find customer
    const { data: invoice } = await getClient()
      .from("invoices")
      .select("customer_id, total")
      .eq("id", payment.invoice_id!)
      .single();

    if (invoice) {
      // Reduce customer balance
      const { data: cust } = await getClient()
        .from("customers")
        .select("balance")
        .eq("id", invoice.customer_id)
        .single();

      if (cust) {
        await getClient()
          .from("customers")
          .update({
            balance: Math.max(0, (cust.balance || 0) - (payment.amount || 0)),
          })
          .eq("id", invoice.customer_id);
      }

      // Check if invoice is fully paid — get all payments
      const { data: allPayments } = await getClient()
        .from("payments")
        .select("amount")
        .eq("invoice_id", payment.invoice_id!);

      const totalPaid = allPayments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
      if (totalPaid >= Number(invoice.total)) {
        await getClient()
          .from("invoices")
          .update({ status: "paid" })
          .eq("id", payment.invoice_id!);
      }
    }
  }

  return { data, error };
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats(businessId: string) {
  const [invoicesRes, customersRes] = await Promise.all([
    getClient()
      .from("invoices")
      .select("*, customer:customers(name_en, name_ur)")
      .eq("business_id", businessId),
    getClient()
      .from("customers")
      .select("*")
      .eq("business_id", businessId),
  ]);

  const invoices = invoicesRes.data || [];
  const customers = customersRes.data || [];

  const totalRevenue = invoices
    .filter((i: any) => i.status === "paid")
    .reduce((sum: number, i: any) => sum + Number(i.total), 0);

  const pendingAmount = invoices
    .filter((i: any) => i.status === "sent" || i.status === "overdue")
    .reduce((sum: number, i: any) => sum + Number(i.total), 0);

  const recentInvoices = invoices.slice(0, 5);

  return {
    total_invoices: invoices.length,
    total_revenue: totalRevenue,
    pending_amount: pendingAmount,
    total_customers: customers.length,
    recent_invoices: recentInvoices,
  };
}

// ============================================
// DASHBOARD CHARTS DATA
// ============================================

export async function getInvoicesByDateRange(
  businessId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await getClient()
    .from("invoices")
    .select("id, total, status, issue_date, due_date, customer_id, customer:customers(name_en, name_ur)")
    .eq("business_id", businessId)
    .gte("issue_date", startDate)
    .lte("issue_date", endDate)
    .order("issue_date", { ascending: true });
  return { data: data || [], error };
}

export async function getOverdueInvoices(businessId: string) {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await getClient()
    .from("invoices")
    .select("*, customer:customers(name_en, name_ur, phone)")
    .eq("business_id", businessId)
    .lt("due_date", today)
    .in("status", ["draft", "sent"])
    .order("due_date", { ascending: true })
    .limit(10);
  return { data: data || [], error };
}

export async function getTopCustomers(businessId: string, limit: number = 5) {
  const { data, error } = await getClient()
    .from("invoices")
    .select("customer_id, total, customer:customers(name_en, name_ur)")
    .eq("business_id", businessId)
    .eq("status", "paid");

  if (!data) return { data: [], error };

  // Aggregate by customer client-side
  const map = new Map<string, { customer_id: string; name_en: string; name_ur: string; total: number }>();
  for (const inv of data as any[]) {
    const cid = inv.customer_id;
    const existing = map.get(cid);
    if (existing) {
      existing.total += Number(inv.total);
    } else {
      map.set(cid, {
        customer_id: cid,
        name_en: inv.customer?.name_en || "",
        name_ur: inv.customer?.name_ur || "",
        total: Number(inv.total),
      });
    }
  }

  const sorted = Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  return { data: sorted, error: null };
}

// ============================================
// EXPENSE CATEGORIES
// ============================================

const DEFAULT_CATEGORIES = [
  { name_en: "Rent", name_ur: "کرایہ", color: "#ef4444", icon: "home" },
  { name_en: "Utilities", name_ur: "بجلی/پانی/گیس", color: "#f59e0b", icon: "zap" },
  { name_en: "Salaries", name_ur: "تنخواہیں", color: "#3b82f6", icon: "users" },
  { name_en: "Transport", name_ur: "نقل و حمل", color: "#8b5cf6", icon: "truck" },
  { name_en: "Office Supplies", name_ur: "دفتری سامان", color: "#10b981", icon: "package" },
  { name_en: "Marketing", name_ur: "مارکیٹنگ", color: "#ec4899", icon: "megaphone" },
  { name_en: "Miscellaneous", name_ur: "متفرق", color: "#6b7280", icon: "more-horizontal" },
];

export async function getExpenseCategories(businessId: string) {
  const { data, error } = await getClient()
    .from("expense_categories")
    .select("*")
    .eq("business_id", businessId)
    .order("name_en");
  return { data: data as ExpenseCategory[] | null, error };
}

export async function ensureDefaultCategories(businessId: string) {
  const { data } = await getClient()
    .from("expense_categories")
    .select("id")
    .eq("business_id", businessId)
    .limit(1);

  if (data && data.length > 0) return; // already has categories

  const rows = DEFAULT_CATEGORIES.map((cat) => ({
    business_id: businessId,
    ...cat,
    is_default: true,
  }));
  await getClient().from("expense_categories").insert(rows);
}

export async function createExpenseCategory(cat: Partial<ExpenseCategory>) {
  const { data, error } = await getClient()
    .from("expense_categories")
    .insert(cat)
    .select()
    .single();
  return { data: data as ExpenseCategory | null, error };
}

export async function updateExpenseCategory(id: string, updates: Partial<ExpenseCategory>) {
  const { data, error } = await getClient()
    .from("expense_categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data: data as ExpenseCategory | null, error };
}

export async function deleteExpenseCategory(id: string) {
  const { error } = await getClient()
    .from("expense_categories")
    .delete()
    .eq("id", id);
  return { error };
}

// ============================================
// EXPENSES
// ============================================

export async function getExpenses(businessId: string) {
  const { data, error } = await getClient()
    .from("expenses")
    .select("*, category:expense_categories(id, name_en, name_ur, color, icon)")
    .eq("business_id", businessId)
    .order("expense_date", { ascending: false });
  return { data: data as (Expense & { category: ExpenseCategory })[] | null, error };
}

export async function getExpensesByDateRange(businessId: string, startDate: string, endDate: string) {
  const { data, error } = await getClient()
    .from("expenses")
    .select("*, category:expense_categories(id, name_en, name_ur, color)")
    .eq("business_id", businessId)
    .gte("expense_date", startDate)
    .lte("expense_date", endDate)
    .order("expense_date", { ascending: false });
  return { data: data || [], error };
}

export async function createExpense(expense: Partial<Expense>) {
  const { data, error } = await getClient()
    .from("expenses")
    .insert(expense)
    .select("*, category:expense_categories(id, name_en, name_ur, color, icon)")
    .single();
  return { data: data as Expense | null, error };
}

export async function updateExpense(id: string, updates: Partial<Expense>) {
  const { data, error } = await getClient()
    .from("expenses")
    .update(updates)
    .eq("id", id)
    .select("*, category:expense_categories(id, name_en, name_ur, color, icon)")
    .single();
  return { data: data as Expense | null, error };
}

export async function deleteExpense(id: string) {
  const { error } = await getClient()
    .from("expenses")
    .delete()
    .eq("id", id);
  return { error };
}

export async function getExpenseStats(businessId: string) {
  const { data } = await getClient()
    .from("expenses")
    .select("amount, expense_date")
    .eq("business_id", businessId);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let totalAll = 0;
  let totalThisMonth = 0;

  for (const e of data || []) {
    totalAll += Number(e.amount);
    if (e.expense_date?.startsWith(thisMonth)) {
      totalThisMonth += Number(e.amount);
    }
  }

  return { total: totalAll, this_month: totalThisMonth };
}
