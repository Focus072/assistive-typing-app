"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useDashboardTheme } from "@/app/dashboard/layout"
import { useFocusTrap } from "@/hooks/useFocusTrap"

interface TypingTestProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (wpm: number) => void
}

const TARGET_TEXT = "Typing is a skill built through consistency, accuracy, and focus. A good typing test should feel natural, not rushed or artificial. Type each word carefully, keep your eyes on the screen, and let your fingers move without hesitation. Speed will come with time, but accuracy always comes first."

export function TypingTest({ isOpen, onClose, onComplete }: TypingTestProps) {
  const { isDark } = useDashboardTheme()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const modalRef = useFocusTrap(isOpen, closeButtonRef) as React.RefObject<HTMLDivElement>
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  const [started, setStarted] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [userInput, setUserInput] = useState("")
  const [testFinished, setTestFinished] = useState(false)

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStarted(false)
      setStartTime(null)
      setUserInput("")
      setTestFinished(false)
    }
  }, [isOpen])

  // Focus input when started
  useEffect(() => {
    if (started && inputRef.current) {
      inputRef.current.focus()
    }
  }, [started])

  // Bulletproof WPM calculation (industry-standard)
  const calculateWPM = useCallback((): number => {
    if (!startTime || !userInput) return 0
    
    const elapsedMs = Date.now() - startTime
    const minutes = elapsedMs / 60000
    
    // Count correct characters only
    const correctChars = userInput
      .split("")
      .filter((char, i) => char === TARGET_TEXT[i]).length
    
    // WPM = (correct characters ÷ 5) ÷ minutes
    const wpm = Math.round((correctChars / 5) / minutes || 0)
    return wpm
  }, [startTime, userInput])

  // Calculate accuracy (derived, never mutated)
  const calculateAccuracy = (): number => {
    if (!userInput) return 100
    
    const correctChars = userInput
      .split("")
      .filter((char, i) => char === TARGET_TEXT[i]).length
    
    return Math.round((correctChars / Math.max(userInput.length, 1)) * 100)
  }

  // Get character status for coloring
  const getCharStatus = (index: number): "correct" | "incorrect" | "pending" => {
    if (index >= userInput.length) return "pending"
    if (userInput[index] === TARGET_TEXT[index]) return "correct"
    return "incorrect"
  }

  // Live WPM update
  const [wpm, setWpm] = useState(0)
  useEffect(() => {
    if (!started || !startTime || testFinished) return

    const interval = setInterval(() => {
      setWpm(calculateWPM())
    }, 100)
    return () => clearInterval(interval)
  }, [started, startTime, userInput, testFinished, calculateWPM])

  // Completion logic: ONLY when userInput.length === TARGET_TEXT.length
  const isComplete = userInput.length === TARGET_TEXT.length

  useEffect(() => {
    if (isComplete && !testFinished && started) {
      setTestFinished(true)
      const finalWPM = calculateWPM()
      setWpm(finalWPM)
    }
  }, [isComplete, testFinished, started, calculateWPM])

  const handleStart = () => {
    setStarted(true)
    setStartTime(Date.now())
    setUserInput("")
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (testFinished) return
    
    const value = e.target.value
    
    // Don't allow typing beyond target text length
    if (value.length <= TARGET_TEXT.length) {
      setUserInput(value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!started && e.key !== "Tab") {
      handleStart()
    }
  }

  const handleComplete = () => {
    if (wpm > 0) {
      onComplete(wpm)
      onClose()
    }
  }

  const handleReset = () => {
    setStarted(false)
    setStartTime(null)
    setUserInput("")
    setWpm(0)
    setTestFinished(false)
  }

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !started) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, started, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!isOpen) return null

  const accuracy = calculateAccuracy()
  const wordsTyped = userInput.trim().split(/\s+/).filter(w => w.length > 0).length
  const totalWords = TARGET_TEXT.trim().split(/\s+/).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !started) {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="typing-test-title"
    >
      <div
        ref={modalRef}
        className={`relative w-full max-w-3xl max-h-[90vh] rounded-lg shadow-2xl overflow-hidden ${
          isDark ? "bg-[#1a1a1a]" : "bg-white"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isDark ? "border-white/10" : "border-black/10"
          }`}
        >
          <h2
            id="typing-test-title"
            className={`text-lg font-semibold ${
              isDark ? "text-white" : "text-black"
            }`}
          >
            Typing Speed Test
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            disabled={started && !testFinished}
            className={`p-2 rounded-lg transition-colors ${
              started && !testFinished
                ? "opacity-50 cursor-not-allowed"
                : isDark
                ? "text-white/70 hover:text-white hover:bg-white/10"
                : "text-black/70 hover:text-black hover:bg-black/5"
            }`}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {!started ? (
            <>
              <div className="space-y-4">
                <p className={`text-sm ${isDark ? "text-white/80" : "text-black/80"}`}>
                  Take a typing test to measure your words per minute (WPM). Your typing speed will be used to create a personalized typing profile that matches your natural rhythm.
                </p>
                <div className={`p-4 rounded-lg border ${
                  isDark ? "bg-[#0a0a0a] border-white/10" : "bg-gray-50 border-black/10"
                }`}>
                  <p className={`text-sm font-medium mb-2 ${isDark ? "text-white" : "text-black"}`}>
                    Instructions:
                  </p>
                  <ul className={`text-sm space-y-1 list-disc list-inside ${
                    isDark ? "text-white/70" : "text-black/70"
                  }`}>
                    <li>Type the text below as accurately as possible</li>
                    <li>Don&apos;t worry about mistakes - just type naturally</li>
                    <li>Your WPM will be calculated automatically</li>
                    <li>Click &quot;Start Test&quot; when you&apos;re ready</li>
                  </ul>
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${
                isDark ? "bg-[#0a0a0a] border-white/10" : "bg-gray-50 border-black/10"
              }`}>
                <p className={`text-sm mb-2 ${isDark ? "text-white/60" : "text-black/60"}`}>
                  Text to type:
                </p>
                <p className={`text-base leading-relaxed ${
                  isDark ? "text-white/90" : "text-black/90"
                }`}>
                  {TARGET_TEXT}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleStart}
                  className={`flex-1 px-4 py-2.5 rounded-lg transition-colors ${
                    isDark
                      ? "bg-white text-black hover:bg-white/90"
                      : "bg-black text-white hover:bg-black/90"
                  }`}
                >
                  Start Test
                </button>
                <button
                  onClick={onClose}
                  className={`px-4 py-2.5 rounded-lg border transition-colors ${
                    isDark
                      ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                      : "bg-black/5 border-black/20 text-black hover:bg-black/10"
                  }`}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg border text-center ${
                  isDark ? "bg-[#0a0a0a] border-white/10" : "bg-gray-50 border-black/10"
                }`}>
                  <div className={`text-2xl font-bold ${
                    isDark ? "text-white" : "text-black"
                  }`}>
                    {wpm}
                  </div>
                  <div className={`text-xs mt-1 ${
                    isDark ? "text-white/60" : "text-black/60"
                  }`}>
                    WPM
                  </div>
                </div>
                <div className={`p-4 rounded-lg border text-center ${
                  isDark ? "bg-[#0a0a0a] border-white/10" : "bg-gray-50 border-black/10"
                }`}>
                  <div className={`text-2xl font-bold ${
                    isDark ? "text-white" : "text-black"
                  }`}>
                    {accuracy}%
                  </div>
                  <div className={`text-xs mt-1 ${
                    isDark ? "text-white/60" : "text-black/60"
                  }`}>
                    Accuracy
                  </div>
                </div>
                <div className={`p-4 rounded-lg border text-center ${
                  isDark ? "bg-[#0a0a0a] border-white/10" : "bg-gray-50 border-black/10"
                }`}>
                  <div className={`text-2xl font-bold ${
                    isDark ? "text-white" : "text-black"
                  }`}>
                    {wordsTyped}/{totalWords}
                  </div>
                  <div className={`text-xs mt-1 ${
                    isDark ? "text-white/60" : "text-black/60"
                  }`}>
                    Words
                  </div>
                </div>
              </div>

              {/* Test Text Display with per-character coloring */}
              <div className={`p-4 rounded-lg border ${
                isDark ? "bg-[#0a0a0a] border-white/10" : "bg-gray-50 border-black/10"
              }`}>
                <div className="text-sm mb-2 flex items-center justify-between">
                  <span className={isDark ? "text-white/60" : "text-black/60"}>
                    Type the text below:
                  </span>
                  {testFinished && (
                    <span className={`text-sm font-medium ${
                      isDark ? "text-green-400" : "text-green-600"
                    }`}>
                      ✓ Complete!
                    </span>
                  )}
                </div>
                <div className={`text-base leading-relaxed font-mono ${
                  isDark ? "text-white/90" : "text-black/90"
                }`}>
                  {TARGET_TEXT.split("").map((char, i) => {
                    const status = getCharStatus(i)
                    return (
                      <span
                        key={i}
                        className={
                          status === "correct"
                            ? isDark ? "text-green-400" : "text-green-600"
                            : status === "incorrect"
                            ? isDark ? "text-red-400" : "text-red-600"
                            : isDark ? "text-white/40" : "text-black/40"
                        }
                      >
                        {char}
                      </span>
                    )
                  })}
                  {userInput.length < TARGET_TEXT.length && (
                    <span className={`${isDark ? "bg-blue-500/30" : "bg-blue-500/30"} ${isDark ? "text-white" : "text-black"}`}>
                      {TARGET_TEXT[userInput.length]}
                    </span>
                  )}
                </div>
              </div>

              {/* Input Area */}
              <textarea
                ref={inputRef}
                value={userInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={testFinished}
                placeholder={started ? "Start typing..." : ""}
                className={`w-full p-4 rounded-lg border font-mono text-base resize-none ${
                  isDark
                    ? "bg-[#0a0a0a] border-white/20 text-white placeholder-white/40"
                    : "bg-white border-black/20 text-black placeholder-black/40"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                rows={4}
                autoFocus
              />

              {/* Actions */}
              <div className="flex gap-3">
                {testFinished ? (
                  <>
                    <button
                      onClick={handleComplete}
                      className={`flex-1 px-4 py-2.5 rounded-lg transition-colors ${
                        isDark
                          ? "bg-white text-black hover:bg-white/90"
                          : "bg-black text-white hover:bg-black/90"
                      }`}
                    >
                      Use {wpm} WPM Profile
                    </button>
                    <button
                      onClick={handleReset}
                      className={`px-4 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                          : "bg-black/5 border-black/20 text-black hover:bg-black/10"
                      }`}
                    >
                      Retake
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleReset}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                        : "bg-black/5 border-black/20 text-black hover:bg-black/10"
                    }`}
                  >
                    Reset Test
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
