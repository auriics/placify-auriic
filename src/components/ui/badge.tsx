import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  
  const variants: Record<string, string> = {
    default: "border-transparent bg-accent-blue/10 text-accent-blue", // Teal
    secondary: "border-transparent bg-bg-tertiary text-text-primary",
    destructive: "border-transparent bg-accent-red/10 text-accent-red",
    outline: "text-text-primary border-border-primary",
    success: "border-transparent bg-green-500/10 text-green-600 dark:text-green-500",
    warning: "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-500",
    info: "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-500",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent-blue/20",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
