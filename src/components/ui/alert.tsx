import * as React from "react"
import { cn } from "../../lib/utils"
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react"

const alertVariants = {
  default: "bg-bg-secondary text-text-primary border-border-primary",
  destructive: "border-accent-red/50 text-accent-red bg-accent-red/10",
  success: "border-green-500/50 text-green-600 dark:text-green-500 bg-green-500/10",
  warning: "border-amber-500/50 text-amber-600 dark:text-amber-500 bg-amber-500/10",
  info: "border-blue-500/50 text-blue-600 dark:text-blue-500 bg-blue-500/10",
}

const icons = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
}

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof alertVariants
  title?: string
  icon?: boolean
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", title, children, icon = true, ...props }, ref) => {
    const IconComponent = icons[variant]

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-current",
          alertVariants[variant],
          className
        )}
        {...props}
      >
        {icon && <IconComponent className="h-4 w-4" />}
        {title && <h5 className="mb-1 font-medium leading-none tracking-tight">{title}</h5>}
        <div className="text-sm opacity-90 leading-relaxed">
          {children}
        </div>
      </div>
    )
  }
)
Alert.displayName = "Alert"

export { Alert }
