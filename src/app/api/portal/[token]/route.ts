import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Use service role key to bypass RLS for unauthenticated portal access
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Find customer by portal token
  const { data: customer, error: custError } = await supabase
    .from("customers")
    .select("id, name_en, name_ur, phone, email, balance, business_id")
    .eq("portal_token", token)
    .single();

  if (custError || !customer) {
    return NextResponse.json({ error: "Invalid portal link" }, { status: 404 });
  }

  // Get business info
  const { data: business } = await supabase
    .from("businesses")
    .select("name_en, name_ur, phone, email, address_en")
    .eq("id", customer.business_id)
    .single();

  // Get invoices for this customer
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, issue_date, due_date, total, status, subtotal, tax_amount, discount")
    .eq("customer_id", customer.id)
    .order("issue_date", { ascending: false });

  return NextResponse.json({
    customer: {
      name_en: customer.name_en,
      name_ur: customer.name_ur,
      phone: customer.phone,
      email: customer.email,
      balance: customer.balance,
    },
    business: business || {},
    invoices: invoices || [],
  });
}
