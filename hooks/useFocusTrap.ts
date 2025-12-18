import { useEffect, useRef } from "react"

/**
 * Focus trap hook for modals and dialogs
 * Traps focus within the element and returns focus to the trigger when closed
 */
export function useFocusTrap(isOpen: boolean, triggerRef?: React.RefObject<HTMLElement>) {
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isOpen || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    // Focus first element when modal opens
    firstElement?.focus()

    container.addEventListener("keydown", handleTabKey)

    return () => {
      container.removeEventListener("keydown", handleTabKey)
      // Return focus to trigger when modal closes
      if (triggerRef?.current) {
        triggerRef.current.focus()
      }
    }
  }, [isOpen, triggerRef])

  return containerRef
}







