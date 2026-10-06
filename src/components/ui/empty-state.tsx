import * as React from "react"
import { cn } from "../../lib/utils"
import { FolderOpen } from "lucide-react"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border-primary bg-bg-secondary/50 p-8 text-center animate-in fade-in-50",
        className
      )}
      {...props}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-tertiary mb-4">
        <Icon className="h-6 w-6 text-text-muted" />
      </div>
      <h3 className="mt-2 text-lg font-semibold text-text-primary tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-2 mb-6 max-w-sm text-sm text-text-muted mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
