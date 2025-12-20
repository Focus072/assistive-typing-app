"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { HomeNavbar } from "@/components/ui/sign-in-flow-auth";

// Lazy getter for DynamicShader to prevent module-level evaluation
// This function is only called when DotMatrix component mounts, not during module initialization
const getDynamicShader = () => {
  // #region agent log
  if (process.env.NODE_ENV === "development") {
    fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sign-in-flow-1.tsx:13',message:'getDynamicShader called - creating dynamic import',data:{timestamp:Date.now(),typeofWindow:typeof window},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
  }
  // #endregion
  return dynamic(
    () => {
      // #region agent log
      if (process.env.NODE_ENV === "development") {
        fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sign-in-flow-1.tsx:14',message:'Dynamic import factory function called',data:{timestamp:Date.now(),typeofWindow:typeof window},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
      }
      // #endregion
      return import("./CanvasShader").then((mod) => {
        // #region agent log
        if (process.env.NODE_ENV === "development") {
          fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sign-in-flow-1.tsx:15',message:'CanvasShader module imported successfully',data:{timestamp:Date.now(),hasShader:!!mod.Shader},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
        }
        // #endregion
        return { default: mod.Shader };
      }).catch((err) => {
        // #region agent log
        if (process.env.NODE_ENV === "development") {
          fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sign-in-flow-1.tsx:16',message:'CanvasShader import failed',data:{timestamp:Date.now(),error:err?.message,errorStack:err?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
        }
        // #endregion
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
        <HomeNavbar />

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
                      onClick={handleGoogleSignIn}
                      className="backdrop-blur-[2px] inline-flex items-center justify-center gap-2 w-full sm:w-auto sm:max-w-[240px] bg-white text-black rounded-full py-3 px-6 text-sm font-medium hover:bg-white/90 transition-colors"
                    >
                      <span className="text-lg">G</span>
                      <span>Sign in with Google</span>
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
