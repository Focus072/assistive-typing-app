"use client";

import { useEffect, useState, useRef } from "react";
import { useDashboardTheme } from "@/app/dashboard/layout";

interface GoogleDoc {
  id: string;
  name: string;
  modifiedTime?: string;
}

interface DocsSelectorProps {
  value: string;
  onChange: (documentId: string) => void;
  onCreateNew?: (title: string) => Promise<string>;
}

export function DocsSelector({
  value,
  onChange,
  onCreateNew,
}: DocsSelectorProps) {
  const { isDark } = useDashboardTheme();

  const [docs, setDocs] = useState<GoogleDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<Record<string, "above" | "below">>({});
  const [menuCoords, setMenuCoords] = useState<Record<string, { top: number; right: number }>>({});
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    void loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showActionsMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = menuButtonRefs.current[showActionsMenu];
      const menu = menuRefs.current[showActionsMenu];
      
      if (
        button &&
        menu &&
        !button.contains(target) &&
        !menu.contains(target)
      ) {
        setShowActionsMenu(null);
      }
    };

    // Use a small delay to prevent immediate closure when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsMenu]);

  // Calculate menu position when it opens - do it immediately for better UX
  useEffect(() => {
    if (!showActionsMenu) return;

    const calculatePosition = () => {
      const button = menuButtonRefs.current[showActionsMenu];
      if (!button) return;

      const buttonRect = button.getBoundingClientRect();
      const scrollContainer = button.closest('.max-h-96');
      const containerRect = scrollContainer?.getBoundingClientRect();
      
      // Estimate menu height (3 items: Open, Rename, Delete)
      const estimatedMenuHeight = 120;
      const requiredSpace = estimatedMenuHeight + 8; // 8px margin

      let shouldShowAbove = false;

      // Check viewport space first (most reliable)
      const viewportHeight = window.innerHeight;
      const viewportSpaceBelow = viewportHeight - buttonRect.bottom;
      const viewportSpaceAbove = buttonRect.top;
      
      // Also check container space if available
      if (containerRect) {
        const containerSpaceBelow = containerRect.bottom - buttonRect.bottom;
        const containerSpaceAbove = buttonRect.top - containerRect.top;
        
        // Use the more restrictive constraint (smaller of viewport or container)
        const spaceBelow = Math.min(viewportSpaceBelow, containerSpaceBelow);
        const spaceAbove = Math.min(viewportSpaceAbove, containerSpaceAbove);
        
        // Show above if not enough space below (be more aggressive)
        // If we're in the bottom half of the container, prefer showing above
        const isInBottomHalf = (buttonRect.top - containerRect.top) > (containerRect.height / 2);
        
        if (isInBottomHalf || (spaceBelow < requiredSpace && spaceAbove >= requiredSpace)) {
          shouldShowAbove = true;
        }
      } else {
        // Fallback: use viewport space only
        // If button is in bottom half of viewport, show above
        const isInBottomHalf = buttonRect.top > (viewportHeight / 2);
        
        if (isInBottomHalf || (viewportSpaceBelow < requiredSpace && viewportSpaceAbove >= requiredSpace)) {
          shouldShowAbove = true;
        }
      }

      setMenuPosition(prev => ({ 
        ...prev, 
        [showActionsMenu]: shouldShowAbove ? "above" : "below" 
      }));
    };

    // Calculate immediately, then refine after menu renders
    calculatePosition();
    
    // Refine position after menu renders with actual height
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        const button = menuButtonRefs.current[showActionsMenu];
        const menu = menuRefs.current[showActionsMenu];
        if (!button || !menu) return;

        const buttonRect = button.getBoundingClientRect();
        const actualMenuHeight = menu.offsetHeight;
        const requiredSpace = actualMenuHeight + 8;
        
        const viewportHeight = window.innerHeight;
        const viewportSpaceBelow = viewportHeight - buttonRect.bottom;
        const viewportSpaceAbove = buttonRect.top;
        
        const scrollContainer = button.closest('.max-h-96');
        const containerRect = scrollContainer?.getBoundingClientRect();
        
        let shouldShowAbove = false;
        
        if (containerRect) {
          const containerSpaceBelow = containerRect.bottom - buttonRect.bottom;
          const containerSpaceAbove = buttonRect.top - containerRect.top;
          const spaceBelow = Math.min(viewportSpaceBelow, containerSpaceBelow);
          const spaceAbove = Math.min(viewportSpaceAbove, containerSpaceAbove);
          
          if (spaceBelow < requiredSpace && spaceAbove >= requiredSpace) {
            shouldShowAbove = true;
          }
        } else {
          if (viewportSpaceBelow < requiredSpace && viewportSpaceAbove >= requiredSpace) {
            shouldShowAbove = true;
          }
        }
        
        setMenuPosition(prev => ({ 
          ...prev, 
          [showActionsMenu]: shouldShowAbove ? "above" : "below" 
        }));
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [showActionsMenu]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/google-docs/list");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === "GOOGLE_AUTH_REVOKED") {
          setError("Please connect your Google account first.");
        } else {
          setError("Unable to load documents. Please reconnect your Google account.");
        }
        return;
      }
      const data = await res.json();
      setDocs(data.documents || []);
    } catch {
      setError("Unable to load documents. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!onCreateNew || !newTitle.trim()) return;
    try {
      setCreating(true);
      const id = await onCreateNew(newTitle.trim());
      setNewTitle("");
      setShowCreateModal(false);
      await loadDocuments();
      onChange(id);
    } catch (e) {
      setError("Unable to create document. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleStartRename = (doc: GoogleDoc) => {
    setRenamingId(doc.id);
    setRenameValue(doc.name);
    setShowActionsMenu(null);
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const handleConfirmRename = async (docId: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      handleCancelRename();
      return;
    }
    try {
      setDeletingId(docId);
      setError(null);
      const res = await fetch("/api/google-docs/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, title: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Unable to rename document.");
        return;
      }
      setDocs((prev) =>
        prev.map((doc) =>
          doc.id === docId ? { ...doc, name: trimmed } : doc
        )
      );
      handleCancelRename();
    } catch {
      setError("Unable to rename document. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm("Move this document to trash in Google Drive?")) {
      return;
    }
    try {
      setDeletingId(docId);
      setError(null);
      
      // Optimistically remove from UI immediately
      const previousDocs = docs;
      setDocs((prev) => prev.filter((doc) => doc.id !== docId));
      
      // Clear selection if deleting the selected document
      if (value === docId) {
        onChange("");
      }
      setShowActionsMenu(null);
      
      const res = await fetch("/api/google-docs/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId }),
      });
      
      if (!res.ok) {
        // Restore the document if delete failed
        setDocs(previousDocs);
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Unable to delete document.");
        setDeletingId(null);
        return;
      }
      
      // Reload documents to ensure we're in sync with server
      await loadDocuments();
    } catch (error) {
      // Restore the document if delete failed
      await loadDocuments();
      setError("Unable to delete document. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const selectedDoc = docs.find((doc) => doc.id === value);

  const labelClasses = `text-sm font-medium flex items-center gap-2 ${
    isDark ? "text-white" : "text-black"
  }`;

  if (loading) {
    return (
      <div className="space-y-3">
        <label className={labelClasses}>
          <svg
            className={`w-4 h-4 ${isDark ? "text-white" : "text-black"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Google Doc
        </label>
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
            isDark
              ? "bg-white/5 border-white/15"
              : "bg-gray-100 border-black/10"
          }`}
        >
          <div
            className={`w-5 h-5 border-2 rounded-full animate-spin ${
              isDark
                ? "border-white/30 border-t-white"
                : "border-black/20 border-t-black"
            }`}
          />
          <span
            className={`text-sm ${
              isDark ? "text-white/70" : "text-black/70"
            }`}
          >
            Loading documents...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <label className={labelClasses}>
          <svg
            className={`w-4 h-4 ${isDark ? "text-white" : "text-black"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Google Doc
        </label>
        <div
          className={`px-4 py-3 rounded-lg border text-sm ${
            isDark
              ? "bg-red-900/20 border-red-500/60 text-red-100"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
          role="alert"
        >
          {error}
        </div>
        <button
          type="button"
          onClick={loadDocuments}
          className="px-4 py-2 rounded-lg bg-white text-black hover:bg-gray-100 text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className={labelClasses}>
        <svg
          className={`w-4 h-4 ${isDark ? "text-white" : "text-black"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Google Doc
        <span className="text-xs font-normal opacity-70">
          Choose where we&apos;ll type
        </span>
      </label>

      {/* Split-view layout */}
      <div
        className={`rounded-lg border overflow-hidden ${
          isDark
            ? "bg-black/60 border-white/15"
            : "bg-white border-black/10"
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
          {/* Left: Document List */}
          <div className="p-3 md:p-4">
            {docs.length === 0 ? (
              <div className="py-8 text-center">
                <p
                  className={`text-sm ${
                    isDark ? "text-white/60" : "text-black/60"
                  }`}
                >
                  No Google Docs found.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {docs.map((doc) => {
                  const isSelected = value === doc.id;
                  const isRenaming = renamingId === doc.id;
                  const isBusy = deletingId === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className={`group relative rounded-md transition-all flex items-center gap-2 ${
                        isSelected
                          ? isDark
                            ? "bg-emerald-500/10 border-2 border-emerald-400/40"
                            : "bg-emerald-50 border-2 border-emerald-300"
                          : isDark
                          ? "border border-white/10 hover:border-white/20 hover:bg-white/5"
                          : "border border-black/10 hover:border-black/20 hover:bg-gray-50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onChange(doc.id)}
                        className="flex-1 flex items-center gap-3 px-3 py-2.5 text-left min-w-0"
                        disabled={isBusy}
                      >
                        <div
                          className={`flex-shrink-0 w-2 h-2 rounded-full transition-colors ${
                            isSelected
                              ? "bg-emerald-400"
                              : isDark
                              ? "bg-white/30 group-hover:bg-white/50"
                              : "bg-black/30 group-hover:bg-black/50"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          {isRenaming ? (
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleConfirmRename(doc.id);
                                } else if (e.key === "Escape") {
                                  handleCancelRename();
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className={`w-full rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 ${
                                isDark
                                  ? "bg-black border border-white/30 text-white focus:ring-white focus:border-white"
                                  : "bg-white border border-black/20 text-black focus:ring-black focus:border-black"
                              }`}
                              autoFocus
                            />
                          ) : (
                            <>
                              <div
                                className={`font-medium truncate text-sm ${
                                  isDark ? "text-white" : "text-black"
                                }`}
                              >
                                {doc.name}
                              </div>
                              {doc.modifiedTime && (
                                <div
                                  className={`text-xs mt-0.5 ${
                                    isDark ? "text-white/50" : "text-black/50"
                                  }`}
                                >
                                  Updated{" "}
                                  {new Date(
                                    doc.modifiedTime
                                  ).toLocaleDateString()}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </button>
                      {isRenaming ? (
                        <div className="flex items-center gap-1 pr-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmRename(doc.id);
                            }}
                            disabled={isBusy}
                            className="px-2 py-1 rounded text-xs bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelRename();
                            }}
                            disabled={isBusy}
                            className="px-2 py-1 rounded text-xs border border-white/20 text-white/70 hover:bg-white/10"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          ref={(el) => {
                            menuButtonRefs.current[doc.id] = el;
                          }}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const newMenuState = showActionsMenu === doc.id ? null : doc.id;
                            
                            // Pre-calculate position before opening menu
                            if (newMenuState && menuButtonRefs.current[doc.id]) {
                              const button = menuButtonRefs.current[doc.id];
                              if (!button) return;
                              const buttonRect = button.getBoundingClientRect();
                              const viewportHeight = window.innerHeight;
                              const estimatedMenuHeight = 120;
                              const requiredSpace = estimatedMenuHeight + 8;
                              
                              // Calculate available space
                              const viewportSpaceBelow = viewportHeight - buttonRect.bottom;
                              const viewportSpaceAbove = buttonRect.top;
                              
                              // Default to below, only show above if not enough space below
                              let shouldShowAbove = false;
                              let menuTop = buttonRect.bottom + 4; // Default: below
                              let menuRight = window.innerWidth - buttonRect.right;
                              
                              // Check if there's enough space below
                              if (viewportSpaceBelow < requiredSpace) {
                                // Not enough space below, check if we have space above
                                if (viewportSpaceAbove >= requiredSpace) {
                                  shouldShowAbove = true;
                                  menuTop = buttonRect.top - estimatedMenuHeight - 4;
                                } else {
                                  // Not enough space either way, show below but adjust to fit viewport
                                  menuTop = Math.max(8, viewportHeight - estimatedMenuHeight - 8);
                                }
                              }
                              
                              // Ensure menu stays within viewport bounds
                              if (shouldShowAbove) {
                                menuTop = Math.max(8, menuTop);
                              } else {
                                menuTop = Math.min(menuTop, viewportHeight - estimatedMenuHeight - 8);
                              }
                              
                              // Set initial position immediately
                              setMenuPosition(prev => ({ 
                                ...prev, 
                                [doc.id]: shouldShowAbove ? "above" : "below" 
                              }));
                              
                              setMenuCoords(prev => ({
                                ...prev,
                                [doc.id]: { top: menuTop, right: menuRight }
                              }));
                            }
                            
                            setShowActionsMenu(newMenuState);
                            
                            // Scroll button into view if menu is opening
                            if (newMenuState && menuButtonRefs.current[doc.id]) {
                              setTimeout(() => {
                                menuButtonRefs.current[doc.id]?.scrollIntoView({ 
                                  behavior: 'smooth', 
                                  block: 'nearest' 
                                });
                              }, 50);
                            }
                          }}
                          className={`flex-shrink-0 p-1.5 rounded transition-colors mr-2 ${
                            isDark
                              ? "text-white/40 hover:text-white hover:bg-white/10"
                              : "text-black/40 hover:text-black hover:bg-black/10"
                          }`}
                          aria-label="Document actions"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                            />
                          </svg>
                        </button>
                      )}

                      {/* Actions menu (hidden by default, shown on click) */}
                      {showActionsMenu === doc.id && !isRenaming && (
                        <div
                          ref={(el) => {
                            menuRefs.current[doc.id] = el;
                          }}
                          className={`fixed z-50 rounded-lg border shadow-lg py-1 min-w-[140px] ${
                            isDark
                              ? "bg-black border-white/20"
                              : "bg-white border-black/20"
                          }`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            top: menuCoords[doc.id]?.top ?? 'auto',
                            right: menuCoords[doc.id]?.right ?? 'auto',
                            maxHeight: 'calc(100vh - 2rem)',
                            overflowY: 'auto'
                          }}
                        >
                          <a
                            href={`https://docs.google.com/document/d/${doc.id}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`block px-3 py-2 text-sm transition-colors ${
                              isDark
                                ? "text-white/80 hover:bg-white/10"
                                : "text-black/80 hover:bg-gray-50"
                            }`}
                          >
                            Open in Google Docs
                          </a>
                          <button
                            type="button"
                            onClick={() => handleStartRename(doc)}
                            disabled={isBusy}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                              isDark
                                ? "text-white/80 hover:bg-white/10"
                                : "text-black/80 hover:bg-gray-50"
                            }`}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(doc.id)}
                            disabled={isBusy}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                              isDark
                                ? "text-red-300 hover:bg-red-500/10"
                                : "text-red-600 hover:bg-red-50"
                            }`}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Preview/Confirmation Panel */}
          <div
            className={`p-3 md:p-4 flex flex-col ${
              isDark ? "bg-white/5" : "bg-gray-50"
            }`}
          >
            {selectedDoc ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isDark ? "bg-emerald-400" : "bg-emerald-500"
                      }`}
                    />
                    <h3
                      className={`font-semibold text-sm ${
                        isDark ? "text-white" : "text-black"
                      }`}
                    >
                      Selected Document
                    </h3>
                  </div>
                  <div
                    className={`rounded-lg p-3 ${
                      isDark
                        ? "bg-black/40 border border-white/10"
                        : "bg-white border border-black/10"
                    }`}
                  >
                    <div
                      className={`font-medium text-sm mb-1 ${
                        isDark ? "text-white" : "text-black"
                      }`}
                    >
                      {selectedDoc.name}
                    </div>
                    {selectedDoc.modifiedTime && (
                      <div
                        className={`text-xs ${
                          isDark ? "text-white/50" : "text-black/50"
                        }`}
                      >
                        Last updated:{" "}
                        {new Date(
                          selectedDoc.modifiedTime
                        ).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={`rounded-lg p-3 border ${
                    isDark
                      ? "bg-emerald-500/10 border-emerald-400/30"
                      : "bg-emerald-50 border-emerald-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <svg
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        isDark ? "text-emerald-300" : "text-emerald-600"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <div
                        className={`text-xs font-medium mb-1 ${
                          isDark ? "text-emerald-200" : "text-emerald-700"
                        }`}
                      >
                        Ready to type
                      </div>
                      <div
                        className={`text-xs ${
                          isDark ? "text-emerald-200/80" : "text-emerald-700/80"
                        }`}
                      >
                        Text will be appended to the end of this document.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-8">
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${
                    isDark ? "bg-white/10" : "bg-black/5"
                  }`}
                >
                  <svg
                    className={`w-6 h-6 ${
                      isDark ? "text-white/40" : "text-black/40"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p
                  className={`text-sm mb-4 ${
                    isDark ? "text-white/60" : "text-black/60"
                  }`}
                >
                  Select a document from the list
                </p>
                {onCreateNew && (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDark
                        ? "bg-white text-black hover:bg-white/90"
                        : "bg-black text-white hover:bg-black/90"
                    }`}
                  >
                    Create New Document
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Document Modal */}
      {showCreateModal && onCreateNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className={`fixed inset-0 ${
              isDark ? "bg-black/80" : "bg-black/50"
            }`}
            aria-hidden="true"
          />
          <div
            className={`relative rounded-lg border p-6 w-full max-w-md ${
              isDark
                ? "bg-black border-white/20"
                : "bg-white border-black/20"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className={`text-lg font-semibold mb-4 ${
                isDark ? "text-white" : "text-black"
              }`}
            >
              Create New Document
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDark ? "text-white/80" : "text-black/80"
                  }`}
                >
                  Document Name
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTitle.trim() && !creating) {
                      handleCreate();
                    }
                  }}
                  placeholder='e.g. "Essay draft – MLA"'
                  autoFocus
                  disabled={creating}
                  className={`w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:opacity-50 ${
                    isDark
                      ? "bg-black border border-white/20 text-white placeholder:text-white/40 focus:ring-white focus:border-white"
                      : "bg-white border border-black/20 text-black placeholder:text-black/40 focus:ring-black focus:border-black"
                  }`}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewTitle("");
                  }}
                  disabled={creating}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    isDark
                      ? "bg-white/10 text-white hover:bg-white/20"
                      : "bg-black/5 text-black hover:bg-black/10"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || creating}
                  className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
