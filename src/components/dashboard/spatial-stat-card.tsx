"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "@/lib/icons";

// Spatial Stat Card — visionOS-inspired stat tile with gradient icon container,
// 4-tier depth shadow, specular top edge, hover lift.
// Used across recruiter/admin/superadmin dashboards for full visual uniformity.

interface SpatialStatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: LucideIcon;
  iconVariant?: "primary" | "terra" | "amber" | "blue" | "green" | "red";
  onClick?: () => void;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

const iconContainerStyles: Record<NonNullable<SpatialStatCardProps["iconVariant"]>, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(180deg, #4A7C59 0%, #2D5A3D 60%, #1E3A26 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(45,90,61,0.28)",
    color: "#fff",
  },
  terra: {
    background: "linear-gradient(180deg, #E08862 0%, #C97B54 60%, #A0522D 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(201,123,84,0.28)",
    color: "#fff",
  },
  amber: {
    background: "linear-gradient(180deg, #FCD34D 0%, #D97706 60%, #92400E 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 10px rgba(217,119,6,0.28)",
    color: "#fff",
  },
  blue: {
    background: "linear-gradient(180deg, #60A5FA 0%, #3B82F6 60%, #1E40AF 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 10px rgba(59,130,246,0.28)",
    color: "#fff",
  },
  green: {
    background: "linear-gradient(180deg, #86EFAC 0%, #22C55E 60%, #15803D 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 10px rgba(34,197,94,0.28)",
    color: "#fff",
  },
  red: {
    background: "linear-gradient(180deg, #FCA5A5 0%, #DC2626 60%, #7F1D1D 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 10px rgba(220,38,38,0.28)",
    color: "#fff",
  },
};

export function SpatialStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconVariant = "primary",
  onClick,
  footer,
  children,
}: SpatialStatCardProps) {
  return (
    <Card
      className={onClick ? "cursor-pointer group/card" : ""}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium font-heading">
          {title}
        </CardTitle>
        <div
          className="flex items-center justify-center size-8 rounded-[10px]"
          style={iconContainerStyles[iconVariant]}
        >
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {subtitle && (
          <p
            className="text-xs mt-1 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            {subtitle}
          </p>
        )}
        {footer && <div className="mt-1.5">{footer}</div>}
        {children}
      </CardContent>
    </Card>
  );
}

// Spatial avatar — used in tables for initials
export function SpatialAvatar({
  initials,
  variant = "primary",
}: {
  initials: string;
  variant?: "primary" | "terra";
}) {
  return (
    <div
      className="flex items-center justify-center size-8 rounded-full text-xs font-semibold shrink-0"
      style={
        variant === "terra"
          ? {
              background: "linear-gradient(180deg, #E08862 0%, #C97B54 60%, #A0522D 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(201,123,84,0.24)",
              color: "#fff",
            }
          : {
              background: "linear-gradient(180deg, #4A7C59 0%, #2D5A3D 60%, #1E3A26 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(45,90,61,0.24)",
              color: "#fff",
            }
      }
    >
      {initials}
    </div>
  );
}
