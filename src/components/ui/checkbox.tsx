import * as React from "react"
import { cn } from "../../lib/utils"
import { Check } from "lucide-react"

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        <input
          type="checkbox"
          className={cn(
            "peer h-4 w-4 shrink-0 appearance-none rounded-sm border border-border-primary ring-offset-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-accent-blue checked:border-accent-blue transition-all cursor-pointer",
            className
          )}
          ref={ref}
          {...props}
        />
        <Check className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
