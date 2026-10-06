import * as React from "react"
import { cn } from "../../lib/utils"

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  fallback: string
  size?: "sm" | "default" | "lg"
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = "default", ...props }, ref) => {
    
    const sizes = {
      sm: "h-8 w-8 text-xs",
      default: "h-10 w-10 text-sm",
      lg: "h-12 w-12 text-base",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full bg-bg-tertiary",
          sizes[size],
          className
        )}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt || "Avatar"}
            className="aspect-square h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-accent-blue/10 text-accent-blue font-semibold">
            {fallback.substring(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    )
  }
)
Avatar.displayName = "Avatar"
