"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDashboardTheme } from "../theme-context"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface SessionSummary {
  id: string
  title: string
  updatedAt: string
  messageCount: number
}

function getRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

export function AiChatClient() {
  const { isDark } = useDashboardTheme()
  const router = useRouter()

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [limitReached, setLimitReached] = useState(false)

  // Session state
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/chat/sessions")
      if (res.ok) {
        const data = await res.json()
        setSessions(Array.isArray(data.sessions) ? data.sessions : [])
      }
    } catch {
      // silently ignore
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/ai/chat/sessions/${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(
          (data.session?.messages ?? []).map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        )
        setActiveSessionId(sessionId)
        setLimitReached(false)
      }
    } catch {
      // silently ignore
    }
  }, [])

  const startNewChat = useCallback(() => {
    setMessages([])
    setActiveSessionId(null)
    setLimitReached(false)
    setInput("")
  }, [])

  const deleteSession = useCallback(
    async (sessionId: string) => {
      setDeletingId(sessionId)
      try {
        const res = await fetch(`/api/ai/chat/sessions/${sessionId}`, { method: "DELETE" })
        if (res.ok) {
          if (activeSessionId === sessionId) {
            startNewChat()
          }
          await fetchSessions()
        }
      } catch {
        // silently ignore
      } finally {
        setDeletingId(null)
      }
    },
    [activeSessionId, fetchSessions, startNewChat]
  )

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    const userMessage: Message = { role: "user", content: trimmed }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput("")
    setIsStreaming(true)

    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    try {
      const messagesForApi = nextMessages.filter((m) => m.content.trim().length > 0)
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesForApi, sessionId: activeSessionId ?? undefined }),
      })

      // Store the session id returned from a newly created session
      const newSessionId = res.headers.get("X-Session-Id")
      if (newSessionId && !activeSessionId) {
        setActiveSessionId(newSessionId)
      }

      if (res.status === 429) {
        setLimitReached(true)
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: "assistant",
            content: "You've reached your 50 messages/day limit. It resets at midnight UTC.",
          }
          return updated
        })
        setIsStreaming(false)
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: "assistant",
            content: data.error ?? "Something went wrong. Please try again.",
          }
          return updated
        })
        setIsStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) {
        setIsStreaming(false)
        return
      }

      let buffer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const payload = line.slice(6)
          if (payload === "[DONE]") break
          try {
            const parsed = JSON.parse(payload) as { text?: string; error?: string }
            if (parsed.error) {
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: "assistant", content: parsed.error! }
                return updated
              })
            } else if (parsed.text) {
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content + parsed.text,
                }
                return updated
              })
            }
          } catch {
            // malformed chunk — skip
          }
        }
      }

      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last?.role === "assistant" && last.content === "") {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: "assistant",
            content: "No response received. Make sure ANTHROPIC_API_KEY is set and try again.",
          }
          return updated
        }
        return prev
      })

      // Refresh sidebar after stream completes
      await fetchSessions()
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Connection error. Please try again.",
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming, messages, activeSessionId, fetchSessions])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function sendToTyper(content: string) {
    sessionStorage.setItem("ai_pending_text", content)
    router.push("/dashboard")
  }

  const cardBase = isDark
    ? "bg-white/5 border border-white/10"
    : "bg-black/5 border border-black/10"

  const sidebarBorder = isDark ? "border-white/10" : "border-black/10"
  const mutedText = isDark ? "text-white/40" : "text-black/40"
  const bodyText = isDark ? "text-white/70" : "text-black/70"
  const itemHover = isDark ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.04]"

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-5rem)] -mt-4 md:-mt-8 -mx-4 md:-mx-6">
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 md:px-6 py-3 border-b flex-shrink-0 ${
          isDark ? "border-white/10 bg-black/40" : "border-black/10 bg-white/60"
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              isDark ? "text-white/50 hover:bg-white/10" : "text-black/50 hover:bg-black/5"
            }`}
            aria-label="Toggle chat history"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <svg
            className={`w-5 h-5 ${isDark ? "text-violet-400" : "text-violet-600"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          <h1 className={`text-base font-semibold ${isDark ? "text-white" : "text-black"}`}>
            AI Writing Assistant
          </h1>
        </div>
        <button
          onClick={startNewChat}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            isDark
              ? "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
              : "bg-black/5 hover:bg-black/10 text-black/60 hover:text-black"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Body: sidebar + messages */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside
            className={`w-52 flex-shrink-0 flex flex-col border-r ${sidebarBorder} ${
              isDark ? "bg-black/30" : "bg-white/40"
            }`}
          >
            <div className="flex-1 overflow-y-auto py-2">
              {sessionsLoading ? (
                <div className={`px-3 py-2 text-xs ${mutedText}`}>Loading…</div>
              ) : sessions.length === 0 ? (
                <div className={`px-3 py-4 text-xs text-center leading-relaxed ${mutedText}`}>
                  No chats yet.{"\n"}Start a conversation!
                </div>
              ) : (
                sessions.map((s) => {
                  const isActive = s.id === activeSessionId
                  return (
                    <div key={s.id} className="group relative px-1.5 mb-0.5">
                      <button
                        onClick={() => loadSession(s.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors ${
                          isActive
                            ? isDark
                              ? "bg-white/10 text-white"
                              : "bg-black/[0.08] text-black"
                            : `${bodyText} ${itemHover}`
                        }`}
                      >
                        <p className="text-xs font-medium truncate leading-snug">{s.title}</p>
                        <p className={`text-[10px] mt-0.5 ${mutedText}`}>
                          {getRelativeTime(s.updatedAt)}
                          {" · "}
                          {s.messageCount} msg{s.messageCount !== 1 ? "s" : ""}
                        </p>
                      </button>
                      {/* Delete on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(s.id)
                        }}
                        disabled={deletingId === s.id}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40 ${
                          isDark
                            ? "hover:bg-red-500/20 text-white/40 hover:text-red-400"
                            : "hover:bg-red-50 text-black/40 hover:text-red-600"
                        }`}
                        aria-label="Delete chat"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </aside>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <svg
                className={`w-10 h-10 ${isDark ? "text-white/20" : "text-black/20"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                />
              </svg>
              <div>
                <p className={`text-sm font-medium ${isDark ? "text-white/60" : "text-black/60"}`}>
                  Ask me to write, edit, or improve anything
                </p>
                <p className={`text-xs mt-1 ${isDark ? "text-white/30" : "text-black/30"}`}>
                  Then send the result directly to the Typer with one click
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "user" ? (
                  <div
                    className={`max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      isDark ? "bg-violet-600/80 text-white" : "bg-violet-600 text-white"
                    }`}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[80%] flex flex-col gap-2">
                    <div
                      className={`rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm whitespace-pre-wrap ${cardBase} ${
                        isDark ? "text-white/90" : "text-black/90"
                      } ${!msg.content && isStreaming ? "animate-pulse" : ""}`}
                    >
                      {msg.content || (isStreaming && i === messages.length - 1 ? "…" : "")}
                    </div>
                    {msg.content && i === messages.length - 1 && !isStreaming && (
                      <button
                        onClick={() => sendToTyper(msg.content)}
                        className={`self-start flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          isDark
                            ? "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
                            : "bg-black/5 hover:bg-black/10 text-black/60 hover:text-black"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Send to Typer
                      </button>
                    )}
                    {msg.content && i < messages.length - 1 && (
                      <button
                        onClick={() => sendToTyper(msg.content)}
                        className={`self-start flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          isDark
                            ? "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
                            : "bg-black/5 hover:bg-black/10 text-black/60 hover:text-black"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Send to Typer
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div
        className={`flex-shrink-0 px-4 md:px-6 py-4 border-t ${
          isDark ? "border-white/10 bg-black/40" : "border-black/10 bg-white/60"
        }`}
      >
        <div className={`flex gap-3 items-end rounded-xl ${cardBase} p-2`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={limitReached ? "Daily limit reached. Come back tomorrow." : "Message AI…"}
            disabled={isStreaming || limitReached}
            rows={1}
            className={`flex-1 resize-none bg-transparent text-sm outline-none px-2 py-1.5 max-h-40 ${
              isDark ? "text-white placeholder-white/30" : "text-black placeholder-black/30"
            } disabled:opacity-50`}
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming || limitReached}
            className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-40 ${
              isDark
                ? "bg-violet-600 hover:bg-violet-500 text-white disabled:bg-white/10"
                : "bg-violet-600 hover:bg-violet-500 text-white disabled:bg-black/10"
            }`}
            aria-label="Send message"
          >
            {isStreaming ? (
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
        <p className={`text-xs mt-2 text-center ${isDark ? "text-white/20" : "text-black/30"}`}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
