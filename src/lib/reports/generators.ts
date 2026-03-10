import {
  getInvoicesByDateRange,
  getExpensesByDateRange,
  getCustomers,
  getPayments,
} from "@/lib/supabase/database";
import { createClient } from "@/lib/supabase/client";
import type { Language } from "@/types";
import type { ExcelColumn } from "./excel";

// ---- Types ----

export type ReportType =
  | "invoice-register"
  | "payment-register"
  | "customer-statement"
  | "monthly-revenue"
  | "expense-report"
  | "profit-loss";

export interface ReportResult {
  title: string;
  columns: ExcelColumn[];
  rows: Record<string, any>[];
}

// ---- Helpers ----

function fmtPKR(n: number) {
  return `Rs. ${n.toLocaleString("en-PK")}`;
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7); // "2026-03"
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

// ---- Generators ----

export async function generateReport(
  type: ReportType,
  businessId: string,
  startDate: string,
  endDate: string,
  lang: Language,
  customerId?: string
): Promise<ReportResult> {
  switch (type) {
    case "invoice-register":
      return generateInvoiceRegister(businessId, startDate, endDate, lang);
    case "payment-register":
      return generatePaymentRegister(businessId, startDate, endDate, lang);
    case "customer-statement":
      return generateCustomerStatement(businessId, startDate, endDate, lang, customerId!);
    case "monthly-revenue":
      return generateMonthlyRevenue(businessId, startDate, endDate, lang);
    case "expense-report":
      return generateExpenseReport(businessId, startDate, endDate, lang);
    case "profit-loss":
      return generateProfitLoss(businessId, startDate, endDate, lang);
    default:
      return { title: "", columns: [], rows: [] };
  }
}

// 1. Invoice Register
async function generateInvoiceRegister(
  businessId: string,
  startDate: string,
  endDate: string,
  lang: Language
): Promise<ReportResult> {
  const { data } = await getInvoicesByDateRange(businessId, startDate, endDate);

  const columns: ExcelColumn[] = [
    { header: "Invoice #", key: "number", width: 12 },
    { header: "Date", key: "date", width: 12 },
    { header: "Customer", key: "customer", width: 25 },
    { header: "Status", key: "status", width: 10 },
    { header: "Amount (PKR)", key: "amount", width: 15 },
  ];

  const rows = (data || []).map((inv: any) => ({
    number: inv.invoice_number || inv.id?.slice(0, 8),
    date: inv.issue_date,
    customer: lang === "ur"
      ? inv.customer?.name_ur || inv.customer?.name_en || ""
      : inv.customer?.name_en || "",
    status: inv.status,
    amount: Number(inv.total),
    amount_display: fmtPKR(Number(inv.total)),
  }));

  return { title: "Invoice Register", columns, rows };
}

// 2. Payment Register
async function generatePaymentRegister(
  businessId: string,
  startDate: string,
  endDate: string,
  lang: Language
): Promise<ReportResult> {
  const { data: allPayments } = await getPayments(businessId);

  // Filter by date range
  const payments = (allPayments || []).filter(
    (p: any) => p.payment_date >= startDate && p.payment_date <= endDate
  );

  const columns: ExcelColumn[] = [
    { header: "Date", key: "date", width: 12 },
    { header: "Invoice #", key: "invoice", width: 12 },
    { header: "Customer", key: "customer", width: 25 },
    { header: "Method", key: "method", width: 15 },
    { header: "Reference", key: "reference", width: 15 },
    { header: "Amount (PKR)", key: "amount", width: 15 },
  ];

  const rows = payments.map((p: any) => ({
    date: p.payment_date,
    invoice: p.invoice?.invoice_number || "",
    customer: lang === "ur"
      ? p.invoice?.customer?.name_ur || p.invoice?.customer?.name_en || ""
      : p.invoice?.customer?.name_en || "",
    method: p.payment_method,
    reference: p.reference_number || "",
    amount: Number(p.amount),
    amount_display: fmtPKR(Number(p.amount)),
  }));

  return { title: "Payment Register", columns, rows };
}

// 3. Customer Statement
async function generateCustomerStatement(
  businessId: string,
  startDate: string,
  endDate: string,
  lang: Language,
  customerId: string
): Promise<ReportResult> {
  const supabase = createClient();

  // Get customer info
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  // Get invoices for this customer in range
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .gte("issue_date", startDate)
    .lte("issue_date", endDate)
    .order("issue_date");

  // Get payments for those invoices
  const invoiceIds = (invoices || []).map((i: any) => i.id);
  let payments: any[] = [];
  if (invoiceIds.length > 0) {
    const { data: payData } = await supabase
      .from("payments")
      .select("*")
      .in("invoice_id", invoiceIds)
      .order("payment_date");
    payments = payData || [];
  }

  const columns: ExcelColumn[] = [
    { header: "Date", key: "date", width: 12 },
    { header: "Type", key: "type", width: 10 },
    { header: "Description", key: "description", width: 30 },
    { header: "Debit (PKR)", key: "debit", width: 15 },
    { header: "Credit (PKR)", key: "credit", width: 15 },
    { header: "Balance (PKR)", key: "balance", width: 15 },
  ];

  // Combine invoices (debits) and payments (credits) into timeline
  const entries: any[] = [];
  for (const inv of invoices || []) {
    entries.push({
      date: inv.issue_date,
      type: "Invoice",
      description: `Invoice ${inv.invoice_number}`,
      debit: Number(inv.total),
      credit: 0,
      sortKey: `${inv.issue_date}-0`,
    });
  }
  for (const pay of payments) {
    entries.push({
      date: pay.payment_date,
      type: "Payment",
      description: `Payment (${pay.payment_method})`,
      debit: 0,
      credit: Number(pay.amount),
      sortKey: `${pay.payment_date}-1`,
    });
  }

  entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  // Running balance
  let balance = 0;
  const rows = entries.map((e) => {
    balance += e.debit - e.credit;
    return {
      date: e.date,
      type: e.type,
      description: e.description,
      debit: e.debit || "",
      credit: e.credit || "",
      balance,
      balance_display: fmtPKR(balance),
    };
  });

  const custName = lang === "ur"
    ? customer?.name_ur || customer?.name_en
    : customer?.name_en;

  return { title: `Statement: ${custName}`, columns, rows };
}

// 4. Monthly Revenue
async function generateMonthlyRevenue(
  businessId: string,
  startDate: string,
  endDate: string,
  lang: Language
): Promise<ReportResult> {
  const { data } = await getInvoicesByDateRange(businessId, startDate, endDate);

  const map = new Map<string, { paid: number; pending: number; total: number; count: number }>();

  for (const inv of data || []) {
    const mk = monthKey(inv.issue_date);
    const existing = map.get(mk) || { paid: 0, pending: 0, total: 0, count: 0 };
    const amt = Number(inv.total);
    existing.total += amt;
    existing.count += 1;
    if (inv.status === "paid") existing.paid += amt;
    else existing.pending += amt;
    map.set(mk, existing);
  }

  const columns: ExcelColumn[] = [
    { header: "Month", key: "month", width: 12 },
    { header: "Invoices", key: "count", width: 10 },
    { header: "Paid (PKR)", key: "paid", width: 15 },
    { header: "Pending (PKR)", key: "pending", width: 15 },
    { header: "Total (PKR)", key: "total", width: 15 },
  ];

  const rows = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => ({
      month: monthLabel(key),
      count: val.count,
      paid: val.paid,
      pending: val.pending,
      total: val.total,
      paid_display: fmtPKR(val.paid),
      pending_display: fmtPKR(val.pending),
      total_display: fmtPKR(val.total),
    }));

  return { title: "Monthly Revenue", columns, rows };
}

// 5. Expense Report
async function generateExpenseReport(
  businessId: string,
  startDate: string,
  endDate: string,
  lang: Language
): Promise<ReportResult> {
  const { data } = await getExpensesByDateRange(businessId, startDate, endDate);

  const columns: ExcelColumn[] = [
    { header: "Date", key: "date", width: 12 },
    { header: "Description", key: "description", width: 30 },
    { header: "Category", key: "category", width: 18 },
    { header: "Method", key: "method", width: 12 },
    { header: "Amount (PKR)", key: "amount", width: 15 },
  ];

  const rows = (data || []).map((exp: any) => ({
    date: exp.expense_date,
    description: lang === "ur"
      ? exp.description_ur || exp.description_en
      : exp.description_en,
    category: lang === "ur"
      ? exp.category?.name_ur || exp.category?.name_en || "—"
      : exp.category?.name_en || "—",
    method: exp.payment_method,
    amount: Number(exp.amount),
    amount_display: fmtPKR(Number(exp.amount)),
  }));

  return { title: "Expense Report", columns, rows };
}

// 6. Profit & Loss
async function generateProfitLoss(
  businessId: string,
  startDate: string,
  endDate: string,
  lang: Language
): Promise<ReportResult> {
  const [invoiceRes, expenseRes] = await Promise.all([
    getInvoicesByDateRange(businessId, startDate, endDate),
    getExpensesByDateRange(businessId, startDate, endDate),
  ]);

  const revenueMap = new Map<string, number>();
  const expenseMap = new Map<string, number>();

  for (const inv of invoiceRes.data || []) {
    if (inv.status === "paid") {
      const mk = monthKey(inv.issue_date);
      revenueMap.set(mk, (revenueMap.get(mk) || 0) + Number(inv.total));
    }
  }

  for (const exp of expenseRes.data || []) {
    const mk = monthKey(exp.expense_date);
    expenseMap.set(mk, (expenseMap.get(mk) || 0) + Number(exp.amount));
  }

  // Combine all months
  const allMonths = new Set([...revenueMap.keys(), ...expenseMap.keys()]);
  const sorted = Array.from(allMonths).sort();

  const columns: ExcelColumn[] = [
    { header: "Month", key: "month", width: 12 },
    { header: "Revenue (PKR)", key: "revenue", width: 15 },
    { header: "Expenses (PKR)", key: "expenses", width: 15 },
    { header: "Profit (PKR)", key: "profit", width: 15 },
  ];

  const rows = sorted.map((mk) => {
    const revenue = revenueMap.get(mk) || 0;
    const expenses = expenseMap.get(mk) || 0;
    const profit = revenue - expenses;
    return {
      month: monthLabel(mk),
      revenue,
      expenses,
      profit,
      revenue_display: fmtPKR(revenue),
      expenses_display: fmtPKR(expenses),
      profit_display: fmtPKR(profit),
    };
  });

  return { title: "Profit & Loss", columns, rows };
}
