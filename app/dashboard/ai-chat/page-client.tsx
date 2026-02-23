"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useDashboardTheme } from "../theme-context"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import Link from "next/link"

interface Message {
  role: "user" | "assistant"
  content: string
  id?: string
  feedback?: "up" | "down" | null
  imagePreview?: string
  timestamp?: string
}

interface SessionSummary {
  id: string
  title: string
  pinned: boolean
  folder: string | null
  updatedAt: string
  messageCount: number
}

interface PendingImage {
  preview: string
  b64: string
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
}

interface PromptTemplate {
  id: string
  label: string
  content: string
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

const STARTER_PROMPTS = [
  "Help me write a professional email",
  "Improve the grammar in my text",
  "Make this paragraph more concise",
  "Suggest a catchy opening line",
]

const BUILTIN_TEMPLATES: PromptTemplate[] = [
  { id: "b1", label: "Fix grammar", content: "Fix the grammar and punctuation in the following text:\n\n" },
  { id: "b2", label: "Make concise", content: "Make the following text more concise while keeping the key points:\n\n" },
  { id: "b3", label: "Formal tone", content: "Rewrite the following text in a formal, professional tone:\n\n" },
  { id: "b4", label: "Bullet points", content: "Convert the following text into clear bullet points:\n\n" },
  { id: "b5", label: "Expand idea", content: "Expand on the following idea with more detail and examples:\n\n" },
]

const MODES = [
  { id: "default", label: "Writing Assistant" },
  { id: "coach", label: "Writing Coach" },
  { id: "editor", label: "Essay Editor" },
  { id: "grammar", label: "Grammar Check" },
  { id: "brainstorm", label: "Brainstormer" },
] as const

type ModeId = (typeof MODES)[number]["id"]

const TEMPLATES_KEY = "ai-chat-templates"
const COLLAPSE_THRESHOLD_CHARS = 2500
const COLLAPSE_PREVIEW_CHARS = 2000

function loadTemplates(): PromptTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    return raw ? (JSON.parse(raw) as PromptTemplate[]) : []
  } catch { return [] }
}

function persistTemplates(templates: PromptTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
}

export function AiChatClient() {
  const { isDark } = useDashboardTheme()

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copiedConversation, setCopiedConversation] = useState(false)
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null)
  const [selectedMode, setSelectedMode] = useState<ModeId>("default")
  const [showModeMenu, setShowModeMenu] = useState(false)

  // Document context
  const [documentContext, setDocumentContext] = useState("")
  const [showContextPanel, setShowContextPanel] = useState(false)

  // Image attachment
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null)

  // Prompt templates
  const [customTemplates, setCustomTemplates] = useState<PromptTemplate[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [newTemplateLabel, setNewTemplateLabel] = useState("")

  // Toast
  const [toast, setToast] = useState<string | null>(null)

  // Session state
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sessionSearch, setSessionSearch] = useState("")
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [folderFilter, setFolderFilter] = useState<string | null>(null)
  const [showFolderMenu, setShowFolderMenu] = useState<string | null>(null)
  const [newFolderInput, setNewFolderInput] = useState("")

  // Help popover
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)

  // UI
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [collapsedMessages, setCollapsedMessages] = useState<Set<number>>(new Set())
  const [renamedIds, setRenamedIds] = useState<Set<string>>(new Set())

  // Refs
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const modeMenuRef = useRef<HTMLDivElement>(null)
  const cancelEditRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const shortcutsRef = useRef<HTMLDivElement>(null)
  const templatesRef = useRef<HTMLDivElement>(null)
  const folderMenuRef = useRef<HTMLDivElement>(null)
  const activeSessionIdRef = useRef<string | null>(null)

  // Load custom templates
  useEffect(() => { setCustomTemplates(loadTemplates()) }, [])

  // Open sidebar on desktop by default
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) setSidebarOpen(true)
  }, [])

  // Sync activeSessionId to ref for async callbacks
  useEffect(() => { activeSessionIdRef.current = activeSessionId }, [activeSessionId])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Scroll-to-bottom visibility
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 120)
    }
    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  // Click-outside handlers
  useEffect(() => {
    if (!showModeMenu) return
    const h = (e: MouseEvent) => { if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) setShowModeMenu(false) }
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h)
  }, [showModeMenu])

  useEffect(() => {
    if (!showShortcutsHelp) return
    const h = (e: MouseEvent) => { if (shortcutsRef.current && !shortcutsRef.current.contains(e.target as Node)) setShowShortcutsHelp(false) }
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h)
  }, [showShortcutsHelp])

  useEffect(() => {
    if (!showTemplates) return
    const h = (e: MouseEvent) => { if (templatesRef.current && !templatesRef.current.contains(e.target as Node)) setShowTemplates(false) }
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h)
  }, [showTemplates])

  useEffect(() => {
    if (!showFolderMenu) return
    const h = (e: MouseEvent) => { if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) setShowFolderMenu(null) }
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h)
  }, [showFolderMenu])

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  // Draft persistence
  useEffect(() => {
    const saved = localStorage.getItem("ai-chat-draft")
    if (saved) setInput(saved)
  }, [])

  useEffect(() => {
    if (input) {
      localStorage.setItem("ai-chat-draft", input)
    } else {
      localStorage.removeItem("ai-chat-draft")
    }
  }, [input])

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === "k") {
        e.preventDefault()
        setMessages([]); setActiveSessionId(null); setLimitReached(false)
        setInput(""); setPendingImage(null)
        setTimeout(() => textareaRef.current?.focus(), 50)
      }
      if (mod && e.key === "/") { e.preventDefault(); setSidebarOpen((o) => !o) }
      if (e.key === "Escape") {
        setShowShortcutsHelp(false); setShowModeMenu(false)
        setShowTemplates(false); setShowFolderMenu(null)
      }
    }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [])

  // Image paste
  useEffect(() => {
    const h = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"))
      if (!item) return
      e.preventDefault()
      const file = item.getAsFile()
      if (file) handleImageFile(file)
    }
    document.addEventListener("paste", h)
    return () => document.removeEventListener("paste", h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleImageFile(file: File) {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowed.includes(file.type)) return
    if (file.size > 5_000_000) { setToast("Image too large (max 5 MB)"); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      const [header, b64] = dataUrl.split(",")
      const mediaType = header.split(":")[1].split(";")[0] as PendingImage["mediaType"]
      setPendingImage({ preview: dataUrl, b64, mediaType })
    }
    reader.readAsDataURL(file)
  }

  // ── Callbacks ──

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const copyMessage = useCallback(async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch { /* ignore */ }
  }, [])

  const copyConversation = useCallback(async (msgs: Message[]) => {
    const text = msgs.map((m) => `${m.role === "user" ? "You" : "AI"}: ${m.content}`).join("\n\n")
    try {
      await navigator.clipboard.writeText(text)
      setCopiedConversation(true)
      setTimeout(() => setCopiedConversation(false), 2000)
    } catch { /* ignore */ }
  }, [])

  const exportChat = useCallback(() => {
    if (messages.length === 0) return
    const session = sessions.find((s) => s.id === activeSessionId)
    const title = session?.title ?? "Chat Export"
    const lines: string[] = [`# ${title}`, ""]
    for (const msg of messages) {
      lines.push(`**${msg.role === "user" ? "You" : "AI"}:**`)
      lines.push(msg.content)
      lines.push("", "---", "")
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [messages, sessions, activeSessionId])

  const stopGeneration = useCallback(() => { abortControllerRef.current?.abort() }, [])

  function sendToTyper(content: string) {
    sessionStorage.setItem("ai_pending_text", content)
    setToast("Sent to Typer!")
  }

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/chat/sessions")
      if (res.ok) {
        const data = await res.json()
        setSessions(Array.isArray(data.sessions) ? data.sessions : [])
      }
    } catch { /* ignore */ } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const loadSession = useCallback(async (sessionId: string) => {
    setRenamedIds((prev) => { const n = new Set(prev); n.delete(sessionId); return n })
    setCollapsedMessages(new Set())
    try {
      const res = await fetch(`/api/ai/chat/sessions/${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(
          (data.session?.messages ?? []).map((m: { id: string; role: string; content: string; feedback: string | null; createdAt: string }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            feedback: m.feedback ?? null,
            timestamp: m.createdAt,
          }))
        )
        setActiveSessionId(sessionId)
        setLimitReached(false)
        setTimeout(() => textareaRef.current?.focus(), 50)
      }
    } catch { /* ignore */ }
  }, [])

  const startNewChat = useCallback(() => {
    setMessages([])
    setActiveSessionId(null)
    setLimitReached(false)
    setInput("")
    setPendingImage(null)
    setCollapsedMessages(new Set())
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  const deleteSession = useCallback(async (sessionId: string) => {
    setDeletingId(sessionId)
    try {
      const res = await fetch(`/api/ai/chat/sessions/${sessionId}`, { method: "DELETE" })
      if (res.ok) {
        if (activeSessionId === sessionId) startNewChat()
        await fetchSessions()
      }
    } catch { /* ignore */ } finally {
      setDeletingId(null)
    }
  }, [activeSessionId, fetchSessions, startNewChat])

  const togglePin = useCallback(async (sessionId: string, currentPinned: boolean) => {
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, pinned: !currentPinned } : s))
    try {
      await fetch(`/api/ai/chat/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !currentPinned }),
      })
    } catch { /* ignore */ }
  }, [])

  const setSessionFolder = useCallback(async (sessionId: string, folder: string | null) => {
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, folder } : s))
    setShowFolderMenu(null)
    setNewFolderInput("")
    try {
      await fetch(`/api/ai/chat/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
      })
    } catch { /* ignore */ }
  }, [])

  const submitFeedback = useCallback(async (
    messageId: string,
    sessionId: string,
    clicked: "up" | "down",
    current: "up" | "down" | null | undefined
  ) => {
    const newFeedback = current === clicked ? null : clicked
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, feedback: newFeedback } : m))
    try {
      await fetch(`/api/ai/chat/sessions/${sessionId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, feedback: newFeedback }),
      })
    } catch { /* ignore */ }
  }, [])

  const startEditing = useCallback((id: string, title: string) => {
    cancelEditRef.current = false
    setEditingSessionId(id)
    setEditingTitle(title)
  }, [])

  const commitEdit = useCallback(async () => {
    if (cancelEditRef.current) { cancelEditRef.current = false; return }
    const id = editingSessionId
    const title = editingTitle.trim()
    setEditingSessionId(null)
    if (!id || !title) return
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)))
    try {
      await fetch(`/api/ai/chat/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
    } catch { /* ignore */ }
  }, [editingSessionId, editingTitle])

  const truncateSession = useCallback(async (sessionId: string, keepCount: number) => {
    try {
      await fetch(`/api/ai/chat/sessions/${sessionId}/truncate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepCount }),
      })
    } catch { /* ignore */ }
  }, [])

  const saveTemplate = useCallback((label: string, content: string) => {
    const t: PromptTemplate = { id: Date.now().toString(), label, content }
    const updated = [...customTemplates, t]
    setCustomTemplates(updated)
    persistTemplates(updated)
  }, [customTemplates])

  const deleteTemplate = useCallback((id: string) => {
    const updated = customTemplates.filter((t) => t.id !== id)
    setCustomTemplates(updated)
    persistTemplates(updated)
  }, [customTemplates])

  const streamMessages = useCallback(
    async (
      messagesForApi: Message[],
      currentSessionId: string | null,
      opts?: { regenerating?: boolean; image?: PendingImage }
    ) => {
      const controller = new AbortController()
      abortControllerRef.current = controller
      setIsStreaming(true)

      const apiMessages = messagesForApi.map((m, i) => {
        const isLastUser = i === messagesForApi.length - 1 && m.role === "user" && opts?.image
        if (isLastUser && opts?.image) {
          return {
            role: m.role,
            content: [
              { type: "text" as const, text: m.content },
              { type: "image" as const, source: { type: "base64" as const, media_type: opts.image.mediaType, data: opts.image.b64 } },
            ],
          }
        }
        return { role: m.role, content: m.content }
      })

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages.filter((m) => typeof m.content === "string" ? m.content.trim().length > 0 : true),
            sessionId: currentSessionId ?? undefined,
            mode: selectedMode,
            context: documentContext.trim() || undefined,
            regenerating: opts?.regenerating ?? false,
          }),
          signal: controller.signal,
        })

        const returnedSessionId = res.headers.get("X-Session-Id")
        const isNewSession = !currentSessionId && !!returnedSessionId
        if (isNewSession && returnedSessionId) setActiveSessionId(returnedSessionId)
        const remainingStr = res.headers.get("X-RateLimit-Remaining")
        if (remainingStr !== null) setMessagesRemaining(parseInt(remainingStr, 10))

        if (res.status === 429) {
          setLimitReached(true)
          setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: "You've reached your 50 messages/day limit. It resets at midnight UTC." }; return u })
          return
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: data.error ?? "Something went wrong. Please try again." }; return u })
          return
        }

        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        if (!reader) return

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
                setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: parsed.error! }; return u })
              } else if (parsed.text) {
                setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: u[u.length - 1].content + parsed.text }; return u })
              }
            } catch { /* malformed */ }
          }
        }

        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === "assistant" && last.content === "") {
            const u = [...prev]
            u[u.length - 1] = { role: "assistant", content: "No response received. Make sure ANTHROPIC_API_KEY is set and try again." }
            return u
          }
          return prev
        })

        await fetchSessions()

        if (isNewSession && returnedSessionId) {
          try {
            const r = await fetch(`/api/ai/chat/sessions/${returnedSessionId}/rename`, { method: "POST" })
            if (r.ok) {
              if (returnedSessionId !== activeSessionIdRef.current) {
                setRenamedIds((prev) => new Set([...prev, returnedSessionId]))
              }
              await fetchSessions()
            }
          } catch { /* ignore */ }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return
        setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: "Connection error. Please try again." }; return u })
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
      }
    },
    [selectedMode, documentContext, fetchSessions]
  )

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if ((!trimmed && !pendingImage) || isStreaming) return
    const text = trimmed || "What's in this image?"
    const now = new Date().toISOString()
    const userMessage: Message = { role: "user", content: text, timestamp: now }
    if (pendingImage) userMessage.imagePreview = pendingImage.preview
    const imageToSend = pendingImage
    const nextMessages = [...messages, userMessage]
    setMessages([...nextMessages, { role: "assistant", content: "", timestamp: new Date().toISOString() }])
    setInput("")
    setPendingImage(null)
    await streamMessages(nextMessages, activeSessionId, { image: imageToSend ?? undefined })
  }, [input, pendingImage, isStreaming, messages, activeSessionId, streamMessages])

  const regenerateResponse = useCallback(async () => {
    if (isStreaming || messages.length < 2) return
    const withoutLast = messages[messages.length - 1]?.role === "assistant" ? messages.slice(0, -1) : messages
    if (withoutLast.length === 0) return
    if (activeSessionId) await truncateSession(activeSessionId, withoutLast.length)
    setMessages([...withoutLast, { role: "assistant", content: "" }])
    await streamMessages(withoutLast, activeSessionId, { regenerating: true })
  }, [isStreaming, messages, activeSessionId, streamMessages, truncateSession])

  const startEditingMessage = useCallback(async (index: number) => {
    const msg = messages[index]
    if (!msg || msg.role !== "user" || isStreaming) return
    if (activeSessionId) await truncateSession(activeSessionId, index)
    setMessages(messages.slice(0, index))
    setInput(msg.content)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [messages, activeSessionId, isStreaming, truncateSession])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // Computed
  const allFolders = [...new Set(sessions.map((s) => s.folder).filter((f): f is string => !!f))]
  const pinnedSessions = sessions.filter((s) => s.pinned)
  const unpinnedSessions = sessions.filter((s) => !s.pinned)

  function matchesSearch(s: SessionSummary) {
    if (!sessionSearch.trim()) return true
    return s.title.toLowerCase().includes(sessionSearch.toLowerCase())
  }
  function matchesFolder(s: SessionSummary) {
    if (!folderFilter) return true
    return s.folder === folderFilter
  }

  const filteredPinned = pinnedSessions.filter((s) => matchesSearch(s) && matchesFolder(s))
  const filteredUnpinned = unpinnedSessions.filter((s) => matchesSearch(s) && matchesFolder(s))
  const currentModeLabel = MODES.find((m) => m.id === selectedMode)?.label ?? "Writing Assistant"
  const contextActive = documentContext.trim().length > 0

  // Theme helpers
  const cardBase = isDark ? "bg-white/5 border border-white/10" : "bg-black/5 border border-black/10"
  const sidebarBorder = isDark ? "border-white/10" : "border-black/10"
  const mutedText = isDark ? "text-white/40" : "text-black/40"
  const bodyText = isDark ? "text-white/70" : "text-black/70"
  const itemHover = isDark ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.04]"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mdComponents: Record<string, any> = {
    p: ({ children }: { children: React.ReactNode }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
    ul: ({ children }: { children: React.ReactNode }) => <ul className="mb-2 ml-4 list-disc space-y-0.5">{children}</ul>,
    ol: ({ children }: { children: React.ReactNode }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5">{children}</ol>,
    li: ({ children }: { children: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }: { children: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }: { children: React.ReactNode }) => <em className="italic">{children}</em>,
    code: ({ inline, children }: { inline?: boolean; children: React.ReactNode }) =>
      inline ? (
        <code className={`px-1 py-0.5 rounded text-[0.8em] font-mono ${isDark ? "bg-white/10 text-violet-300" : "bg-black/[0.08] text-violet-700"}`}>{children}</code>
      ) : <code>{children}</code>,
    pre: ({ children }: { children: React.ReactNode }) => (
      <pre className={`mb-2 p-3 rounded-lg text-xs font-mono overflow-x-auto ${isDark ? "bg-white/[0.07]" : "bg-black/[0.06]"}`}>{children}</pre>
    ),
    blockquote: ({ children }: { children: React.ReactNode }) => (
      <blockquote className={`border-l-2 pl-3 my-2 italic ${isDark ? "border-white/20 text-white/60" : "border-black/20 text-black/60"}`}>{children}</blockquote>
    ),
    h1: ({ children }: { children: React.ReactNode }) => <h1 className="text-base font-bold mb-2 mt-1">{children}</h1>,
    h2: ({ children }: { children: React.ReactNode }) => <h2 className="text-sm font-bold mb-1.5 mt-1">{children}</h2>,
    h3: ({ children }: { children: React.ReactNode }) => <h3 className="text-sm font-semibold mb-1 mt-1">{children}</h3>,
    a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`underline underline-offset-2 ${isDark ? "text-violet-400 hover:text-violet-300" : "text-violet-600 hover:text-violet-700"}`}>{children}</a>
    ),
  }

  function renderSessionItem(s: SessionSummary) {
    const isActive = s.id === activeSessionId
    const isEditing = editingSessionId === s.id
    const isFolderOpen = showFolderMenu === s.id

    return (
      <div key={s.id} className="group relative px-1.5 mb-0.5">
        {isEditing ? (
          <div className={`px-2.5 py-2 rounded-lg ${isDark ? "bg-white/10" : "bg-black/[0.08]"}`}>
            <input
              autoFocus
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitEdit() }
                if (e.key === "Escape") { cancelEditRef.current = true; setEditingSessionId(null) }
              }}
              onBlur={commitEdit}
              maxLength={100}
              className={`w-full bg-transparent text-xs font-medium outline-none ${isDark ? "text-white" : "text-black"}`}
            />
            <p className={`text-[10px] mt-0.5 ${mutedText}`}>Enter to save · Esc to cancel</p>
          </div>
        ) : (
          <button
            onClick={() => loadSession(s.id)}
            onDoubleClick={() => startEditing(s.id, s.title)}
            className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors ${isActive ? (isDark ? "bg-white/10 text-white" : "bg-black/[0.08] text-black") : `${bodyText} ${itemHover}`}`}
          >
            {(s.pinned || s.folder) && (
              <div className="flex items-center gap-1 mb-0.5">
                {s.pinned && (
                  <svg className={`w-2.5 h-2.5 flex-shrink-0 ${isDark ? "text-violet-400" : "text-violet-600"}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z" />
                  </svg>
                )}
                {s.folder && (
                  <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${isDark ? "bg-white/10 text-white/50" : "bg-black/[0.06] text-black/50"}`}>
                    {s.folder}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1 pr-12">
              <p className="text-xs font-medium truncate leading-snug flex-1">{s.title}</p>
              {renamedIds.has(s.id) && !isActive && (
                <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${isDark ? "bg-violet-400" : "bg-violet-600"}`} />
              )}
            </div>
            <p className={`text-[10px] mt-0.5 ${mutedText}`}>
              {getRelativeTime(s.updatedAt)} · {s.messageCount} msg{s.messageCount !== 1 ? "s" : ""}
            </p>
          </button>
        )}

        {!isEditing && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Pin */}
            <button
              onClick={(e) => { e.stopPropagation(); togglePin(s.id, s.pinned) }}
              title={s.pinned ? "Unpin" : "Pin"}
              className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${s.pinned ? (isDark ? "text-violet-400" : "text-violet-600") : (isDark ? "text-white/35 hover:text-white/70" : "text-black/30 hover:text-black/60")}`}
            >
              <svg className="w-3 h-3" fill={s.pinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z" />
              </svg>
            </button>

            {/* Folder */}
            <div ref={isFolderOpen ? folderMenuRef : undefined} className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowFolderMenu(isFolderOpen ? null : s.id); setNewFolderInput("") }}
                title="Move to folder"
                className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${s.folder ? (isDark ? "text-violet-400" : "text-violet-600") : (isDark ? "text-white/35 hover:text-white/70" : "text-black/30 hover:text-black/60")}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h3.586a1 1 0 01.707.293L10.414 6.5A1 1 0 0011.121 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
              </button>
              {isFolderOpen && (
                <div className={`absolute right-0 top-full mt-1 w-40 rounded-xl shadow-xl border z-50 py-1 ${isDark ? "bg-black/90 border-white/10 backdrop-blur-sm" : "bg-white border-black/10 shadow-lg"}`}>
                  {s.folder && (
                    <button
                      onClick={() => setSessionFolder(s.id, null)}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${isDark ? "text-white/50 hover:bg-white/[0.06]" : "text-black/50 hover:bg-black/[0.04]"}`}
                    >
                      Remove from folder
                    </button>
                  )}
                  {allFolders.filter((f) => f !== s.folder).map((f) => (
                    <button
                      key={f}
                      onClick={() => setSessionFolder(s.id, f)}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${isDark ? "text-white/60 hover:bg-white/[0.06]" : "text-black/60 hover:bg-black/[0.04]"}`}
                    >
                      {f}
                    </button>
                  ))}
                  <div className={`px-2 py-1.5 border-t mt-1 ${isDark ? "border-white/[0.06]" : "border-black/[0.06]"}`}>
                    <input
                      autoFocus
                      value={newFolderInput}
                      onChange={(e) => setNewFolderInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newFolderInput.trim()) setSessionFolder(s.id, newFolderInput.trim())
                        if (e.key === "Escape") setShowFolderMenu(null)
                      }}
                      placeholder="New folder…"
                      className={`w-full bg-transparent text-xs outline-none ${isDark ? "text-white placeholder-white/30" : "text-black placeholder-black/30"}`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Delete */}
            <button
              onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
              disabled={deletingId === s.id}
              title="Delete"
              className={`w-5 h-5 flex items-center justify-center rounded transition-colors disabled:opacity-40 ${isDark ? "hover:bg-red-500/20 text-white/35 hover:text-red-400" : "hover:bg-red-50 text-black/30 hover:text-red-600"}`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-5rem)] -mt-4 md:-mt-8 -mx-4 md:-mx-6">
      <style>{`@keyframes blink { 0%, 50% { opacity: 1 } 51%, 100% { opacity: 0 } }`}</style>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = "" }}
      />

      {/* ── Header ── */}
      <div className={`flex items-center justify-between px-4 md:px-6 py-3 border-b flex-shrink-0 ${isDark ? "border-white/10 bg-black/40" : "border-black/10 bg-white/60"}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isDark ? "text-white/50 hover:bg-white/10" : "text-black/50 hover:bg-black/5"}`}
            title="Toggle sidebar (⌘/)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <svg className={`w-5 h-5 ${isDark ? "text-violet-400" : "text-violet-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <h1 className={`text-base font-semibold ${isDark ? "text-white" : "text-black"}`}>AI Writing Assistant</h1>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mode picker */}
          <div ref={modeMenuRef} className="relative">
            <button
              onClick={() => setShowModeMenu((o) => !o)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white/80" : "bg-black/[0.04] hover:bg-black/[0.08] text-black/50 hover:text-black/70"}`}
            >
              {currentModeLabel}
              <svg className={`w-3 h-3 transition-transform ${showModeMenu ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showModeMenu && (
              <div className={`absolute right-0 top-full mt-1 w-44 rounded-xl shadow-xl border z-50 py-1 ${isDark ? "bg-black/90 border-white/10 backdrop-blur-sm" : "bg-white border-black/10 shadow-lg"}`}>
                {MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => { setSelectedMode(mode.id); setShowModeMenu(false) }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${selectedMode === mode.id ? (isDark ? "bg-violet-600/20 text-violet-300" : "bg-violet-50 text-violet-700") : (isDark ? "text-white/60 hover:bg-white/[0.06] hover:text-white/80" : "text-black/60 hover:bg-black/[0.04] hover:text-black/80")}`}
                  >
                    {mode.label}
                    {selectedMode === mode.id && (
                      <span className="float-right"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Copy conversation */}
          {messages.length > 0 && (
            <button onClick={() => copyConversation(messages)} title="Copy conversation" className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isDark ? "text-white/40 hover:bg-white/10 hover:text-white/70" : "text-black/30 hover:bg-black/5 hover:text-black/60"}`}>
              {copiedConversation
                ? <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              }
            </button>
          )}

          {/* Export */}
          {messages.length > 0 && (
            <button onClick={exportChat} title="Export as .md" className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isDark ? "text-white/40 hover:bg-white/10 hover:text-white/70" : "text-black/30 hover:bg-black/5 hover:text-black/60"}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}

          {/* Keyboard shortcuts */}
          <div ref={shortcutsRef} className="relative">
            <button onClick={() => setShowShortcutsHelp((o) => !o)} title="Keyboard shortcuts" className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isDark ? "text-white/40 hover:bg-white/10 hover:text-white/70" : "text-black/30 hover:bg-black/5 hover:text-black/60"}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {showShortcutsHelp && (
              <div className={`absolute right-0 top-full mt-2 w-56 rounded-xl shadow-xl border z-50 p-3 ${isDark ? "bg-black/90 border-white/10 backdrop-blur-sm" : "bg-white border-black/10 shadow-lg"}`}>
                <p className={`text-xs font-semibold mb-2 ${isDark ? "text-white/60" : "text-black/60"}`}>Keyboard Shortcuts</p>
                {[["⌘K", "New chat"], ["⌘/", "Toggle sidebar"], ["Enter", "Send message"], ["Shift+Enter", "New line"], ["Esc", "Close menus"]].map(([key, desc]) => (
                  <div key={key} className={`flex items-center justify-between py-1 text-xs ${isDark ? "text-white/50" : "text-black/50"}`}>
                    <span>{desc}</span>
                    <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isDark ? "bg-white/10 text-white/60" : "bg-black/[0.06] text-black/60"}`}>{key}</kbd>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Chat */}
          <button onClick={startNewChat} title="New chat (⌘K)" className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isDark ? "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white" : "bg-black/5 hover:bg-black/10 text-black/60 hover:text-black"}`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            New Chat
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar — overlay on mobile, push layout on desktop */}
        <aside className={`flex flex-col border-r flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out fixed md:relative top-0 md:top-auto bottom-0 md:bottom-auto left-0 md:left-auto z-40 md:z-auto w-64 shadow-2xl md:shadow-none ${sidebarBorder} ${isDark ? "bg-black/95 md:bg-black/30" : "bg-white md:bg-white/40"} ${sidebarOpen ? "translate-x-0 md:w-52 md:opacity-100" : "-translate-x-full md:translate-x-0 md:w-0 md:opacity-0"}`}>

          {/* Sidebar header with count */}
          <div className="flex-shrink-0 flex items-center justify-between px-3 pt-3 pb-1.5">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>Chats</span>
            {sessions.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium tabular-nums ${isDark ? "bg-white/[0.06] text-white/30" : "bg-black/[0.04] text-black/40"}`}>
                {sessions.length}
              </span>
            )}
          </div>

          {/* Search */}
          <div className={`flex-shrink-0 px-2 py-2 border-b ${sidebarBorder}`}>
            <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 ${isDark ? "bg-white/[0.05]" : "bg-black/[0.04]"}`}>
              <svg className={`w-3 h-3 flex-shrink-0 ${mutedText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
              <input value={sessionSearch} onChange={(e) => setSessionSearch(e.target.value)} placeholder="Search chats…" className={`flex-1 min-w-0 bg-transparent text-xs outline-none ${isDark ? "text-white placeholder-white/30" : "text-black placeholder-black/30"}`} />
              {sessionSearch && (
                <button onClick={() => setSessionSearch("")} className={`flex-shrink-0 ${mutedText}`}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* Folder filter chips */}
          {allFolders.length > 0 && (
            <div className={`flex-shrink-0 flex items-center gap-1 px-2 py-1.5 overflow-x-auto border-b ${sidebarBorder}`}>
              {[null, ...allFolders].map((f) => (
                <button
                  key={f ?? "__all"}
                  onClick={() => setFolderFilter(folderFilter === f ? null : f)}
                  className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap transition-colors ${folderFilter === f ? (isDark ? "bg-violet-600/30 text-violet-300" : "bg-violet-100 text-violet-700") : (isDark ? "bg-white/[0.06] text-white/50 hover:bg-white/10" : "bg-black/[0.04] text-black/50 hover:bg-black/[0.08]")}`}
                >
                  {f ?? "All"}
                </button>
              ))}
            </div>
          )}

          {/* Session list */}
          <div className="flex-1 overflow-y-auto py-2">
            {sessionsLoading ? (
              <div className="space-y-1.5 px-2 py-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`h-12 rounded-lg animate-pulse ${isDark ? "bg-white/[0.05]" : "bg-black/[0.04]"}`} />
                ))}
              </div>
            ) : filteredPinned.length === 0 && filteredUnpinned.length === 0 ? (
              <div className={`px-3 py-4 text-xs text-center leading-relaxed ${mutedText}`}>
                {sessionSearch ? "No matches found." : "No chats yet.\nStart a conversation!"}
              </div>
            ) : (
              <>
                {filteredPinned.length > 0 && (
                  <>
                    <p className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>Pinned</p>
                    {filteredPinned.map((s) => renderSessionItem(s))}
                    {filteredUnpinned.length > 0 && <div className={`mx-3 my-1 border-t ${sidebarBorder}`} />}
                  </>
                )}
                {filteredUnpinned.map((s) => renderSessionItem(s))}
              </>
            )}
          </div>
        </aside>

        {/* Messages area */}
        <div className="relative flex-1 overflow-hidden">
          <div ref={messagesContainerRef} className="absolute inset-0 overflow-y-auto px-4 md:px-6 py-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-6">
                <div className="flex flex-col items-center gap-3">
                  <svg className={`w-10 h-10 ${isDark ? "text-white/20" : "text-black/20"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  <div>
                    <p className={`text-sm font-medium ${isDark ? "text-white/60" : "text-black/60"}`}>Ask me to write, edit, or improve anything</p>
                    <p className={`text-xs mt-1 ${isDark ? "text-white/30" : "text-black/30"}`}>Paste document context below to give the AI reference material</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => { setInput(prompt); textareaRef.current?.focus() }}
                      className={`text-left text-xs px-3 py-2.5 rounded-xl border transition-colors ${isDark ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-white/50 hover:text-white/70" : "border-black/10 bg-black/[0.02] hover:bg-black/[0.05] text-black/50 hover:text-black/70"}`}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isLong = msg.role === "assistant" && !isStreaming && msg.content.length > COLLAPSE_THRESHOLD_CHARS
                const isCollapsed = collapsedMessages.has(i)
                const displayContent = isLong && isCollapsed
                  ? msg.content.slice(0, COLLAPSE_PREVIEW_CHARS) + "…"
                  : msg.content
                return (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "user" ? (
                      <div className="group relative max-w-[80%]">
                        {msg.imagePreview && (
                          <div className="mb-1.5 flex justify-end">
                            <img src={msg.imagePreview} alt="Attached" className="max-h-40 rounded-xl object-cover" />
                          </div>
                        )}
                        <div className={`rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap ${isDark ? "bg-violet-600/80 text-white" : "bg-violet-600 text-white"}`}>
                          {msg.content}
                        </div>
                        {msg.timestamp && (
                          <p className={`text-[10px] mt-0.5 text-right opacity-0 group-hover:opacity-100 transition-opacity ${mutedText}`}>
                            {getRelativeTime(msg.timestamp)}
                          </p>
                        )}
                        {!isStreaming && (
                          <button
                            onClick={() => startEditingMessage(i)}
                            className={`absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? "hover:bg-white/10 text-white/40 hover:text-white/70" : "hover:bg-black/5 text-black/30 hover:text-black/60"}`}
                            title="Edit message"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="group/msg max-w-[80%] flex flex-col gap-2">
                        <div className={`group relative rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm ${cardBase} ${isDark ? "text-white/90" : "text-black/90"}`}>
                          {msg.content ? (
                            <>
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{displayContent}</ReactMarkdown>
                              {isStreaming && i === messages.length - 1 && (
                                <span className={`inline-block w-0.5 h-4 ml-0.5 -mb-0.5 align-middle rounded-sm animate-[blink_1s_step-end_infinite] ${isDark ? "bg-white/70" : "bg-black/70"}`} />
                              )}
                            </>
                          ) : (
                            isStreaming && i === messages.length - 1
                              ? <span className={`inline-block w-0.5 h-4 align-middle rounded-sm animate-[blink_1s_step-end_infinite] ${isDark ? "bg-white/70" : "bg-black/70"}`} />
                              : ""
                          )}
                          {msg.content && (
                            <button
                              onClick={() => copyMessage(msg.content, i)}
                              className={`absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? "hover:bg-white/10 text-white/40 hover:text-white/70" : "hover:bg-black/5 text-black/30 hover:text-black/60"}`}
                            >
                              {copiedIndex === i
                                ? <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                              }
                            </button>
                          )}
                        </div>

                        {isLong && (
                          <button
                            onClick={() => setCollapsedMessages((prev) => {
                              const next = new Set(prev)
                              if (next.has(i)) next.delete(i)
                              else next.add(i)
                              return next
                            })}
                            className={`text-xs font-medium transition-colors self-start ${isDark ? "text-violet-400 hover:text-violet-300" : "text-violet-600 hover:text-violet-700"}`}
                          >
                            {isCollapsed ? "Show more ↓" : "Show less ↑"}
                          </button>
                        )}

                        {msg.timestamp && (
                          <p className={`text-[10px] opacity-0 group-hover/msg:opacity-100 transition-opacity -mt-1 ${mutedText}`}>
                            {getRelativeTime(msg.timestamp)}
                          </p>
                        )}

                        {msg.content && !(isStreaming && i === messages.length - 1) && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => sendToTyper(msg.content)}
                              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isDark ? "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white" : "bg-black/5 hover:bg-black/10 text-black/60 hover:text-black"}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              Send to Typer
                            </button>

                            {i === messages.length - 1 && (
                              <button
                                onClick={regenerateResponse}
                                disabled={isStreaming}
                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 ${isDark ? "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white" : "bg-black/5 hover:bg-black/10 text-black/60 hover:text-black"}`}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                Regenerate
                              </button>
                            )}

                            {/* Feedback — only for persisted messages with IDs */}
                            {msg.id && activeSessionId && (
                              <div className="flex items-center gap-0.5 ml-auto">
                                <button
                                  onClick={() => submitFeedback(msg.id!, activeSessionId, "up", msg.feedback)}
                                  title="Helpful"
                                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${msg.feedback === "up" ? "text-green-400" : (isDark ? "text-white/25 hover:bg-white/[0.06] hover:text-white/60" : "text-black/25 hover:bg-black/[0.04] hover:text-black/60")}`}
                                >
                                  <svg className="w-3.5 h-3.5" fill={msg.feedback === "up" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => submitFeedback(msg.id!, activeSessionId, "down", msg.feedback)}
                                  title="Not helpful"
                                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${msg.feedback === "down" ? "text-red-400" : (isDark ? "text-white/25 hover:bg-white/[0.06] hover:text-white/60" : "text-black/25 hover:bg-black/[0.04] hover:text-black/60")}`}
                                >
                                  <svg className="w-3.5 h-3.5" fill={msg.feedback === "down" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Scroll-to-bottom */}
          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full shadow-lg font-medium z-10 ${isDark ? "bg-black/70 backdrop-blur-sm hover:bg-black/90 text-white/70 border border-white/10" : "bg-white/90 backdrop-blur-sm hover:bg-white text-black/60 border border-black/10"}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              Scroll to bottom
            </button>
          )}
        </div>
      </div>

      {/* ── Input area ── */}
      <div className={`flex-shrink-0 border-t ${isDark ? "border-white/10 bg-black/40" : "border-black/10 bg-white/60"}`}>

        {/* Document context panel */}
        {showContextPanel && (
          <div className="px-4 md:px-6 pt-3 pb-0">
            <div className={`rounded-xl border ${isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-black/[0.02]"}`}>
              <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? "border-white/[0.06]" : "border-black/[0.06]"}`}>
                <span className={`text-xs font-medium ${isDark ? "text-white/50" : "text-black/50"}`}>Document context</span>
                <div className="flex items-center gap-2">
                  {documentContext.trim() && <button onClick={() => setDocumentContext("")} className={`text-xs ${isDark ? "text-white/40 hover:text-white/60" : "text-black/40 hover:text-black/60"}`}>Clear</button>}
                  <button onClick={() => setShowContextPanel(false)} className={`${isDark ? "text-white/40 hover:text-white/60" : "text-black/40 hover:text-black/60"}`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <textarea value={documentContext} onChange={(e) => setDocumentContext(e.target.value)} placeholder="Paste your document, article, or any text here…" rows={4} className={`w-full bg-transparent text-xs outline-none px-3 py-2.5 resize-none leading-relaxed ${isDark ? "text-white/70 placeholder-white/25" : "text-black/70 placeholder-black/25"}`} />
            </div>
          </div>
        )}

        {/* Prompt templates panel */}
        {showTemplates && (
          <div ref={templatesRef} className="px-4 md:px-6 pt-3 pb-0">
            <div className={`rounded-xl border ${isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-black/[0.02]"}`}>
              <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? "border-white/[0.06]" : "border-black/[0.06]"}`}>
                <span className={`text-xs font-medium ${isDark ? "text-white/50" : "text-black/50"}`}>Prompt Templates</span>
                <button onClick={() => setShowTemplates(false)} className={`${isDark ? "text-white/40 hover:text-white/60" : "text-black/40 hover:text-black/60"}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-2 flex flex-wrap gap-1.5">
                {[...BUILTIN_TEMPLATES, ...customTemplates].map((t) => (
                  <div key={t.id} className="relative group/t">
                    <button
                      onClick={() => { setInput((prev) => t.content + prev); setShowTemplates(false); textareaRef.current?.focus() }}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${isDark ? "bg-white/[0.07] hover:bg-white/[0.12] text-white/60 hover:text-white/80" : "bg-black/[0.05] hover:bg-black/[0.09] text-black/60 hover:text-black/80"}`}
                    >
                      {t.label}
                    </button>
                    {!t.id.startsWith("b") && (
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white hidden group-hover/t:flex items-center justify-center"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {input.trim() && (
                <div className={`flex items-center gap-2 px-3 py-2 border-t ${isDark ? "border-white/[0.06]" : "border-black/[0.06]"}`}>
                  <input
                    value={newTemplateLabel}
                    onChange={(e) => setNewTemplateLabel(e.target.value)}
                    placeholder="Save current input as template…"
                    className={`flex-1 text-xs bg-transparent outline-none ${isDark ? "text-white placeholder-white/30" : "text-black placeholder-black/30"}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTemplateLabel.trim()) { saveTemplate(newTemplateLabel.trim(), input); setNewTemplateLabel(""); setShowTemplates(false) }
                    }}
                  />
                  <button
                    onClick={() => { if (!newTemplateLabel.trim()) return; saveTemplate(newTemplateLabel.trim(), input); setNewTemplateLabel(""); setShowTemplates(false) }}
                    disabled={!newTemplateLabel.trim()}
                    className={`text-xs px-2 py-1 rounded font-medium transition-colors disabled:opacity-40 ${isDark ? "bg-violet-600/30 text-violet-300 hover:bg-violet-600/50" : "bg-violet-100 text-violet-700 hover:bg-violet-200"}`}
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pending image preview */}
        {pendingImage && (
          <div className="px-4 md:px-6 pt-3">
            <div className="relative inline-block">
              <img src={pendingImage.preview} alt="Pending" className="h-20 rounded-xl object-cover" />
              <button
                onClick={() => setPendingImage(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        )}

        <div className="px-4 md:px-6 py-4">
          <div className={`flex gap-2 items-end rounded-xl ${cardBase} p-2`}>

            {/* Context */}
            <button
              onClick={() => setShowContextPanel((o) => !o)}
              title={contextActive ? "Document context active" : "Add document context"}
              className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${contextActive ? (isDark ? "bg-violet-600/30 text-violet-400" : "bg-violet-100 text-violet-600") : (isDark ? "text-white/30 hover:bg-white/10 hover:text-white/60" : "text-black/25 hover:bg-black/5 hover:text-black/50")}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>

            {/* Templates */}
            <button
              onClick={() => setShowTemplates((o) => !o)}
              title="Prompt templates"
              className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${showTemplates ? (isDark ? "bg-violet-600/30 text-violet-400" : "bg-violet-100 text-violet-600") : (isDark ? "text-white/30 hover:bg-white/10 hover:text-white/60" : "text-black/25 hover:bg-black/5 hover:text-black/50")}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h8" />
              </svg>
            </button>

            {/* Image upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach image (or paste)"
              className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${pendingImage ? (isDark ? "bg-violet-600/30 text-violet-400" : "bg-violet-100 text-violet-600") : (isDark ? "text-white/30 hover:bg-white/10 hover:text-white/60" : "text-black/25 hover:bg-black/5 hover:text-black/50")}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={limitReached ? "Daily limit reached. Come back tomorrow." : "Message AI…"}
              disabled={isStreaming || limitReached}
              rows={1}
              className={`flex-1 resize-none bg-transparent text-sm outline-none px-2 py-1.5 max-h-40 ${isDark ? "text-white placeholder-white/30" : "text-black placeholder-black/30"} disabled:opacity-50`}
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />

            {isStreaming ? (
              <button onClick={stopGeneration} className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isDark ? "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white" : "bg-black/5 hover:bg-black/10 text-black/60 hover:text-black"}`}>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1.5" /></svg>
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={(!input.trim() && !pendingImage) || limitReached}
                className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-40 ${isDark ? "bg-violet-600 hover:bg-violet-500 text-white disabled:bg-white/10" : "bg-violet-600 hover:bg-violet-500 text-white disabled:bg-black/10"}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" /></svg>
              </button>
            )}
          </div>

          {contextActive && !showContextPanel && (
            <div className="flex items-center gap-1.5 mt-1.5 px-1">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDark ? "bg-violet-400" : "bg-violet-600"}`} />
              <span className={`text-xs truncate max-w-xs ${isDark ? "text-white/40" : "text-black/40"}`}>
                Context: {documentContext.slice(0, 60)}{documentContext.length > 60 ? "…" : ""}
              </span>
              <button onClick={() => setDocumentContext("")} className={`flex-shrink-0 ml-auto text-xs ${isDark ? "text-white/30 hover:text-white/50" : "text-black/30 hover:text-black/50"}`}>Clear</button>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <p className={`text-xs ${isDark ? "text-white/20" : "text-black/30"}`}>
              Enter to send · Shift+Enter for new line
            </p>
            <div className="flex items-center gap-3">
              {input.length > 100 && (
                <p className={`text-xs tabular-nums ${input.length > 9000 ? "text-amber-400/80" : isDark ? "text-white/20" : "text-black/30"}`}>
                  {input.length.toLocaleString()} / 10,000
                </p>
              )}
              {messagesRemaining !== null && (
                <p className={`text-xs tabular-nums ${messagesRemaining < 10 ? "text-amber-400/80" : isDark ? "text-white/20" : "text-black/30"}`}>
                  {messagesRemaining}/50 today
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium ${isDark ? "bg-black/90 border-white/10 text-white backdrop-blur-sm" : "bg-white border-black/10 text-black shadow-lg"}`}>
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          {toast}
          <Link href="/dashboard" className={`ml-1 text-xs underline underline-offset-2 ${isDark ? "text-violet-400 hover:text-violet-300" : "text-violet-600 hover:text-violet-700"}`}>Go to Dashboard</Link>
          <button onClick={() => setToast(null)} className={`ml-1 ${isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60"}`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}
