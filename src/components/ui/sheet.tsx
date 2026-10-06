import React from "react"
import { motion, AnimatePresence } from "motion/react"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

export interface SheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  side?: "right" | "left" | "bottom"
  className?: string
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  side = "right",
  className
}) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => { document.body.style.overflow = "unset" }
  }, [isOpen])

  const variants = {
    right: {
      initial: { x: "100%" },
      animate: { x: 0 },
      exit: { x: "100%" },
      className: "fixed inset-y-0 right-0 h-full w-full sm:w-[500px] border-l",
    },
    left: {
      initial: { x: "-100%" },
      animate: { x: 0 },
      exit: { x: "-100%" },
      className: "fixed inset-y-0 left-0 h-full w-full sm:w-[500px] border-r",
    },
    bottom: {
      initial: { y: "100%" },
      animate: { y: 0 },
      exit: { y: "100%" },
      className: "fixed inset-x-0 bottom-0 w-full h-[90vh] sm:h-auto border-t rounded-t-xl",
    }
  }

  const selectedSide = variants[side]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={selectedSide.initial}
            animate={selectedSide.animate}
            exit={selectedSide.exit}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "absolute bg-bg-secondary border-border-primary shadow-2xl flex flex-col",
              selectedSide.className,
              className
            )}
          >
            {title && (
              <div className="px-6 py-4 border-b border-border-primary flex items-center justify-between shrink-0">
                <div className="flex flex-col gap-1 pr-4">
                  <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
                  {description && <p className="text-sm text-text-muted">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
                  aria-label="Close sheet"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto touch-scroll p-6 custom-scrollbar">
              {children}
            </div>

            {footer && (
              <div className="px-6 py-4 border-t border-border-primary bg-bg-tertiary/30 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
