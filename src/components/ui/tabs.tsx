"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-10 w-fit items-center justify-center rounded-full p-1 gap-1",
        className
      )}
      style={{
        background: "var(--material-thin-bg)",
        backdropFilter: "var(--material-thin-blur)",
        WebkitBackdropFilter: "var(--material-thin-blur)",
        border: "0.5px solid var(--material-thin-border)",
        boxShadow: "var(--specular-top), var(--depth-1)",
      }}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full border border-transparent px-4 py-1 text-sm font-semibold whitespace-nowrap transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-ring focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_6px_rgba(45,90,61,0.24)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[state=active]:text-white data-[state=inactive]:text-[var(--text-secondary)] data-[state=inactive]:hover:text-[var(--text-primary)]",
        className
      )}
      style={
        undefined
      }
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
