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

interface ReceiptPDFProps {
  payment: any; // { amount, payment_date, payment_method, reference_number, invoice: { invoice_number, customer: { name_en, name_ur, phone, email } } }
  business: any; // { name_en, name_ur, address_en, phone, ntn_number, logo_url }
  lang: "en" | "ur";
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  online: "Online Payment",
};

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "NotoSans",
    fontSize: 10,
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#059669",
  },
  bizName: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  bizNameUr: {
    fontFamily: "NotoNastaliq",
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  muted: { fontSize: 9, color: "#6b7280" },

  // Title
  titleWrap: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#059669",
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  titleLine: {
    width: 60,
    height: 2,
    backgroundColor: "#059669",
    marginTop: 6,
    borderRadius: 1,
  },

  // Receipt details section
  detailsContainer: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 24,
  },
  detailsBox: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 16,
  },
  detailsLabel: {
    fontSize: 8,
    color: "#9ca3af",
    marginBottom: 10,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    fontWeight: 600,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  detailKey: {
    fontSize: 9,
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 9,
    fontWeight: 600,
    color: "#1f2937",
  },

  // Customer info
  custName: { fontSize: 11, fontWeight: 600 },
  custNameUr: {
    fontFamily: "NotoNastaliq",
    fontSize: 10,
    color: "#6b7280",
    marginTop: 2,
  },

  // Amount section
  amountSection: {
    alignItems: "center",
    marginVertical: 28,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  amountLabel: {
    fontSize: 9,
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 700,
    color: "#059669",
  },
  amountBadge: {
    marginTop: 10,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  amountBadgeText: {
    fontSize: 8,
    fontWeight: 600,
    color: "#16a34a",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },

  // Thank you footer
  thankYou: {
    alignItems: "center",
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  thankYouText: {
    fontSize: 14,
    fontWeight: 700,
    color: "#059669",
    marginBottom: 4,
  },
  thankYouSub: {
    fontSize: 9,
    color: "#9ca3af",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
  },
});

export default function ReceiptPDF({
  payment,
  business,
  lang,
}: ReceiptPDFProps) {
  const customer = payment.invoice?.customer;
  const invoiceNumber = payment.invoice?.invoice_number || "—";
  const method = METHOD_LABELS[payment.payment_method] || payment.payment_method || "—";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header: Business Info */}
        <View style={s.header}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            {business?.logo_url && (
              <Image
                src={business.logo_url}
                style={{ width: 48, height: 48, objectFit: "contain" }}
              />
            )}
            <View>
              <Text style={s.bizName}>
                {business?.name_en || "Business"}
              </Text>
              {business?.name_ur && (
                <Text style={s.bizNameUr}>{business.name_ur}</Text>
              )}
              {business?.address_en && (
                <Text style={s.muted}>{business.address_en}</Text>
              )}
              {business?.phone && (
                <Text style={s.muted}>{business.phone}</Text>
              )}
              {business?.ntn_number && (
                <Text style={s.muted}>NTN: {business.ntn_number}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Title */}
        <View style={s.titleWrap}>
          <Text style={s.title}>Payment Receipt</Text>
          <View style={s.titleLine} />
        </View>

        {/* Receipt Details & Customer Info */}
        <View style={s.detailsContainer}>
          {/* Left: Receipt Details */}
          <View style={s.detailsBox}>
            <Text style={s.detailsLabel}>Receipt Details</Text>
            <View style={s.detailRow}>
              <Text style={s.detailKey}>Payment Date</Text>
              <Text style={s.detailValue}>{payment.payment_date || "—"}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailKey}>Payment Method</Text>
              <Text style={s.detailValue}>{method}</Text>
            </View>
            {payment.reference_number && (
              <View style={s.detailRow}>
                <Text style={s.detailKey}>Reference No.</Text>
                <Text style={s.detailValue}>
                  {payment.reference_number}
                </Text>
              </View>
            )}
            <View style={s.detailRow}>
              <Text style={s.detailKey}>Invoice No.</Text>
              <Text style={s.detailValue}>{invoiceNumber}</Text>
            </View>
          </View>

          {/* Right: Customer Info */}
          <View style={s.detailsBox}>
            <Text style={s.detailsLabel}>Received From</Text>
            <Text style={s.custName}>
              {customer?.name_en || "—"}
            </Text>
            {customer?.name_ur && (
              <Text style={s.custNameUr}>{customer.name_ur}</Text>
            )}
            {customer?.phone && (
              <View style={{ marginTop: 6 }}>
                <Text style={s.muted}>{customer.phone}</Text>
              </View>
            )}
            {customer?.email && (
              <Text style={s.muted}>{customer.email}</Text>
            )}
          </View>
        </View>

        {/* Amount Section */}
        <View style={s.amountSection}>
          <Text style={s.amountLabel}>Amount Received</Text>
          <Text style={s.amountValue}>
            {fmtPKR(Number(payment.amount))}
          </Text>
          <View style={s.amountBadge}>
            <Text style={s.amountBadgeText}>Payment Confirmed</Text>
          </View>
        </View>

        {/* Thank You */}
        <View style={s.thankYou}>
          <Text style={s.thankYouText}>Thank You!</Text>
          <Text style={s.thankYouSub}>
            This receipt confirms your payment has been received.
          </Text>
        </View>

        {/* Footer */}
        <Text style={s.footer}>
          Generated by BillPro — {business?.name_en || ""}
        </Text>
      </Page>
    </Document>
  );
}
