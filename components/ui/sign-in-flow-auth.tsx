"use client";

// Auth-aware landing page variant (previous SignInPage implementation).
// Kept here so the main / home route can continue using the original
// NextAuth-integrated experience even after replacing sign-in-flow-1.tsx
// with the 21st.dev design for /testhomepage.

import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AnimatedDots } from "@/components/ui/animated-dots";

interface SignInPageProps {
  className?: string;
}

type NavSectionId = "how-it-works" | "trust" | "about";

const AnimatedNavLink = ({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: React.ReactNode;
}) => {
  const defaultTextColor = "text-gray-300";
  const textSizeClass = "text-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative inline-block h-5 flex items-center ${textSizeClass}`}
    >
      <span
        className={cn(
          "transition-colors duration-200 ease-out",
          defaultTextColor,
          "group-hover:text-white"
        )}
      >
        {children}
      </span>
    </button>
  );
};

function MiniNavbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState("rounded-full");
  const shapeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openSection, setOpenSection] = useState<NavSectionId | null>(null);

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  const openModal = (section: NavSectionId) => {
    setOpenSection(section);
  };

  const closeModal = () => {
    setOpenSection(null);
  };

  const startGoogleSignIn = () =>
    signIn("google", { callbackUrl: "/dashboard" });

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/", redirect: true });
  };

  const handleDashboard = () => {
    router.push("/dashboard");
  };

  useEffect(() => {
    if (shapeTimeoutRef.current) {
      clearTimeout(shapeTimeoutRef.current);
    }

    if (isOpen) {
      setHeaderShapeClass("rounded-xl");
    } else {
      shapeTimeoutRef.current = setTimeout(() => {
        setHeaderShapeClass("rounded-full");
      }, 300);
    }

    return () => {
      if (shapeTimeoutRef.current) {
        clearTimeout(shapeTimeoutRef.current);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!openSection) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenSection(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openSection]);

  const logoElement = (
    <div className="relative w-5 h-5 flex items-center justify-center">
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 top-0 left-1/2 transform -translate-x-1/2 opacity-80" />
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 left-0 top-1/2 transform -translate-y-1/2 opacity-80" />
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 right-0 top-1/2 transform -translate-y-1/2 opacity-80" />
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 bottom-0 left-1/2 transform -translate-x-1/2 opacity-80" />
    </div>
  );

  const navLinksData: { id: NavSectionId; label: string }[] = [
    { id: "how-it-works", label: "How it works" },
    { id: "trust", label: "Trust" },
    { id: "about", label: "About" },
  ];

  const isLoading = status === "loading";

  const authButtonsElement = isLoading ? (
    <div className="px-4 py-2 sm:px-3 text-xs sm:text-sm text-gray-500 w-full sm:w-auto">
      Loading...
    </div>
  ) : session ? (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <button
        type="button"
        onClick={handleDashboard}
        className="px-4 py-2 sm:px-3 text-xs sm:text-sm border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 rounded-full hover:border-white/50 hover:text-white transition-colors duration-200 w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black"
        aria-label="Go to Dashboard"
      >
        Dashboard
      </button>
      <button
        type="button"
        onClick={handleSignOut}
        className="px-4 py-2 sm:px-3 text-xs sm:text-sm border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 rounded-full hover:border-red-500/50 hover:text-red-400 transition-colors duration-200 w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black"
        aria-label="Sign out"
      >
        Sign Out
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={startGoogleSignIn}
      className="px-4 py-2 sm:px-3 text-xs sm:text-sm border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 rounded-full hover:border-white/50 hover:text-white transition-colors duration-200 w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black"
      aria-label="Login with Google account"
    >
      Login
    </button>
  );

  const getSectionTitle = (section: NavSectionId) => {
    switch (section) {
      case "how-it-works":
        return "How typingisboring works";
      case "trust":
        return "Why people trust typingisboring";
      case "about":
        return "About typingisboring";
      default:
        return "";
    }
  };

  const getSectionBody = (section: NavSectionId) => {
    switch (section) {
      case "how-it-works":
        return (
          <div className="space-y-3 text-sm text-white/70">
            <p>
              1. Connect your Google account securely using OAuth — we never see your
              password and you can revoke access at any time from your Google settings.
            </p>
            <p>
              2. Paste your text, pick a Google Doc, and choose how fast you want it
              to type. You stay in Google Docs to watch it in real time.
            </p>
            <p>
              3. typingisboring simulates a human typing into that document — including
              pauses, bursts, and realistic delays — instead of pasting everything at once.
            </p>
            <p>
              4. You can pause, resume, or stop any job from the dashboard whenever you want.
            </p>
          </div>
        );
      case "trust":
        return (
          <div className="space-y-3 text-sm text-white/70">
            <p>
              We only request the minimal Google Docs scopes needed to type into
              documents you explicitly choose. We never read or change other docs.
            </p>
            <p>
              Your text and job history are cleaned up automatically after a short
              retention window so you stay in control of your data.
            </p>
            <p>
              All access can be revoked anytime from your Google Account security page.
            </p>
            <p>
              No ads, no selling your data — just natural typing for your own documents.
            </p>
          </div>
        );
      case "about":
        return (
          <div className="space-y-3 text-sm text-white/70">
            <p>
              typingisboring is a small tool for people who need long text to appear
              naturally in Google Docs — students, creators, teams, and anyone who
              hates copy‑pasting giant walls of text.
            </p>
            <p>
              It focuses on one thing: making automated typing look and feel human,
              without pretending to be anything else.
            </p>
            <p>
              You choose the doc, the content, and the pacing. We just handle the typing.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <header
        className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-20
                       flex flex-col items-center
                       pl-6 pr-6 py-3 backdrop-blur-sm
                       ${headerShapeClass}
                       border border-[#333] bg-[#1f1f1f57]
                       w-[calc(100%-2rem)] sm:w-auto
                       transition-[border-radius] duration-0 ease-in-out`}
      >
        <div className="flex items-center justify-between w-full gap-x-6 sm:gap-x-8">
          <div className="flex items-center">{logoElement}</div>

          <nav className="hidden sm:flex items-center space-x-6 text-sm">
            {navLinksData.map((link) => (
              <AnimatedNavLink
                key={link.id}
                onClick={() => openModal(link.id)}
              >
                {link.label}
              </AnimatedNavLink>
            ))}
          </nav>

          <div className="hidden sm:flex items-center">
            {authButtonsElement}
          </div>

          <button
            className="sm:hidden flex items-center justify-center w-8 h-8 text-gray-300 focus:outline-none"
            onClick={toggleMenu}
            aria-label={isOpen ? "Close Menu" : "Open Menu"}
          >
            {isOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        <div
          className={`sm:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden
                       ${
                         isOpen
                           ? "max-h-[1000px] opacity-100 pt-4"
                           : "max-h-0 opacity-0 pt-0 pointer-events-none"
                       }`}
        >
          <nav className="flex flex-col items-center space-y-4 text-base w-full">
            {navLinksData.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => {
                  openModal(link.id);
                  setIsOpen(false);
                }}
                className="text-gray-300 hover:text-white transition-colors w-full text-center"
              >
                {link.label}
              </button>
            ))}
          </nav>
          <div className="flex flex-col items-center space-y-4 mt-4 w-full">
            {authButtonsElement}
          </div>
        </div>
      </header>

      {/* Info modals for How it works / Trust / About */}
      <AnimatePresence>
        {openSection && (
          <motion.div
            key={openSection}
            className="fixed inset-0 z-40 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <button
              type="button"
              aria-label="Close information dialog"
              onClick={closeModal}
              className="absolute inset-0 bg-black/70"
            />

            {/* Dialog */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="landing-info-title"
              className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-black/90 p-6 shadow-2xl"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <h2
                  id="landing-info-title"
                  className="text-lg font-semibold text-white"
                >
                  {openSection && getSectionTitle(openSection)}
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-white/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full p-1"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {openSection && getSectionBody(openSection)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Re-export the main navbar so other pages (like /testhomepage)
// can reuse the exact same header/navigation as the main home page.
export { MiniNavbar as HomeNavbar };

export function SignInPageAuthWrapper({ className }: SignInPageProps) {
  return (
    <div className={cn("flex w-full flex-col min-h-screen bg-black relative", className)}>
      <div className="absolute inset-0 z-0">
        <AnimatedDots />
      </div>
      <div className="relative z-10 flex flex-col flex-1">
        <MiniNavbar />
        {/* The original content layer is in components/ui/sign-in-flow-1.tsx */}
      </div>
    </div>
  );
}


