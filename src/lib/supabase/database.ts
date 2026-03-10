import { createClient } from "./client";
import type { Customer, Invoice, InvoiceItem, Payment, InvoiceStatus, Expense, ExpenseCategory, BusinessMember, BusinessInvite, UserRole, Product, RecurringInvoice, ActivityLog, Subscription, SubscriptionPlan } from "@/types";

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

export async function updateInvoice(
  id: string,
  invoice: Partial<Invoice>,
  items: Partial<InvoiceItem>[]
) {
  const { data: oldInv } = await getClient()
    .from("invoices")
    .select("customer_id, total")
    .eq("id", id)
    .single();

  const { data: inv, error: invError } = await getClient()
    .from("invoices")
    .update(invoice)
    .eq("id", id)
    .select()
    .single();

  if (invError || !inv) return { data: null, error: invError };

  // Replace all items
  await getClient().from("invoice_items").delete().eq("invoice_id", id);

  const itemsWithInvoiceId = items.map((item) => ({ ...item, invoice_id: id }));
  const { error: itemsError } = await getClient()
    .from("invoice_items")
    .insert(itemsWithInvoiceId);

  if (itemsError) return { data: null, error: itemsError };

  // Adjust customer balance
  if (oldInv) {
    const customerId = invoice.customer_id || oldInv.customer_id;
    const { data: cust } = await getClient()
      .from("customers")
      .select("balance")
      .eq("id", customerId)
      .single();
    if (cust) {
      const diff = (Number(invoice.total) || 0) - (Number(oldInv.total) || 0);
      await getClient()
        .from("customers")
        .update({ balance: Math.max(0, (Number(cust.balance) || 0) + diff) })
        .eq("id", customerId);
    }
  }

  return { data: inv as Invoice, error: null };
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

// Invoices due within the next 7 days (not yet paid)
export async function getDueSoonInvoices(businessId: string) {
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const { data, error } = await getClient()
    .from("invoices")
    .select("*, customer:customers(name_en, name_ur, phone, email)")
    .eq("business_id", businessId)
    .gte("due_date", today)
    .lte("due_date", nextWeek)
    .in("status", ["draft", "sent"])
    .order("due_date", { ascending: true })
    .limit(10);
  return { data: data || [], error };
}

// Auto-mark overdue invoices (call on page load)
export async function markOverdueInvoices(businessId: string) {
  const today = new Date().toISOString().split("T")[0];
  await getClient()
    .from("invoices")
    .update({ status: "overdue" })
    .eq("business_id", businessId)
    .lt("due_date", today)
    .in("status", ["draft", "sent"]);
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

// ============================================
// TEAM MEMBERS
// ============================================

export async function getBusinessMembers(businessId: string) {
  const { data, error } = await getClient()
    .from("business_members")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at");
  return { data: data as BusinessMember[] | null, error };
}

export async function updateMemberRole(memberId: string, role: UserRole) {
  const { data, error } = await getClient()
    .from("business_members")
    .update({ role })
    .eq("id", memberId)
    .select()
    .single();
  return { data: data as BusinessMember | null, error };
}

export async function removeMember(memberId: string) {
  const { error } = await getClient()
    .from("business_members")
    .delete()
    .eq("id", memberId);
  return { error };
}

// ============================================
// INVITES
// ============================================

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function getBusinessInvites(businessId: string) {
  const { data, error } = await getClient()
    .from("business_invites")
    .select("*")
    .eq("business_id", businessId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  return { data: data as BusinessInvite[] | null, error };
}

export async function createInvite(businessId: string, email: string, role: UserRole, invitedBy: string) {
  const token = generateToken();
  const { data, error } = await getClient()
    .from("business_invites")
    .insert({
      business_id: businessId,
      email,
      role,
      token,
      invited_by: invitedBy,
    })
    .select()
    .single();
  return { data: data as BusinessInvite | null, error };
}

export async function deleteInvite(inviteId: string) {
  const { error } = await getClient()
    .from("business_invites")
    .delete()
    .eq("id", inviteId);
  return { error };
}

export async function getInviteByToken(token: string) {
  const { data, error } = await getClient()
    .from("business_invites")
    .select("*, business:businesses(id, name_en, name_ur)")
    .eq("token", token)
    .is("accepted_at", null)
    .single();
  return { data, error };
}

export async function acceptInvite(token: string, userId: string) {
  // Get the invite
  const { data: invite, error: fetchErr } = await getClient()
    .from("business_invites")
    .select("*")
    .eq("token", token)
    .is("accepted_at", null)
    .single();

  if (fetchErr || !invite) return { error: fetchErr || new Error("Invite not found") };

  // Check if expired
  if (new Date(invite.expires_at) < new Date()) {
    return { error: new Error("Invite expired") };
  }

  // Add user to business_members
  const { error: memberErr } = await getClient()
    .from("business_members")
    .insert({
      business_id: invite.business_id,
      user_id: userId,
      role: invite.role,
      invited_by: invite.invited_by,
    });

  if (memberErr) return { error: memberErr };

  // Mark invite as accepted
  await getClient()
    .from("business_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return { error: null, businessId: invite.business_id };
}

// Get user email from auth (for display in member list)
export async function getUserEmails(userIds: string[]) {
  // We can't query auth.users directly from client, so we use a workaround:
  // Look up businesses created by these users to get their emails
  const { data } = await getClient()
    .from("businesses")
    .select("user_id, email")
    .in("user_id", userIds);

  const map: Record<string, string> = {};
  for (const biz of data || []) {
    map[biz.user_id] = biz.email;
  }
  return map;
}

// ============================================
// PRODUCTS
// ============================================

export async function getProducts(businessId: string) {
  const { data, error } = await getClient()
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .order("name_en");
  return { data: data as Product[] | null, error };
}

export async function getActiveProducts(businessId: string) {
  const { data, error } = await getClient()
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("name_en");
  return { data: data as Product[] | null, error };
}

export async function createProduct(product: Partial<Product>) {
  const { data, error } = await getClient()
    .from("products")
    .insert(product)
    .select()
    .single();
  return { data: data as Product | null, error };
}

export async function updateProduct(id: string, updates: Partial<Product>) {
  const { data, error } = await getClient()
    .from("products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data: data as Product | null, error };
}

export async function deleteProduct(id: string) {
  const { error } = await getClient()
    .from("products")
    .delete()
    .eq("id", id);
  return { error };
}

// ============================================
// RECURRING INVOICES
// ============================================

export async function getRecurringInvoices(businessId: string) {
  const { data, error } = await getClient()
    .from("recurring_invoices")
    .select("*, customer:customers(id, name_en, name_ur, phone)")
    .eq("business_id", businessId)
    .order("next_date");
  return { data: data as RecurringInvoice[] | null, error };
}

export async function createRecurringInvoice(ri: Partial<RecurringInvoice>) {
  const { data, error } = await getClient()
    .from("recurring_invoices")
    .insert(ri)
    .select()
    .single();
  return { data: data as RecurringInvoice | null, error };
}

export async function updateRecurringInvoice(id: string, updates: Partial<RecurringInvoice>) {
  const { data, error } = await getClient()
    .from("recurring_invoices")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data: data as RecurringInvoice | null, error };
}

export async function deleteRecurringInvoice(id: string) {
  const { error } = await getClient()
    .from("recurring_invoices")
    .delete()
    .eq("id", id);
  return { error };
}

function getNextRecurringDate(current: string, frequency: string): string {
  const d = new Date(current);
  switch (frequency) {
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    case "yearly": d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split("T")[0];
}

// Generate invoices for all due recurring templates
export async function processDueRecurringInvoices(businessId: string) {
  const today = new Date().toISOString().split("T")[0];
  const { data: dueRecurrings } = await getClient()
    .from("recurring_invoices")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .lte("next_date", today);

  if (!dueRecurrings || dueRecurrings.length === 0) return 0;

  let generated = 0;

  for (const ri of dueRecurrings) {
    // Check end_date
    if (ri.end_date && ri.next_date > ri.end_date) {
      await getClient().from("recurring_invoices").update({ is_active: false }).eq("id", ri.id);
      continue;
    }

    const items = (ri.items_template as any[]) || [];
    const subtotal = items.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0);
    const taxAmount = Math.round((subtotal * Number(ri.tax_percentage)) / 100);
    const total = subtotal + taxAmount - Number(ri.discount);

    const invoiceNumber = await getNextInvoiceNumber(businessId);

    // Due date: 15 days from issue
    const dueDate = new Date(ri.next_date);
    dueDate.setDate(dueDate.getDate() + 15);

    await createInvoice(
      {
        business_id: businessId,
        customer_id: ri.customer_id,
        invoice_number: invoiceNumber,
        status: "sent",
        issue_date: ri.next_date,
        due_date: dueDate.toISOString().split("T")[0],
        subtotal,
        tax_percentage: Number(ri.tax_percentage),
        tax_amount: taxAmount,
        discount: Number(ri.discount),
        total,
        notes_en: ri.notes_en || "",
        notes_ur: ri.notes_ur || "",
      },
      items.map((item: any, idx: number) => ({
        description_en: item.description_en,
        description_ur: item.description_ur,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
        sort_order: idx,
      }))
    );

    // Advance next_date and update counters
    const nextDate = getNextRecurringDate(ri.next_date, ri.frequency);
    await getClient()
      .from("recurring_invoices")
      .update({
        next_date: nextDate,
        last_generated_at: new Date().toISOString(),
        total_generated: (ri.total_generated || 0) + 1,
        is_active: ri.end_date && nextDate > ri.end_date ? false : true,
      })
      .eq("id", ri.id);

    generated++;
  }

  return generated;
}

// ==================== CUSTOMER LEDGER ====================

export async function getCustomerInvoices(customerId: string) {
  const { data, error } = await getClient()
    .from("invoices")
    .select("id, invoice_number, issue_date, due_date, total, status")
    .eq("customer_id", customerId)
    .order("issue_date", { ascending: true });
  return { data, error };
}

export async function getCustomerPayments(customerId: string) {
  const { data, error } = await getClient()
    .from("payments")
    .select("id, amount, payment_date, payment_method, reference_number, invoice:invoices!inner(id, invoice_number, customer_id)")
    .eq("invoice.customer_id", customerId)
    .order("payment_date", { ascending: true });
  return { data, error };
}

export async function getCustomerLedger(customerId: string) {
  const [invRes, payRes] = await Promise.all([
    getCustomerInvoices(customerId),
    getCustomerPayments(customerId),
  ]);

  type LedgerEntry = {
    id: string;
    date: string;
    type: "invoice" | "payment";
    description: string;
    debit: number;
    credit: number;
    ref: string;
    status?: string;
  };

  const entries: LedgerEntry[] = [];

  for (const inv of invRes.data || []) {
    entries.push({
      id: inv.id,
      date: inv.issue_date,
      type: "invoice",
      description: inv.invoice_number,
      debit: Number(inv.total),
      credit: 0,
      ref: inv.invoice_number,
      status: inv.status,
    });
  }

  for (const pay of payRes.data || []) {
    const inv = pay.invoice as any;
    entries.push({
      id: pay.id,
      date: pay.payment_date,
      type: "payment",
      description: `Payment — ${inv?.invoice_number || ""}`,
      debit: 0,
      credit: Number(pay.amount),
      ref: pay.reference_number || pay.payment_method,
    });
  }

  // Sort by date, then invoices before payments on same date
  entries.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.type === "invoice" ? -1 : 1;
  });

  return entries;
}

// ============================================
// ACTIVITY LOG
// ============================================

export async function logActivity(
  businessId: string,
  userId: string,
  action: string,
  entityType: string,
  entityLabel: string,
  entityId?: string,
  details?: Record<string, any>
) {
  await getClient().from("activity_log").insert({
    business_id: businessId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    entity_label: entityLabel,
    details: details || {},
  });
}

export async function getActivityLog(businessId: string, limit: number = 50) {
  const { data, error } = await getClient()
    .from("activity_log")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: data as ActivityLog[] | null, error };
}

// ============================================
// STOCK MANAGEMENT
// ============================================

export async function getLowStockProducts(businessId: string, threshold: number = 5) {
  const { data, error } = await getClient()
    .from("products")
    .select("id, name_en, name_ur, stock_quantity, unit")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .not("stock_quantity", "is", null)
    .lte("stock_quantity", threshold)
    .order("stock_quantity", { ascending: true });
  return { data: data as Pick<Product, "id" | "name_en" | "name_ur" | "stock_quantity" | "unit">[] | null, error };
}

export async function deductStock(productId: string, quantity: number) {
  const { data: product } = await getClient()
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .single();

  if (product && product.stock_quantity !== null) {
    await getClient()
      .from("products")
      .update({ stock_quantity: Math.max(0, product.stock_quantity - quantity) })
      .eq("id", productId);
  }
}

// ============================================
// CUSTOMER PORTAL
// ============================================

export async function generatePortalToken(customerId: string) {
  const token = generateToken();
  const { data, error } = await getClient()
    .from("customers")
    .update({ portal_token: token })
    .eq("id", customerId)
    .select("portal_token")
    .single();
  return { token: data?.portal_token || token, error };
}

export async function getPortalInvoices(customerId: string) {
  const { data, error } = await getClient()
    .from("invoices")
    .select("id, invoice_number, issue_date, due_date, total, status, subtotal, tax_amount, discount")
    .eq("customer_id", customerId)
    .order("issue_date", { ascending: false });
  return { data, error };
}

// ============================================
// BULK INVOICE OPERATIONS
// ============================================

export async function bulkUpdateInvoiceStatus(ids: string[], status: InvoiceStatus) {
  const { error } = await getClient()
    .from("invoices")
    .update({ status })
    .in("id", ids);
  return { error };
}

export async function bulkDeleteInvoices(ids: string[]) {
  const { error } = await getClient()
    .from("invoices")
    .delete()
    .in("id", ids);
  return { error };
}

// ============================================
// SUBSCRIPTIONS & SUPER ADMIN
// ============================================

export async function isSuperAdmin(): Promise<boolean> {
  const { data: { user } } = await getClient().auth.getUser();
  if (!user) return false;
  const { data } = await getClient()
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .single();
  return !!data;
}

export async function getSubscriptionPlans() {
  const { data, error } = await getClient()
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return { data: data as SubscriptionPlan[] | null, error };
}

export async function getAllSubscriptionPlans() {
  const { data, error } = await getClient()
    .from("subscription_plans")
    .select("*")
    .order("sort_order");
  return { data: data as SubscriptionPlan[] | null, error };
}

export async function getBusinessSubscription(businessId: string) {
  const { data, error } = await getClient()
    .from("subscriptions")
    .select("*, plan:subscription_plans(*)")
    .eq("business_id", businessId)
    .single();
  return { data: data as Subscription | null, error };
}

export async function createTrialSubscription(businessId: string) {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);
  const { data, error } = await getClient()
    .from("subscriptions")
    .insert({
      business_id: businessId,
      status: "trialing",
      trial_ends_at: trialEnd.toISOString(),
    })
    .select()
    .single();
  return { data: data as Subscription | null, error };
}

export async function activateSubscription(
  businessId: string,
  planId: string,
  paymentMethod?: string,
  paymentReference?: string,
  notes?: string
) {
  const now = new Date();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const { data: { user } } = await getClient().auth.getUser();

  const { data, error } = await getClient()
    .from("subscriptions")
    .upsert({
      business_id: businessId,
      plan_id: planId,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      activated_by: user?.id,
      payment_method: paymentMethod || "manual",
      payment_reference: paymentReference,
      notes,
    }, { onConflict: "business_id" })
    .select()
    .single();
  return { data: data as Subscription | null, error };
}

export async function updateSubscriptionStatus(businessId: string, status: string) {
  const updates: Record<string, any> = { status };
  if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
  const { data, error } = await getClient()
    .from("subscriptions")
    .update(updates)
    .eq("business_id", businessId)
    .select()
    .single();
  return { data: data as Subscription | null, error };
}

// ============================================
// SUPER ADMIN: ALL BUSINESSES
// ============================================

export async function adminGetAllBusinesses() {
  const { data, error } = await getClient()
    .from("businesses")
    .select("*, subscriptions(*)")
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function adminGetBusinessDetail(businessId: string) {
  const { data, error } = await getClient()
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();
  return { data, error };
}

export async function adminGetBusinessStats(businessId: string) {
  const client = getClient();
  const [invoices, customers, members] = await Promise.all([
    client.from("invoices").select("id, total, status", { count: "exact" }).eq("business_id", businessId),
    client.from("customers").select("id", { count: "exact" }).eq("business_id", businessId),
    client.from("business_members").select("id, role, user_id", { count: "exact" }).eq("business_id", businessId),
  ]);
  return {
    invoiceCount: invoices.count || 0,
    totalRevenue: invoices.data?.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total), 0) || 0,
    customerCount: customers.count || 0,
    memberCount: members.count || 0,
    members: members.data || [],
  };
}

export async function adminUpdatePlan(planId: string, updates: Partial<SubscriptionPlan>) {
  const { data, error } = await getClient()
    .from("subscription_plans")
    .update(updates)
    .eq("id", planId)
    .select()
    .single();
  return { data, error };
}

export async function adminCreatePlan(plan: Partial<SubscriptionPlan>) {
  const { data, error } = await getClient()
    .from("subscription_plans")
    .insert(plan)
    .select()
    .single();
  return { data, error };
}
