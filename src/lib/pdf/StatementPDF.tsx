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

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export interface StatementPDFProps {
  customer: any;
  entries: { date: string; description: string; ref: string; debit: number; credit: number; balance: number }[];
  totalDebit: number;
  totalCredit: number;
  finalBalance: number;
  business: any;
  lang: "en" | "ur";
}

const GREEN = "#059669";
const GREEN_LIGHT = "#ecfdf5";
const RED = "#dc2626";

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "NotoSans", fontSize: 10, color: "#1f2937" },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: GREEN },
  bizName: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  bizNameUr: { fontFamily: "NotoNastaliq", fontSize: 12, color: "#6b7280", marginBottom: 4 },
  muted: { fontSize: 9, color: "#6b7280" },

  // Title
  titleWrap: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 700, color: GREEN, marginBottom: 4 },
  titleUr: { fontFamily: "NotoNastaliq", fontSize: 14, color: GREEN },
  dateText: { fontSize: 9, color: "#6b7280", marginTop: 4 },

  // Customer info
  custBox: { backgroundColor: "#f9fafb", borderRadius: 6, padding: 12, marginBottom: 20 },
  custLabel: { fontSize: 8, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 1 },
  custName: { fontSize: 12, fontWeight: 600, marginBottom: 1 },
  custNameUr: { fontFamily: "NotoNastaliq", fontSize: 10, color: "#6b7280", marginTop: 2, marginBottom: 2 },
  custDetail: { fontSize: 9, color: "#6b7280", marginTop: 1 },

  // Table
  table: { marginBottom: 16 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f9fafb", borderBottomWidth: 2, borderBottomColor: "#e5e7eb", paddingVertical: 7, paddingHorizontal: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingVertical: 6, paddingHorizontal: 4 },
  tableRowAlt: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingVertical: 6, paddingHorizontal: 4, backgroundColor: "#fafafa" },
  thText: { fontSize: 8, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 0.5 },
  colDate: { width: "13%" },
  colDesc: { width: "30%" },
  colRef: { width: "17%" },
  colDebit: { width: "13%", textAlign: "right" },
  colCredit: { width: "13%", textAlign: "right" },
  colBal: { width: "14%", textAlign: "right" },

  // Totals row
  totalsRow: { flexDirection: "row", borderTopWidth: 2, borderTopColor: "#e5e7eb", paddingVertical: 8, paddingHorizontal: 4, backgroundColor: "#f9fafb" },
  totalsLabel: { fontSize: 10, fontWeight: 700 },

  // Summary box
  summaryWrap: { marginTop: 20, alignItems: "flex-end" },
  summaryBox: { width: 240, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 6, overflow: "hidden" },
  summaryHeader: { backgroundColor: GREEN, paddingVertical: 8, paddingHorizontal: 12 },
  summaryHeaderText: { fontSize: 10, fontWeight: 700, color: "#ffffff" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  summaryLabel: { fontSize: 9, color: "#6b7280" },
  summaryValue: { fontSize: 10, fontWeight: 600 },
  summaryTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#f9fafb" },
  summaryTotalLabel: { fontSize: 10, fontWeight: 700 },
  summaryTotalValue: { fontSize: 11, fontWeight: 700 },

  // Footer
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#9ca3af" },
});

export default function StatementPDF({ customer, entries, totalDebit, totalCredit, finalBalance, business, lang }: StatementPDFProps) {
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const balanceDue = finalBalance > 0;
  const overpaid = finalBalance < 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Business Header */}
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
        </View>

        {/* Title */}
        <View style={s.titleWrap}>
          <Text style={s.title}>CUSTOMER STATEMENT</Text>
          {lang === "ur" && <Text style={s.titleUr}>صارف اسٹیٹمنٹ</Text>}
          <Text style={s.dateText}>As of {today}</Text>
        </View>

        {/* Customer Info */}
        <View style={s.custBox}>
          <Text style={s.custLabel}>Statement For</Text>
          <Text style={s.custName}>{customer?.name_en || "—"}</Text>
          {customer?.name_ur && <Text style={s.custNameUr}>{customer.name_ur}</Text>}
          {customer?.phone && <Text style={s.custDetail}>{customer.phone}</Text>}
          {customer?.email && <Text style={s.custDetail}>{customer.email}</Text>}
          {(customer?.address_en || customer?.city_en) && (
            <Text style={s.custDetail}>
              {customer.address_en}{customer.address_en && customer.city_en ? ", " : ""}{customer.city_en || ""}
            </Text>
          )}
        </View>

        {/* Ledger Table */}
        <View style={s.table}>
          {/* Header */}
          <View style={s.tableHeader}>
            <Text style={[s.thText, s.colDate]}>Date</Text>
            <Text style={[s.thText, s.colDesc]}>Description</Text>
            <Text style={[s.thText, s.colRef]}>Reference</Text>
            <Text style={[s.thText, s.colDebit]}>Debit</Text>
            <Text style={[s.thText, s.colCredit]}>Credit</Text>
            <Text style={[s.thText, s.colBal]}>Balance</Text>
          </View>

          {/* Rows */}
          {entries.map((entry, idx) => (
            <View key={idx} style={idx % 2 === 1 ? s.tableRowAlt : s.tableRow}>
              <Text style={[s.colDate, { fontSize: 9 }]}>{fmtDate(entry.date)}</Text>
              <Text style={[s.colDesc, { fontSize: 9 }]}>{entry.description}</Text>
              <Text style={[s.colRef, { fontSize: 9, color: "#6b7280" }]}>{entry.ref}</Text>
              <Text style={[s.colDebit, { fontSize: 9, color: entry.debit > 0 ? RED : "#1f2937" }]}>
                {entry.debit > 0 ? fmtPKR(entry.debit) : "—"}
              </Text>
              <Text style={[s.colCredit, { fontSize: 9, color: entry.credit > 0 ? GREEN : "#1f2937" }]}>
                {entry.credit > 0 ? fmtPKR(entry.credit) : "—"}
              </Text>
              <Text style={[s.colBal, { fontSize: 9, fontWeight: 600, color: entry.balance > 0 ? RED : entry.balance < 0 ? GREEN : "#1f2937" }]}>
                {fmtPKR(Math.abs(entry.balance))}
                {entry.balance < 0 ? " CR" : ""}
              </Text>
            </View>
          ))}

          {/* Totals row */}
          <View style={s.totalsRow}>
            <Text style={[s.colDate, s.totalsLabel]}></Text>
            <Text style={[s.colDesc, s.totalsLabel]}>Totals</Text>
            <Text style={[s.colRef, s.totalsLabel]}></Text>
            <Text style={[s.colDebit, { fontSize: 10, fontWeight: 700, color: RED }]}>
              {fmtPKR(totalDebit)}
            </Text>
            <Text style={[s.colCredit, { fontSize: 10, fontWeight: 700, color: GREEN }]}>
              {fmtPKR(totalCredit)}
            </Text>
            <Text style={[s.colBal, { fontSize: 10, fontWeight: 700, color: balanceDue ? RED : overpaid ? GREEN : "#1f2937" }]}>
              {fmtPKR(Math.abs(finalBalance))}
              {overpaid ? " CR" : ""}
            </Text>
          </View>
        </View>

        {/* Balance Summary */}
        <View style={s.summaryWrap}>
          <View style={s.summaryBox}>
            <View style={s.summaryHeader}>
              <Text style={s.summaryHeaderText}>Balance Summary</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Total Invoiced</Text>
              <Text style={s.summaryValue}>{fmtPKR(totalDebit)}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Total Paid</Text>
              <Text style={s.summaryValue}>{fmtPKR(totalCredit)}</Text>
            </View>
            <View style={s.summaryTotalRow}>
              <Text style={s.summaryTotalLabel}>
                {balanceDue ? "Balance Due" : overpaid ? "Overpaid" : "Settled"}
              </Text>
              <Text style={[s.summaryTotalValue, { color: balanceDue ? RED : overpaid ? GREEN : "#1f2937" }]}>
                {fmtPKR(Math.abs(finalBalance))}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={s.footer}>
          Generated by BillPro — {business?.name_en || ""} — Statement as of {today}
        </Text>
      </Page>
    </Document>
  );
}
