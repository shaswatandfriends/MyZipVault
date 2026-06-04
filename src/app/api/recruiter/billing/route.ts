import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 10;
    const type = searchParams.get("type"); // "purchase" | "deduction" | null (all)

    // Get organization with credit balance
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        credits_balance: true,
        name: true,
        created_at: true,
      },
    });

    // Get credit price from platform settings
    const priceSetting = await db.platformSetting.findUnique({
      where: { setting_key: "credit_price_per_unit" },
    });
    const pricePerCredit = priceSetting ? Number(priceSetting.setting_value) : 2.99;

    // Build transaction query
    const where: { organization_id: number; transaction_type?: string } = {
      organization_id: organizationId,
    };
    if (type && ["purchase", "deduction"].includes(type)) {
      where.transaction_type = type;
    }

    const totalTransactions = await db.creditTransaction.count({ where });

    const transactions = await db.creditTransaction.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Calculate running balance for each transaction
    // Get all transactions before this page to calculate balance
    const allPreviousTransactions = await db.creditTransaction.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: "asc" },
      select: { credit_amount: true },
    });

    let runningBalance = 0;
    const balanceMap = new Map<number, number>();
    const allTransactions = await db.creditTransaction.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: "asc" },
      select: { id: true, credit_amount: true },
    });

    for (const tx of allTransactions) {
      runningBalance += tx.credit_amount;
      balanceMap.set(tx.id, runningBalance);
    }

    const transactionsWithBalance = transactions.map((tx) => ({
      id: tx.id,
      type: tx.transaction_type,
      creditAmount: tx.credit_amount,
      description: tx.description,
      createdAt: tx.created_at,
      balanceAfter: balanceMap.get(tx.id) ?? 0,
    }));

    // Credit packages
    const creditPackages = [
      { credits: 10, pricePerCredit: pricePerCredit, totalPrice: 10 * pricePerCredit, discount: "0%" },
      { credits: 25, pricePerCredit: pricePerCredit * 0.95, totalPrice: 25 * pricePerCredit * 0.95, discount: "5%" },
      { credits: 50, pricePerCredit: pricePerCredit * 0.90, totalPrice: 50 * pricePerCredit * 0.90, discount: "10%" },
      { credits: 100, pricePerCredit: pricePerCredit * 0.80, totalPrice: 100 * pricePerCredit * 0.80, discount: "20%" },
    ];

    // Get invoices
    const invoices = await db.invoice.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: "desc" },
    });

    const invoicesFormatted = invoices.map((inv) => ({
      id: inv.id,
      creditAmount: inv.credit_amount,
      totalPrice: inv.total_price,
      pdfUrl: inv.pdf_url,
      createdAt: inv.created_at,
    }));

    return NextResponse.json({
      organization: {
        name: organization?.name ?? "",
        creditsBalance: organization?.credits_balance ?? 0,
      },
      creditPackages,
      transactions: transactionsWithBalance,
      pagination: {
        page,
        pageSize,
        total: totalTransactions,
        totalPages: Math.ceil(totalTransactions / pageSize),
      },
      invoices: invoicesFormatted,
    });
  } catch (error) {
    console.error("Billing GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing data" },
      { status: 500 }
    );
  }
}
