import twilio from "twilio";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";

let twilioClient: twilio.Twilio | null = null;

export function getTwilioClient(): twilio.Twilio | null {
  if (!twilioClient) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.warn("[TWILIO] ACCOUNT_SID or AUTH_TOKEN not configured. SMS disabled.");
      return null;
    }
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

export function isTwilioConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);
}

/**
 * Send an SMS message via Twilio.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendSMS(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const client = getTwilioClient();

  if (!client) {
    console.log(`[TWILIO] Not configured. Would send SMS to ${to}: ${message.substring(0, 100)}...`);
    return { success: false, error: "Twilio not configured" };
  }

  try {
    // Format phone number (ensure it starts with +)
    const formattedTo = to.startsWith("+") ? to : `+1${to.replace(/\D/g, "")}`;
    const formattedFrom = TWILIO_PHONE_NUMBER.startsWith("+")
      ? TWILIO_PHONE_NUMBER
      : `+1${TWILIO_PHONE_NUMBER.replace(/\D/g, "")}`;

    const result = await client.messages.create({
      body: message,
      from: formattedFrom,
      to: formattedTo,
    });

    if (result.status === "failed" || result.status === "undelivered") {
      console.error("[TWILIO] SMS failed:", result.errorMessage);
      return { success: false, error: result.errorMessage || "SMS delivery failed" };
    }

    console.log(`[TWILIO] SMS sent to ${to}, SID: ${result.sid}`);
    return { success: true, messageId: result.sid };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[TWILIO] SMS error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
