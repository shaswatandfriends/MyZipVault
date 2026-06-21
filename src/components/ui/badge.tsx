import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Spatial UI Badge — pill-shaped with vibrant fills
// Concentric padding: 0.1875rem vertical, 0.625rem horizontal
// Each variant has inset top highlight for specular feel

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-[0.01em] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-all duration-[0.18s] ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
  {
    variants: {
      variant: {
        // Primary — forest green gradient pill
        default:
          "border-transparent bg-gradient-to-b from-[var(--primary-vivid)] to-[var(--primary)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_3px_rgba(45,90,61,0.2)] [a&]:hover:from-[var(--primary)] [a&]:hover:to-[var(--primary-hover)] [a&]:hover:scale-[1.03]",
        // Secondary — warm off-white glass pill
        secondary:
          "border-[rgba(255,255,255,0.5)] bg-[rgba(255,252,248,0.55)] backdrop-blur-[20px] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_2px_rgba(45,90,61,0.04)] [a&]:hover:bg-[rgba(255,252,248,0.86)] [a&]:hover:scale-[1.03]",
        // Destructive — red gradient pill
        destructive:
          "border-transparent bg-gradient-to-b from-[#C84545] to-[var(--status-red)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_3px_rgba(184,64,64,0.24)] [a&]:hover:from-[var(--status-red)] [a&]:hover:to-[var(--status-red-dark)] [a&]:hover:scale-[1.03] focus-visible:ring-[rgba(184,64,64,0.25)]",
        // Outline — pill border + glass tint
        outline:
          "border-[1.5px] border-[var(--primary)] bg-[rgba(255,252,248,0.55)] backdrop-blur-[20px] text-[var(--primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] [a&]:hover:bg-[var(--primary-light)] [a&]:hover:text-[var(--primary-hover)] [a&]:hover:scale-[1.03]",
        // Success — green soft pill
        success:
          "border-[var(--status-green-border)] bg-[var(--status-green-bg)] text-[var(--status-green-dark)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
        // Warning — amber soft pill
        warning:
          "border-[rgba(217,119,6,0.2)] bg-[var(--status-amber-bg)] text-[var(--status-amber-dark)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
        // Info — blue soft pill
        info:
          "border-[var(--status-blue-border)] bg-[var(--status-blue-bg)] text-[var(--status-blue-dark)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
        // Terra — terracotta accent pill
        terra:
          "border-[rgba(201,123,84,0.3)] bg-[var(--badge-terra-bg)] text-[var(--badge-terra)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]",
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
