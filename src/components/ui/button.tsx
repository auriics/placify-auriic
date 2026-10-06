import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    
    const variants: Record<string, string> = {
      default: "bg-accent-blue text-white hover:bg-accent-blue/90 shadow-sm",
      destructive: "bg-accent-red text-white hover:bg-accent-red/90 shadow-sm",
      outline: "border border-border-primary bg-bg-secondary hover:bg-bg-tertiary hover:text-text-primary text-text-primary shadow-sm",
      secondary: "bg-bg-tertiary text-text-primary hover:bg-bg-tertiary/80",
      ghost: "hover:bg-bg-tertiary hover:text-text-primary text-text-primary",
      link: "text-accent-blue underline-offset-4 hover:underline",
    };

    const sizes: Record<string, string> = {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-10 rounded-md px-8",
      icon: "h-9 w-9",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
