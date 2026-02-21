"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { HomeNavbar } from "@/components/ui/sign-in-flow-auth";
import { PricingCards } from "@/components/ui/pricing-cards";

// Lazy getter for DynamicShader to prevent module-level evaluation
// This function is only called when DotMatrix component mounts, not during module initialization
const getDynamicShader = () => {
  return dynamic(
    () => {
      return import("./CanvasShader").then((mod) => {
        return { default: mod.Shader };
      }).catch((err) => {
        throw err;
      });
    },
    { 
      ssr: false,
      loading: () => null
    }
  );
};

type Uniforms = {
  [key: string]: {
    value: number[] | number[][] | number;
    type: string;
  };
};

interface ShaderProps {
  source: string;
  uniforms: {
    [key: string]: {
      value: number[] | number[][] | number;
      type: string;
    };
  };
  maxFps?: number;
}

interface SignInPageProps {
  className?: string;
}

export const CanvasRevealEffect = ({
  animationSpeed = 10,
  opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
  colors = [[0, 255, 255]],
  containerClassName,
  dotSize,
  showGradient = false, // default disabled per spec
  reverse = false,
}: {
  animationSpeed?: number;
  opacities?: number[];
  colors?: number[][];
  containerClassName?: string;
  dotSize?: number;
  showGradient?: boolean;
  reverse?: boolean;
}) => {
  return (
    <div className={cn("h-full relative w-full", containerClassName)}>
      <div className="h-full w-full">
        <DotMatrix
          colors={colors ?? [[0, 255, 255]]}
          dotSize={dotSize ?? 3}
          opacities={
            opacities ?? [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1]
          }
          shader={`
            ${reverse ? "u_reverse_active" : "false"}_;
            animation_speed_factor_${animationSpeed.toFixed(1)}_;
          `}
          center={["x", "y"]}
        />
      </div>
      {showGradient && (
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      )}
    </div>
  );
};

interface DotMatrixProps {
  colors?: number[][];
  opacities?: number[];
  totalSize?: number;
  dotSize?: number;
  shader?: string;
  center?: ("x" | "y")[];
}

const DotMatrix: React.FC<DotMatrixProps> = ({
  colors = [[0, 0, 0]],
  opacities = [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.08, 0.08, 0.08, 0.14],
  totalSize = 20,
  dotSize = 2,
  shader = "",
  center = ["x", "y"],
}) => {
  // Create DynamicShader lazily inside component to prevent module-level evaluation
  const DynamicShader = React.useMemo(() => getDynamicShader(), []);
  
  const uniforms = React.useMemo(() => {
    let colorsArray = [
      colors[0],
      colors[0],
      colors[0],
      colors[0],
      colors[0],
      colors[0],
    ];
    if (colors.length === 2) {
      colorsArray = [
        colors[0],
        colors[0],
        colors[0],
        colors[1],
        colors[1],
        colors[1],
      ];
    } else if (colors.length === 3) {
      colorsArray = [
        colors[0],
        colors[0],
        colors[1],
        colors[1],
        colors[2],
        colors[2],
      ];
    }
    return {
      u_colors: {
        value: colorsArray.map((color) => [
          color[0] / 255,
          color[1] / 255,
          color[2] / 255,
        ]),
        type: "uniform3fv",
      },
      u_opacities: {
        value: opacities,
        type: "uniform1fv",
      },
      u_total_size: {
        value: totalSize,
        type: "uniform1f",
      },
      u_dot_size: {
        value: dotSize,
        type: "uniform1f",
      },
      u_reverse: {
        value: shader.includes("u_reverse_active") ? 1 : 0,
        type: "uniform1i",
      },
    };
  }, [colors, opacities, totalSize, dotSize, shader]);

  return (
    <DynamicShader
      source={`
        precision mediump float;
        in vec2 fragCoord;

        uniform float u_time;
        uniform float u_opacities[10];
        uniform vec3 u_colors[6];
        uniform float u_total_size;
        uniform float u_dot_size;
        uniform vec2 u_resolution;
        uniform int u_reverse;

        out vec4 fragColor;

        float PHI = 1.61803398874989484820459;
        float random(vec2 xy) {
            return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
        }
        float map(float value, float min1, float max1, float min2, float max2) {
            return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
        }

        void main() {
            vec2 st = fragCoord.xy;
            ${
              center.includes("x")
                ? "st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));"
                : ""
            }
            ${
              center.includes("y")
                ? "st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));"
                : ""
            }

            float opacity = step(0.0, st.x);
            opacity *= step(0.0, st.y);

            vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));

            float frequency = 5.0;
            float show_offset = random(st2);
            float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
            opacity *= u_opacities[int(rand * 10.0)];
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

            vec3 color = u_colors[int(show_offset * 6.0)];

            float animation_speed_factor = 0.5;
            vec2 center_grid = u_resolution / 2.0 / u_total_size;
            float dist_from_center = distance(center_grid, st2);

            float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);
            float max_grid_dist = distance(center_grid, vec2(0.0, 0.0));
            float timing_offset_outro = (max_grid_dist - dist_from_center) * 0.02 + (random(st2 + 42.0) * 0.2);


            float current_timing_offset;
            if (u_reverse == 1) {
                current_timing_offset = timing_offset_outro;
                 opacity *= 1.0 - step(current_timing_offset, u_time * animation_speed_factor);
                 opacity *= clamp((step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
            } else {
                current_timing_offset = timing_offset_intro;
                 opacity *= step(current_timing_offset, u_time * animation_speed_factor);
                 opacity *= clamp((1.0 - step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
            }


            fragColor = vec4(color, opacity);
            fragColor.rgb *= fragColor.a;
        }`}
      uniforms={uniforms}
      maxFps={60}
    />
  );
};

const AnimatedNavLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => {
  const defaultTextColor = "text-gray-300";
  const hoverTextColor = "text-white";
  const textSizeClass = "text-sm";

  return (
    <a
      href={href}
      className={`group relative inline-block overflow-hidden h-5 flex items-center ${textSizeClass}`}
    >
      <div className="flex flex-col transition-transform duration-400 ease-out transform group-hover:-translate-y-1/2">
        <span className={defaultTextColor}>{children}</span>
        <span className={hoverTextColor}>{children}</span>
      </div>
    </a>
  );
};

function MiniNavbar() {
  // Unused legacy navbar kept intentionally for potential future experiments.
  // The real navbar used on the home page is `HomeNavbar` from sign-in-flow-auth.tsx.
  return null;
}

export const SignInPage = ({ className }: SignInPageProps) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  const scrollToPricing = () => {
    const pricingSection = document.getElementById("pricing-section");
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const isAuthenticated = status === "authenticated";

  return (
    <div className={cn("flex w-full flex-col min-h-screen bg-black relative", className)}>
      {/* Background layer with canvas-based dot animation */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0">
          <CanvasRevealEffect
            animationSpeed={3}
            containerClassName="bg-black"
            colors={[[255, 255, 255]]}
            dotSize={5}
            opacities={[0.55, 0.6, 0.7, 0.8, 1]}
            reverse={false}
            showGradient={false}
          />
        </div>

        {/* Optional single light vignette */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.35)_0%,_transparent_55%)]" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Top navigation: auth-aware navbar with How it works / Trust / About */}
        <HomeNavbar onPricingClick={scrollToPricing} />

        {/* Main hero */}
        <main className="flex flex-1 items-center justify-center px-6 pt-28 pb-16">
          <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-12 items-start lg:items-center">
            {/* Left: Natural typing copy + CTA */}
            <section className="space-y-5">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                Natural typing for Google Docs
              </span>

              {/* Brand name - reduced emphasis */}
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-white/80 drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]">
                  Typing Is Boring
                </h2>
                <p className="text-sm sm:text-base text-white/60">
                  Typing Is Boring simulates human typing in Google Docs.
                </p>
              </div>

              {/* Primary benefit - dominant headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white drop-shadow-[0_0_25px_rgba(0,0,0,0.8)]">
                Make long docs feel{" "}
                <span className="text-white/60">effortless.</span>
              </h1>

              <p className="text-base sm:text-lg text-white/70">
                Paste your text, pick a Google Doc, and watch it type itself
                with human-like rhythm — pauses, bursts, and everything in between.
              </p>

              {/* CTA + Trust block */}
              <div className="flex flex-col gap-4 pt-3 sm:pt-6">
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleGoToDashboard}
                    className="inline-flex items-center justify-center w-full sm:w-auto sm:max-w-[240px] rounded-full bg-white text-black font-medium py-3 px-6 text-sm hover:bg-white/90 transition-colors"
                  >
                    Open dashboard
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={scrollToPricing}
                      className="inline-flex items-center justify-center gap-2 w-full sm:w-auto sm:max-w-[280px] bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full py-3.5 px-8 text-sm font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-0.5"
                    >
                      Get Started - View Plans
                    </button>
                    <p className="text-xs text-white/50 text-center sm:text-left">
                      No install. No extensions.
                    </p>
                  </div>
                )}

                {/* Trust signals - compact block directly under CTA */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <p className="text-xs text-white/50">
                    We never read or store your documents.
                  </p>
                  <p className="text-xs text-white/50">
                    Uses official Google OAuth — revoke access anytime.
                  </p>
                </div>
              </div>

              {/* Supporting bullets - de-emphasized */}
              <ul className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs text-white/60 pt-1">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  Looks like real typing, not a copy‑paste dump.
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  Your docs stay in your Google account — we only type where you point us.
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  Control speed, breaks, and pacing to match how humans type.
                </li>
              </ul>

              <p className="text-[11px] text-white/40 pt-2">
                By continuing, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-white/60">
                  Terms
                </Link>
                ,{" "}
                <Link href="/privacy" className="underline hover:text-white/60">
                  Privacy
                </Link>{" "}
                and{" "}
                <Link href="/cookies" className="underline hover:text-white/60">
                  Cookies
                </Link>
                .
              </p>
            </section>

            {/* Right: live system status card + 3-step flow */}
            <aside className="relative mt-12 sm:mt-8 lg:mt-0 flex flex-col items-center lg:items-start gap-3">
              <p className="text-sm font-medium text-white/70 text-center lg:text-left w-full">
                Live preview
              </p>
              <div
                className="group relative w-full max-w-sm lg:max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.9)]"
                style={{ aspectRatio: "1 / 1" }}
                aria-label="Typing status into Google Docs"
                aria-live="polite"
              >
                {/* Ambient glow */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-70"
                  style={{
                    background:
                      "radial-gradient(circle at top left, rgba(16,185,129,0.2), transparent 55%), radial-gradient(circle at bottom right, rgba(52,211,153,0.18), transparent 55%)",
                  }}
                />
                {/* Soft inner highlight */}
                <div className="pointer-events-none absolute inset-px rounded-[1.1rem] bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50" />

                <div className="relative z-10 h-full p-5 sm:p-7 space-y-5 sm:space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Pulsing online indicator */}
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/25 animate-ping" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.8)]" />
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs text-white/80">
                          Typing into Google Docs…
                        </span>
                        <span className="text-[11px] text-emerald-200/80">
                          Natural pacing enabled
                        </span>
                      </div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-white/60">
                      Live
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-white/70 font-mono leading-relaxed">
                    <p className="truncate">
                      typingisboring is simulating human typing into your doc…
                    </p>
                    <p className="truncate">
                      pauses, bursts, and scroll just like a real person.
                    </p>
                    <p className="truncate">
                      You stay in control of speed and when to stop.
                    </p>

                    {/* Subtle typing animation */}
                    <div className="flex items-center gap-1.5 pt-1 text-[10px] text-emerald-100/80">
                      <span className="status-typing-dot h-1.5 w-1.5 rounded-full bg-emerald-300/80" />
                      <span className="status-typing-dot h-1.5 w-1.5 rounded-full bg-emerald-300/70" />
                      <span className="status-typing-dot h-1.5 w-1.5 rounded-full bg-emerald-300/60" />
                      <span className="pl-1.5 tracking-wide uppercase text-[9px] text-emerald-100/80">
                        Typing in progress
                      </span>
                    </div>
                  </div>

                  <div className="h-px w-full bg-gradient-to-r from-white/0 via-white/25 to-white/0" />

                  <div className="flex items-start justify-between text-[11px] text-white/70 pt-1">
                    <div className="flex flex-col gap-1.5">
                      <span className="uppercase tracking-wide text-[9px] text-white/40">
                        Current job
                      </span>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span className="text-[11px] text-white/85">
                            “Essay draft v3”
                            <span className="ml-1 text-[10px] uppercase tracking-wide text-emerald-200/80">
                              Active
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/70" />
                          <span className="text-[11px] text-white/75">
                            “History notes – wk 5”
                            <span className="ml-1 text-[10px] uppercase tracking-wide text-white/50">
                              Queued
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-200/60" />
                          <span className="text-[11px] text-white/65">
                            “Blog outline – v2”
                            <span className="ml-1 text-[10px] uppercase tracking-wide text-white/40">
                              Paused
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 pl-4">
                      <span className="uppercase tracking-wide text-[9px] text-white/40">
                        ETA
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                          <div className="absolute inset-y-0 left-0 w-2/3 rounded-full bg-emerald-400/80 animate-pulse" />
                        </div>
                        <span className="text-[11px] text-white/75">~6 min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3-step flow - connected to preview, secondary */}
              <div className="w-full max-w-sm lg:max-w-lg pt-5 sm:pt-3 lg:pt-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 border border-white/15 text-white/80 text-xs font-medium">
                      1
                    </div>
                    <p className="text-[11px] text-white/60 text-center leading-tight">Paste your text</p>
                  </div>
                  <div className="text-white/30 text-lg pt-3">→</div>
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 border border-white/15 text-white/80 text-xs font-medium">
                      2
                    </div>
                    <p className="text-[11px] text-white/60 text-center leading-tight">Pick a Google Doc</p>
                  </div>
                  <div className="text-white/30 text-lg pt-3">→</div>
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 border border-white/15 text-white/80 text-xs font-medium">
                      3
                    </div>
                    <p className="text-[11px] text-white/60 text-center leading-tight">Watch it type naturally</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>

        {/* Trust Bar & Urgency Badge */}
        <div className="relative z-10 px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            {/* Urgency Badge */}
            <div className="flex justify-center mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 animate-ping opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
                </span>
                Live access now available
              </span>
            </div>

            {/* Trust Bar - Single cohesive dark pill */}
            <div className="flex flex-wrap items-center justify-center">
              <div className="inline-flex items-center gap-4 sm:gap-6 px-6 py-3 rounded-full bg-black/40 backdrop-blur-md border border-white/5 text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Official Google OAuth</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span>Stripe Secure Payments</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Your data stays private</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <section id="pricing-section" className="relative z-10 px-6 py-32 sm:py-40 mt-16">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white mb-3 sm:mb-4 tracking-tighter">
                Simple, transparent pricing
              </h2>
              <p className="text-white/70 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                Choose the perfect plan for your typing automation needs. All plans include core features.
              </p>
            </div>

            {/* Pricing Cards */}
            <PricingCards highlightPlan="unlimited" />
          </div>
        </section>
      </div>
    </div>
  );
};

// Optional demo wrapper from original prompt
export function DemoOne() {
  return (
    <div className="flex w-full h-screen justify-center items-center">
      <SignInPage />
    </div>
  );
}
