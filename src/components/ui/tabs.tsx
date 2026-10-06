import * as React from "react"
import { cn } from "../../lib/utils"

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

const TabsContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
}>({})

export function Tabs({ value: controlledValue, defaultValue, onValueChange, className, children, ...props }: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : uncontrolledValue
  
  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(newValue)
      }
      onValueChange?.(newValue)
    },
    [isControlled, onValueChange]
  )

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg bg-bg-tertiary p-1 text-text-muted",
        className
      )}
      {...props}
    />
  )
)
TabsList.displayName = "TabsList"

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    const isSelected = context.value === value
    
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isSelected}
        onClick={() => context.onValueChange?.(value)}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-bg-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isSelected 
            ? "bg-bg-secondary text-text-primary shadow-sm" 
            : "hover:bg-bg-secondary/50 hover:text-text-primary",
          className
        )}
        {...props}
      />
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    const isSelected = context.value === value
    
    if (!isSelected) return null

    return (
      <div
        ref={ref}
        role="tabpanel"
        className={cn(
          "mt-2 ring-offset-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/20 focus-visible:ring-offset-2",
          className
        )}
        {...props}
      />
    )
  }
)
TabsContent.displayName = "TabsContent"
