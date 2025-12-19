"use client"

import { useEffect } from "react"

// Module-level state to track scroll locks across all components
// This ensures multiple modals can be open without conflicts
const lockCountRef = { current: 0 }
const originalOverflowRef = { current: "" }

/**
 * React-managed scroll lock hook that safely prevents body scrolling
 * when modals are open. Handles multiple concurrent locks and React Strict Mode.
 * 
 * @param shouldLock - Whether to lock scroll (typically `isOpen` prop)
 */
export function useScrollLock(shouldLock: boolean) {
  useEffect(() => {
    if (!shouldLock) {
      return
    }

    // Lock: increment counter
    lockCountRef.current++

    // If this is the first lock, save original overflow and lock
    if (lockCountRef.current === 1) {
      originalOverflowRef.current = document.body.style.overflow || ""
      document.body.style.overflow = "hidden"
    }

    // Cleanup: decrement counter and restore if this was the last lock
    return () => {
      lockCountRef.current--
      
      // If no more locks, restore original overflow
      if (lockCountRef.current === 0) {
        document.body.style.overflow = originalOverflowRef.current
      }
    }
  }, [shouldLock])
}

