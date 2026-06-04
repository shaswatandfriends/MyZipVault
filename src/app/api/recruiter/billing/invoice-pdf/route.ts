import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateInvoicePdf } from "@/lib/pdf";
import { uploadFile, getSignedUrl, STORAGE_BUCKETS } from "@/lib/storage";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");

    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

    // Fetch the invoice with organization relation
    const invoice = await db.invoice.findUnique({
      where: { id: parseInt(invoiceId, 10) },
      include: { organization: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Ensure the invoice belongs to the user's organization
    if (invoice.organization_id !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If the invoice already has a pdf_url, generate a signed URL and return it
    if (invoice.pdf_url) {
      const signedUrl = await getSignedUrl(
        STORAGE_BUCKETS.INVOICES,
        invoice.pdf_url,
        900 // 15 minutes
      );

      if (signedUrl.startsWith("data:")) {
        return NextResponse.json({ url: signedUrl, isBase64: true });
      }

      return NextResponse.json({ url: signedUrl });
    }

    // No PDF exists yet — generate one
    // Get credit price from platform settings
    const priceSetting = await db.platformSetting.findUnique({
      where: { setting_key: "credit_price_per_unit" },
    });
    const pricePerCredit = priceSetting ? Number(priceSetting.setting_value) : 2.99;

    const invoiceNumber = `INV-${invoice.id.toString().padStart(5, "0")}`;

    const pdfBuffer = await generateInvoicePdf({
      invoiceNumber,
      agencyName: invoice.organization.name,
      creditAmount: invoice.credit_amount,
      pricePerCredit,
      totalPrice: invoice.total_price,
      date: invoice.created_at,
    });

    // Upload the PDF to Supabase Storage
    const uploadResult = await uploadFile(
      STORAGE_BUCKETS.INVOICES,
      `org-${invoice.organization_id}`,
      pdfBuffer,
      `${invoiceNumber}.pdf`,
      "application/pdf"
    );

    // Update the invoice record with the pdf_url
    await db.invoice.update({
      where: { id: invoice.id },
      data: { pdf_url: uploadResult.url },
    });

    // Generate signed URL for the uploaded file
    const signedUrl = await getSignedUrl(
      STORAGE_BUCKETS.INVOICES,
      uploadResult.url,
      900 // 15 minutes
    );

    if (signedUrl.startsWith("data:")) {
      return NextResponse.json({ url: signedUrl, isBase64: true });
    }

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("[RECRUITER_INVOICE_PDF]", error);
    return NextResponse.json(
      { error: "Failed to generate invoice PDF" },
      { status: 500 }
    );
  }
}
