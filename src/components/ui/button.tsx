import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Spatial UI Button — pill-shaped, visionOS-inspired depth system
// All variants use rounded-full for consistent pill shape language
// Depth via 4-tier shadow system + specular top edge highlight
// Motion: scale(1.02) on hover, scale(0.97) on press

const buttonVariants = cva(
  // Base — pill shape, specular gloss, spatial motion
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-[-0.005em] transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(31,111,92,0.25)] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 disabled:scale-100! disabled:filter-none! [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 select-none relative overflow-hidden",
  {
    variants: {
      variant: {
        // Primary — lighter forest teal gradient (dark→darker), AAA white-text contrast
        default:
          "bg-gradient-to-b from-[var(--primary)] to-[var(--primary-hover)] text-white border border-[rgba(31,111,92,0.5)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.12),0_2px_4px_rgba(31,111,92,0.10),0_6px_14px_rgba(31,111,92,0.12),0_12px_32px_rgba(31,111,92,0.08)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.30),inset_0_-1px_0_rgba(0,0,0,0.12),0_4px_8px_rgba(31,111,92,0.12),0_10px_24px_rgba(31,111,92,0.14),0_20px_48px_rgba(31,111,92,0.12),0_0_24px_rgba(31,111,92,0.22)] hover:scale-[1.02] hover:brightness-105 active:scale-[0.97] active:brightness-95",
        // Destructive — red gradient with matching depth system
        destructive:
          "bg-gradient-to-b from-[#C84545] to-[var(--status-red)] text-white border border-[rgba(184,64,64,0.5)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.10),0_2px_4px_rgba(184,64,64,0.08),0_6px_14px_rgba(184,64,64,0.10),0_12px_32px_rgba(184,64,64,0.08)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.30),inset_0_-1px_0_rgba(0,0,0,0.10),0_4px_8px_rgba(184,64,64,0.10),0_10px_24px_rgba(184,64,64,0.12),0_20px_48px_rgba(184,64,64,0.10),0_0_24px_rgba(184,64,64,0.24)] hover:scale-[1.02] hover:brightness-105 active:scale-[0.97] active:brightness-95 focus-visible:ring-[rgba(184,64,64,0.25)]",
        // Outline — 1.5px primary border + glass tint
        outline:
          "border-[1.5px] border-[var(--primary)] bg-[rgba(255,255,255,0.55)] backdrop-blur-[20px] text-[var(--primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_2px_rgba(31,111,92,0.05)] hover:bg-[var(--primary-light)] hover:border-[var(--primary-hover)] hover:text-[var(--primary-hover)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_14px_rgba(31,111,92,0.14)] hover:scale-[1.02] active:scale-[0.97]",
        // Secondary — material-regular with strong text
        secondary:
          "bg-[rgba(255,255,255,0.72)] backdrop-blur-[30px] text-[var(--text-primary)] border border-[rgba(255,255,255,0.7)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-1px_0_rgba(31,111,92,0.04),0_1px_2px_rgba(31,111,92,0.05),0_2px_6px_rgba(31,111,92,0.06),0_4px_12px_rgba(31,111,92,0.04)] hover:bg-[rgba(255,255,255,0.86)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-1px_0_rgba(31,111,92,0.04),0_2px_4px_rgba(31,111,92,0.06),0_6px_14px_rgba(31,111,92,0.08),0_12px_32px_rgba(31,111,92,0.06)] hover:scale-[1.02] active:scale-[0.97]",
        // Ghost — transparent, glass tint appears on hover
        ghost:
          "text-[var(--text-primary)] bg-transparent border border-transparent shadow-none hover:bg-[rgba(255,255,255,0.55)] hover:backdrop-blur-[20px] hover:text-[var(--primary)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] hover:scale-[1.02] active:scale-[0.97]",
        // Terra — gold gradient WITH DARK FOREST TEXT (white-on-gold fails AA; dark-on-gold passes 6:1)
        terra:
          "bg-gradient-to-b from-[#D4BC7A] to-[var(--terra)] text-[var(--primary-deep)] border border-[rgba(201,169,97,0.5)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.10),0_2px_4px_rgba(201,169,97,0.08),0_6px_14px_rgba(201,169,97,0.10),0_12px_32px_rgba(201,169,97,0.08)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(0,0,0,0.10),0_4px_8px_rgba(201,169,97,0.10),0_10px_24px_rgba(201,169,97,0.12),0_20px_48px_rgba(201,169,97,0.10),0_0_24px_rgba(201,169,97,0.22)] hover:scale-[1.02] hover:brightness-105 active:scale-[0.97] active:brightness-95",
        link: "text-[var(--primary)] underline-offset-4 hover:underline hover:scale-100! rounded-none",
      },
      size: {
        default: "h-9 px-5 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 px-3.5 has-[>svg]:px-3 text-xs",
        lg: "h-11 px-7 has-[>svg]:px-5 text-[0.9375rem]",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
