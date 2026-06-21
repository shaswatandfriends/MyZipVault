import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Primary — forest green gradient with glossy highlight + strong shadow for clear visibility
        default:
          "bg-gradient-to-b from-[var(--primary-vivid)] to-[var(--primary)] text-white shadow-[0_4px_14px_rgba(45,90,61,0.32),0_2px_4px_rgba(45,90,61,0.18),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_6px_20px_rgba(45,90,61,0.42),0_3px_6px_rgba(45,90,61,0.22),inset_0_1px_0_rgba(255,255,255,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_6px_rgba(45,90,61,0.28),inset_0_1px_0_rgba(255,255,255,0.15)] border border-[rgba(45,90,61,0.4)]",
        destructive:
          "bg-gradient-to-b from-[#C84545] to-[var(--status-red)] text-white shadow-[0_4px_14px_rgba(184,64,64,0.32),0_2px_4px_rgba(184,64,64,0.18),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_6px_20px_rgba(184,64,64,0.42),0_3px_6px_rgba(184,64,64,0.22)] hover:-translate-y-0.5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 border border-[rgba(184,64,64,0.4)]",
        // Outline — visible 1.5px border + glass-tinted background for proper contrast over glass surfaces
        outline:
          "border-[1.5px] border-[var(--primary)] bg-[rgba(255,252,248,0.7)] backdrop-blur-md text-[var(--primary)] shadow-[0_2px_8px_rgba(45,90,61,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] hover:bg-[var(--primary-light)] hover:text-[var(--primary-hover)] hover:shadow-[0_4px_14px_rgba(45,90,61,0.14)] hover:border-[var(--primary-hover)] hover:-translate-y-0.5 dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        // Secondary — warm off-white glass with strong border
        secondary:
          "bg-[rgba(255,252,248,0.8)] backdrop-blur-md text-[var(--text-primary)] border border-[var(--border-strong)] shadow-[0_2px_8px_rgba(45,90,61,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] hover:bg-[rgba(255,252,248,0.95)] hover:shadow-[0_4px_14px_rgba(45,90,61,0.1)] hover:-translate-y-0.5",
        // Ghost — subtle glass tint on hover so it's visible on glass surfaces
        ghost:
          "text-[var(--text-primary)] hover:bg-[rgba(255,252,248,0.7)] hover:backdrop-blur-md hover:text-[var(--primary)] dark:hover:bg-accent/50",
        // Terra — terracotta accent button (warm CTA)
        terra:
          "bg-gradient-to-b from-[#E08862] to-[var(--terra)] text-white shadow-[0_4px_14px_rgba(201,123,84,0.32),0_2px_4px_rgba(201,123,84,0.18),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_6px_20px_rgba(201,123,84,0.42),0_3px_6px_rgba(201,123,84,0.22)] hover:-translate-y-0.5 active:translate-y-0 border border-[rgba(201,123,84,0.4)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-md px-6 has-[>svg]:px-4 text-[0.95rem]",
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
