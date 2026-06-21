import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow,background-color] duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        // Primary — forest green pill with subtle gradient
        default:
          "border-transparent bg-gradient-to-b from-[var(--primary-vivid)] to-[var(--primary)] text-white shadow-[0_1px_3px_rgba(45,90,61,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] [a&]:hover:from-[var(--primary)] [a&]:hover:to-[var(--primary-hover)]",
        // Secondary — warm off-white glass pill
        secondary:
          "border-[var(--border-strong)] bg-[rgba(255,252,248,0.7)] backdrop-blur-sm text-[var(--text-primary)] shadow-[0_1px_2px_rgba(45,90,61,0.04),inset_0_1px_0_rgba(255,255,255,0.6)] [a&]:hover:bg-[rgba(255,252,248,0.95)]",
        // Destructive — red pill with gradient
        destructive:
          "border-transparent bg-gradient-to-b from-[#C84545] to-[var(--status-red)] text-white shadow-[0_1px_3px_rgba(184,64,64,0.24),inset_0_1px_0_rgba(255,255,255,0.2)] [a&]:hover:from-[var(--status-red)] [a&]:hover:to-[var(--status-red-dark)] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        // Outline — clean primary border
        outline:
          "border-[1.5px] border-[var(--primary)] bg-[rgba(255,252,248,0.5)] backdrop-blur-sm text-[var(--primary)] [a&]:hover:bg-[var(--primary-light)] [a&]:hover:text-[var(--primary-hover)]",
        // Success — green soft pill
        success:
          "border-transparent bg-[var(--status-green-bg)] text-[var(--status-green-dark)] border border-[var(--status-green-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
        // Warning — amber soft pill
        warning:
          "border-transparent bg-[var(--status-amber-bg)] text-[var(--status-amber-dark)] border border-[rgba(217,119,6,0.2)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
        // Info — blue soft pill
        info:
          "border-transparent bg-[var(--status-blue-bg)] text-[var(--status-blue-dark)] border border-[var(--status-blue-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
        // Terra — terracotta accent pill
        terra:
          "border-transparent bg-[var(--badge-terra-bg)] text-[var(--badge-terra)] border border-[rgba(201,123,84,0.3)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
