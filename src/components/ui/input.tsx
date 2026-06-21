import * as React from "react"

import { cn } from "@/lib/utils"

// Spatial UI Input — pill-shaped, material-thin glass with vibrant focus
// Concentric padding for nested labels: input=1.125rem horizontal
// Focus state: white bg + 4px primary ring + specular top edge

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base — pill shape, material-thin
        "file:text-foreground placeholder:text-text-muted selection:bg-primary selection:text-primary-foreground",
        "flex h-11 w-full min-w-0 rounded-full border bg-[rgba(255,252,248,0.55)] backdrop-blur-[20px] saturate-[1.5]",
        "px-[1.125rem] py-1 text-base text-[var(--text-primary)]",
        "border-[rgba(255,255,255,0.5)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-1px_0_rgba(45,90,61,0.04),0_0.5px_1px_rgba(45,90,61,0.04),0_1px_2px_rgba(45,90,61,0.05)]",
        "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        // Hover — border + bg shift
        "hover:border-[var(--primary-vivid)] hover:bg-[rgba(255,252,248,0.72)]",
        // Focus — white bg + 4px ring + specular
        "focus-visible:border-[var(--primary)] focus-visible:bg-white focus-visible:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-1px_0_rgba(45,90,61,0.04),0_0_0_4px_rgba(45,90,61,0.12),0_0.5px_1px_rgba(45,90,61,0.04),0_1px_2px_rgba(45,90,61,0.05)]",
        // Error state
        "aria-invalid:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_0_0_4px_rgba(184,64,64,0.12)] aria-invalid:border-[var(--status-red)] aria-invalid:bg-[rgba(184,64,64,0.04)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
