import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!stripeInstance) {
    if (!STRIPE_SECRET_KEY) {
      console.warn("[STRIPE] SECRET_KEY not configured. Payment processing disabled.");
      return null;
    }
    stripeInstance = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
      typescript: true,
    });
  }
  return stripeInstance;
}

export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY;
}

/**
 * Create a Stripe Checkout Session for credit purchase.
 * Returns the session URL for client-side redirect.
 */
export async function createCreditCheckoutSession(params: {
  organizationId: number;
  organizationName: string;
  creditAmount: number;
  pricePerCredit: number;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; sessionUrl: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const totalPriceCents = Math.round(params.creditAmount * params.pricePerCredit * 100); // Stripe uses cents

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: params.customerEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `MyZipVault Credits - ${params.creditAmount} Credits`,
            description: `${params.creditAmount} credits for accessing candidate compliance packets`,
          },
          unit_amount: totalPriceCents / params.creditAmount,
        },
        quantity: params.creditAmount,
      },
    ],
    metadata: {
      organizationId: String(params.organizationId),
      creditAmount: String(params.creditAmount),
      pricePerCredit: String(params.pricePerCredit),
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return {
    sessionId: session.id,
    sessionUrl: session.url || "",
  };
}

/**
 * Verify a Stripe webhook signature.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  const stripe = getStripe();
  if (!stripe) return null;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[STRIPE] WEBHOOK_SECRET not configured");
    return null;
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return event;
  } catch (err) {
    console.error("[STRIPE] Webhook signature verification failed:", err);
    return null;
  }
}
