import * as React from "react"
import { cn } from "../../lib/utils"

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => {
    return (
      <label className={cn("relative inline-flex items-center cursor-pointer", className)}>
        <input type="checkbox" className="sr-only peer" ref={ref} {...props} />
        <div className="w-9 h-5 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-primary after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-blue opacity-100 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
      </label>
    )
  }
)
Switch.displayName = "Switch"
