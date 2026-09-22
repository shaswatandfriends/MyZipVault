"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Coins } from "@/lib/icons";

/**
 * Credits layout — wraps all /superadmin/credits/* pages with a tab bar
 * at the top. The sidebar just shows "Credits" (single item, no submenu),
 * and all navigation within the Credits section happens via these tabs.
 *
 * Tabs:
 *   - Overview          → /superadmin/credits/dashboard
 *   - Reward Config     → /superadmin/credits/rewards
 *   - Transactions      → /superadmin/credits/transactions
 *   - Balance Adjustment → /superadmin/credits/balance
 */

const TABS = [
  { label: "Overview", href: "/superadmin/credits/dashboard", icon: "📊" },
  { label: "Reward Config", href: "/superadmin/credits/rewards", icon: "🎁" },
  { label: "Transactions", href: "/superadmin/credits/transactions", icon: "📋" },
  { label: "Balance Adjustment", href: "/superadmin/credits/balance", icon: "⚖️" },
];

export default function CreditsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Page header + tab bar */}
      <div>
        <h1 className="text-2xl font-bold text-[#0D3B2E] font-heading flex items-center gap-2 mb-1">
          <Coins className="size-6" />
          Credits
        </h1>
        <p className="text-sm text-[#5C6B66]">
          Manage all credits, rewards, transactions, and balances in one place.
        </p>

        {/* Tab bar */}
        <div className="flex gap-1 mt-4 border-b border-[#E5DFCF] overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px",
                  isActive
                    ? "border-[#0D3B2E] text-[#0D3B2E]"
                    : "border-transparent text-[#5C6B66] hover:text-[#0D3B2E] hover:bg-[#0D3B2E]/5"
                )}
              >
                <span className="text-xs">{tab.icon}</span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
