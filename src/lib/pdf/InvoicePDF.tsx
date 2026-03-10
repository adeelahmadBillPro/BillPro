import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { registerFonts } from "./fonts";

registerFonts();

// Format PKR
function fmtPKR(n: number) {
  return `Rs ${n.toLocaleString("en-PK")}`;
}

interface InvoicePDFProps {
  invoice: any;
  business: any;
  lang: "en" | "ur";
}

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "NotoSans", fontSize: 10, color: "#1f2937" },
  // Header
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  bizName: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  bizNameUr: { fontFamily: "NotoNastaliq", fontSize: 12, color: "#6b7280", marginBottom: 4 },
  invNumber: { fontSize: 14, fontWeight: 700, color: "#2563eb", textAlign: "right" },
  muted: { fontSize: 9, color: "#6b7280" },
  mutedRight: { fontSize: 9, color: "#6b7280", textAlign: "right" },
  // Bill To
  billTo: { backgroundColor: "#f9fafb", borderRadius: 6, padding: 12, marginBottom: 20 },
  billToLabel: { fontSize: 8, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 1 },
  custName: { fontSize: 11, fontWeight: 600 },
  custNameUr: { fontFamily: "NotoNastaliq", fontSize: 10, color: "#6b7280", marginTop: 2 },
  // Table
  table: { marginBottom: 20 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: "#e5e7eb", paddingBottom: 6, marginBottom: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingVertical: 6 },
  colNum: { width: "6%" },
  colDesc: { width: "44%" },
  colQty: { width: "12%", textAlign: "center" },
  colPrice: { width: "19%", textAlign: "right" },
  colTotal: { width: "19%", textAlign: "right" },
  thText: { fontSize: 8, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 0.5 },
  descUr: { fontFamily: "NotoNastaliq", fontSize: 8, color: "#6b7280" },
  // Totals
  totalsWrap: { alignItems: "flex-end", marginBottom: 20 },
  totalsBox: { width: 200 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 6, marginTop: 4, borderTopWidth: 2, borderTopColor: "#e5e7eb" },
  grandTotalLabel: { fontSize: 12, fontWeight: 700 },
  grandTotalValue: { fontSize: 12, fontWeight: 700, color: "#2563eb" },
  // Notes
  notesSection: { borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 16, marginTop: 8 },
  notesLabel: { fontSize: 8, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" as const },
  notesText: { fontSize: 9, color: "#374151", lineHeight: 1.5 },
  notesUr: { fontFamily: "NotoNastaliq", fontSize: 9, color: "#374151", marginTop: 4 },
  // Status badge
  statusBadge: { fontSize: 8, fontWeight: 600, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, textTransform: "uppercase" as const },
  // Footer
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#9ca3af" },
});

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#f3f4f6", text: "#6b7280" },
  sent: { bg: "#dbeafe", text: "#2563eb" },
  paid: { bg: "#dcfce7", text: "#16a34a" },
  overdue: { bg: "#fee2e2", text: "#dc2626" },
};

export default function InvoicePDF({ invoice, business, lang }: InvoicePDFProps) {
  const items = invoice.items || [];
  const sc = STATUS_COLORS[invoice.status] || STATUS_COLORS.draft;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header: Business Info + Invoice Number */}
        <View style={s.header}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            {business?.logo_url && (
              <Image src={business.logo_url} style={{ width: 48, height: 48, objectFit: "contain" }} />
            )}
            <View>
            <Text style={s.bizName}>{business?.name_en || "Business"}</Text>
            {business?.name_ur && <Text style={s.bizNameUr}>{business.name_ur}</Text>}
            {business?.address_en && <Text style={s.muted}>{business.address_en}</Text>}
            {business?.phone && <Text style={s.muted}>{business.phone}</Text>}
            {business?.ntn_number && <Text style={s.muted}>NTN: {business.ntn_number}</Text>}
            </View>
          </View>
          <View>
            <Text style={s.invNumber}>{invoice.invoice_number}</Text>
            <Text style={s.mutedRight}>Date: {invoice.issue_date}</Text>
            <Text style={s.mutedRight}>Due: {invoice.due_date}</Text>
            <View style={{ alignItems: "flex-end", marginTop: 6 }}>
              <Text style={[s.statusBadge, { backgroundColor: sc.bg, color: sc.text }]}>
                {invoice.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Bill To */}
        <View style={s.billTo}>
          <Text style={s.billToLabel}>Bill To</Text>
          <Text style={s.custName}>{invoice.customer?.name_en || "—"}</Text>
          {invoice.customer?.name_ur && <Text style={s.custNameUr}>{invoice.customer.name_ur}</Text>}
          {invoice.customer?.phone && <Text style={s.muted}>{invoice.customer.phone}</Text>}
          {invoice.customer?.email && <Text style={s.muted}>{invoice.customer.email}</Text>}
        </View>

        {/* Items Table */}
        <View style={s.table}>
          {/* Header */}
          <View style={s.tableHeader}>
            <Text style={[s.thText, s.colNum]}>#</Text>
            <Text style={[s.thText, s.colDesc]}>Description</Text>
            <Text style={[s.thText, s.colQty]}>Qty</Text>
            <Text style={[s.thText, s.colPrice]}>Unit Price</Text>
            <Text style={[s.thText, s.colTotal]}>Total</Text>
          </View>
          {/* Rows */}
          {items.map((item: any, idx: number) => (
            <View key={item.id || idx} style={s.tableRow}>
              <Text style={[s.colNum, s.muted]}>{idx + 1}</Text>
              <View style={s.colDesc}>
                <Text>{item.description_en}</Text>
                {item.description_ur && <Text style={s.descUr}>{item.description_ur}</Text>}
              </View>
              <Text style={s.colQty}>{item.quantity}</Text>
              <Text style={s.colPrice}>{fmtPKR(Number(item.unit_price))}</Text>
              <Text style={[s.colTotal, { fontWeight: 600 }]}>{fmtPKR(Number(item.total))}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalsWrap}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.muted}>Subtotal</Text>
              <Text>{fmtPKR(Number(invoice.subtotal))}</Text>
            </View>
            {Number(invoice.tax_amount) > 0 && (
              <View style={s.totalRow}>
                <Text style={s.muted}>Tax ({invoice.tax_percentage}%)</Text>
                <Text>{fmtPKR(Number(invoice.tax_amount))}</Text>
              </View>
            )}
            {Number(invoice.discount) > 0 && (
              <View style={s.totalRow}>
                <Text style={s.muted}>Discount</Text>
                <Text>-{fmtPKR(Number(invoice.discount))}</Text>
              </View>
            )}
            <View style={s.grandTotalRow}>
              <Text style={s.grandTotalLabel}>Total</Text>
              <Text style={s.grandTotalValue}>{fmtPKR(Number(invoice.total))}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {(invoice.notes_en || invoice.notes_ur) && (
          <View style={s.notesSection}>
            <Text style={s.notesLabel}>Notes</Text>
            {invoice.notes_en && <Text style={s.notesText}>{invoice.notes_en}</Text>}
            {invoice.notes_ur && <Text style={s.notesUr}>{invoice.notes_ur}</Text>}
          </View>
        )}

        {/* Footer */}
        <Text style={s.footer}>
          Generated by BillPro — {business?.name_en || ""}
        </Text>
      </Page>
    </Document>
  );
}
