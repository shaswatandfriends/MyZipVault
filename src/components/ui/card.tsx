import * as React from "react"

import { cn } from "@/lib/utils"

// Spatial UI Card — material-regular surface with specular top edge
// Concentric radii: card=20px, header content=16px, nested elements=12px
// Floating hover: translateY(-3px) + depth-3 shadow

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        // Material-regular: 72% opacity, 30px blur, 1.8x saturation, brightness boost
        "relative overflow-hidden flex flex-col gap-6 py-6",
        "bg-[rgba(255,252,248,0.72)] backdrop-blur-[30px] saturate-[1.8] brightness-[1.04]",
        "border border-[rgba(255,255,255,0.7)]",
        "rounded-[20px]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-1px_0_rgba(45,90,61,0.04),0_1px_2px_rgba(45,90,61,0.05),0_2px_6px_rgba(45,90,61,0.06),0_4px_12px_rgba(45,90,61,0.04)]",
        "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:translate-y-[-3px] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-1px_0_rgba(45,90,61,0.04),0_2px_4px_rgba(45,90,61,0.06),0_6px_14px_rgba(45,90,61,0.08),0_12px_32px_rgba(45,90,61,0.06)]",
        "text-[var(--text-primary)]",
        "before:absolute before:top-0 before:left-[8%] before:right-[8%] before:h-px before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent before:pointer-events-none before:z-[2]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header relative z-[1] grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "leading-none font-semibold tracking-tight font-heading text-[1.05rem] text-[var(--text-primary)]",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-[var(--text-secondary)] text-sm leading-relaxed", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("relative z-[1] px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("relative z-[1] flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
