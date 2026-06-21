import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-text-muted selection:bg-primary selection:text-primary-foreground border-input bg-[rgba(255,252,248,0.6)] backdrop-blur-md flex h-10 w-full min-w-0 rounded-md border px-3.5 py-1 text-base shadow-[0_1px_2px_rgba(45,90,61,0.04),inset_0_1px_0_rgba(255,255,255,0.6)] transition-[color,box-shadow,background-color,border-color] duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:border-[var(--primary-vivid)] hover:bg-[rgba(255,252,248,0.8)]",
        "focus-visible:border-[var(--primary)] focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-[rgba(45,90,61,0.18)] focus-visible:shadow-[0_0_0_3px_rgba(45,90,61,0.12),inset_0_1px_0_rgba(255,255,255,0.7)]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive aria-invalid:bg-[rgba(184,64,64,0.04)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
