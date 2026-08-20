import { db } from "@/lib/db";

// ─── Default values (used if PlatformSetting rows are missing) ─────────
export const DEFAULT_CHECKLIST_VALIDITY_DAYS = 365;
export const DEFAULT_PENDING_REQUEST_EXPIRY_DAYS = 7;
export const DEFAULT_REMINDER_DAYS_BEFORE = 2;

// ─── Setting keys in PlatformSetting table ────────────────────────────
export const SETTING_KEYS = {
  checklistValidityDays: "checklist_validity_days",
  reminderEnabled: "checklist_reminder_enabled",
  reminderDaysBefore: "checklist_reminder_days_before",
  reminderEmailEnabled: "checklist_reminder_email_enabled",
  reminderInAppEnabled: "checklist_reminder_inapp_enabled",
  reminderSmsEnabled: "checklist_reminder_sms_enabled",
} as const;

// ─── Get the global checklist validity (in days) ──────────────────────
// Used when a candidate submits a checklist — sets valid_until = now + N days.
export async function getChecklistValidityDays(): Promise<number> {
  const setting = await db.platformSetting.findUnique({
    where: { setting_key: SETTING_KEYS.checklistValidityDays },
  });
  const parsed = parseInt(setting?.setting_value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_CHECKLIST_VALIDITY_DAYS;
}

// ─── Get the per-company pending request expiry (in days) ─────────────
// Falls back to the organization's column default (7) if null.
export async function getPendingRequestExpiryDays(
  organizationId: number
): Promise<number> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { pending_request_expiry_days: true },
  });
  return org?.pending_request_expiry_days ?? DEFAULT_PENDING_REQUEST_EXPIRY_DAYS;
}

// ─── Get reminder config (all fields at once) ─────────────────────────
export interface ChecklistReminderConfig {
  enabled: boolean;
  daysBefore: number;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
}

export async function getChecklistReminderConfig(): Promise<ChecklistReminderConfig> {
  const keys = [
    SETTING_KEYS.reminderEnabled,
    SETTING_KEYS.reminderDaysBefore,
    SETTING_KEYS.reminderEmailEnabled,
    SETTING_KEYS.reminderInAppEnabled,
    SETTING_KEYS.reminderSmsEnabled,
  ];
  const rows = await db.platformSetting.findMany({
    where: { setting_key: { in: keys } },
  });
  const map = new Map(rows.map((r) => [r.setting_key, r.setting_value]));

  const parseBool = (k: string, fallback: boolean) => {
    const v = map.get(k);
    if (v === undefined) return fallback;
    return v === "true" || v === "1";
  };
  const parseIntSafe = (v: string | undefined, fallback: number) => {
    const n = parseInt(v ?? "", 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  return {
    enabled: parseBool(SETTING_KEYS.reminderEnabled, true),
    daysBefore: parseIntSafe(
      map.get(SETTING_KEYS.reminderDaysBefore),
      DEFAULT_REMINDER_DAYS_BEFORE
    ),
    emailEnabled: parseBool(SETTING_KEYS.reminderEmailEnabled, true),
    inAppEnabled: parseBool(SETTING_KEYS.reminderInAppEnabled, true),
    smsEnabled: parseBool(SETTING_KEYS.reminderSmsEnabled, false),
  };
}

// ─── Update a single PlatformSetting row (upsert) ─────────────────────
export async function setPlatformSetting(
  key: string,
  value: string,
  updatedBy?: number
): Promise<void> {
  await db.platformSetting.upsert({
    where: { setting_key: key },
    create: { setting_key: key, setting_value: value, updated_by: updatedBy },
    update: { setting_value: value, updated_by: updatedBy },
  });
}
