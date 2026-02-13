"use client";

import { useState } from "react";
import type { TypingProfile } from "@/types";
import { useDashboardTheme } from "@/app/dashboard/layout";
import { TypingTest } from "./TypingTest";
import { UpgradeModal } from "./UpgradeModal";
import { isProfileAllowed, PlanTier } from "@/lib/constants/tiers";

interface TypingProfileSelectorProps {
  value: TypingProfile;
  onChange: (value: TypingProfile, testWPM?: number) => void;
  testWPM?: number;
  userTier?: PlanTier;
}

const profiles: {
  value: TypingProfile;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "steady",
    label: "Steady",
    description: "Uniform pace",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 12h14"
        />
      </svg>
    ),
  },
  {
    value: "fatigue",
    label: "Fatigue",
    description: "Slows over time",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
        />
      </svg>
    ),
  },
  {
    value: "burst",
    label: "Burst",
    description: "Fast with pauses",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  {
    value: "micropause",
    label: "Micro-pause",
    description: "Frequent breaks",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    value: "typing-test",
    label: "Typing Test",
    description: "Match your speed",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

export function TypingProfileSelector({
  value,
  onChange,
  testWPM,
  userTier = "FREE",
}: TypingProfileSelectorProps) {
  const { isDark } = useDashboardTheme();
  const [showTypingTest, setShowTypingTest] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{ isOpen: boolean; requiredTier: PlanTier; feature: string }>({
    isOpen: false,
    requiredTier: "PRO",
    feature: "",
  });

  const selectedDark =
    "bg-white border-white border-2 text-black";
  const unselectedDark =
    "bg-black/40 border border-white/20 hover:bg-black/60";
  const selectedLight =
    "bg-black text-white border border-black";
  const unselectedLight =
    "bg-white border border-black hover:bg-gray-50 active:bg-gray-100";

  return (
    <div className="space-y-2">
      <label
        className={`text-sm font-medium flex items-center gap-2 ${
          isDark ? "text-white" : "text-black"
        }`}
      >
        <svg
          className={`w-3.5 h-3.5 ${isDark ? "text-white" : "text-black"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        Typing style
      </label>

      <div className="grid grid-cols-5 gap-1.5">
        {profiles.map((profile) => {
          const isLocked = !isProfileAllowed(userTier, profile.value);
          const requiredTier: PlanTier = profile.value === "burst" || profile.value === "micropause" || profile.value === "typing-test" 
            ? "PRO" 
            : "FREE";

          return (
            <button
              key={profile.value}
              onClick={() => {
                if (isLocked) {
                  setUpgradeModal({
                    isOpen: true,
                    requiredTier,
                    feature: `${profile.label} typing profile`,
                  });
                  return;
                }
                if (profile.value === "typing-test") {
                  setShowTypingTest(true);
                } else {
                  onChange(profile.value);
                }
              }}
              disabled={isLocked}
              className={`relative p-2 rounded-lg text-center transition-all group touch-manipulation active:scale-95 ${
                isLocked
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              } ${
                value === profile.value
                  ? isDark
                    ? selectedDark
                    : selectedLight
                  : isDark
                  ? unselectedDark
                  : unselectedLight
              }`}
              aria-label={`Select ${profile.label} profile${isLocked ? " (locked)" : ""}`}
              aria-pressed={value === profile.value}
              tabIndex={isLocked ? -1 : 0}
            >
            <div
              className={`w-5 h-5 rounded mb-1 mx-auto flex items-center justify-center ${
                value === profile.value
                  ? isDark
                    ? "bg-white text-black"
                    : "bg-black text-white"
                  : isDark
                  ? "bg-white/10 text-white group-hover:text-white"
                  : "bg-black/5 text-black group-hover:text-black"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {profile.value === "steady" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />}
                {profile.value === "fatigue" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />}
                {profile.value === "burst" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />}
                {profile.value === "micropause" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                {profile.value === "typing-test" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
              </svg>
            </div>
            <div
              className={`font-medium text-[10px] leading-tight ${
                value === profile.value
                  ? isDark
                    ? "text-black"
                    : "text-white"
                  : isDark
                  ? "text-white"
                  : "text-black"
              }`}
            >
              {profile.label}
            </div>

            {isLocked && (
              <div className="absolute top-1 right-1 z-10">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  isDark ? "bg-yellow-500/20 border border-yellow-500/40" : "bg-yellow-100 border border-yellow-300"
                }`}>
                  <svg className={`w-2.5 h-2.5 ${isDark ? "text-yellow-400" : "text-yellow-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            )}
            {value === profile.value && !isLocked && (
              <div className="absolute top-1 right-1">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  isDark ? "bg-black" : "bg-white"
                }`} />
              </div>
            )}
            {profile.value === "typing-test" && testWPM && value === "typing-test" && (
              <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] px-1 py-0.5 rounded ${
                isDark ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-700"
              }`}>
                {testWPM}
              </div>
            )}
          </button>
        );
        })}
      </div>

      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal({ ...upgradeModal, isOpen: false })}
        requiredTier={upgradeModal.requiredTier}
        feature={upgradeModal.feature}
        currentTier={userTier}
      />

      {value === "typing-test" && testWPM && (
        <div className={`px-2 py-1.5 rounded border text-xs ${
          isDark ? "bg-white/5 border-white/15" : "bg-black/5 border-black/20"
        }`}>
          <p className={`${isDark ? "text-white/80" : "text-black/80"}`}>
            <strong>Typing Test:</strong> Using {testWPM} WPM
          </p>
        </div>
      )}

      <TypingTest
        isOpen={showTypingTest}
        onClose={() => setShowTypingTest(false)}
        onComplete={(wpm) => {
          onChange("typing-test", wpm);
          setShowTypingTest(false);
        }}
      />
    </div>
  );
}

