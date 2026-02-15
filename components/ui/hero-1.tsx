"use client"

import { useState } from "react";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, Loader2 } from "lucide-react";

export function HeroSection() {
	const [isLoading, setIsLoading] = useState(false);

	return (
		<section className="mx-auto w-full max-w-5xl">
			{/* Top Shades */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 isolate hidden overflow-hidden contain-strict lg:block"
			>
				<div className="absolute inset-0 -top-14 isolate -z-10 bg-[radial-gradient(35%_80%_at_49%_0%,--theme(--color-foreground/.08),transparent)] contain-strict" />
			</div>

			{/* X Bold Faded Borders */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 mx-auto hidden min-h-screen w-full max-w-5xl lg:block"
			>
				<div className="mask-y-from-80% mask-y-to-100% absolute inset-y-0 left-0 z-10 h-full w-px bg-foreground/15" />
				<div className="mask-y-from-80% mask-y-to-100% absolute inset-y-0 right-0 z-10 h-full w-px bg-foreground/15" />
			</div>

			{/* main content */}

			<div className="relative flex flex-col items-center justify-center gap-5 pt-32 pb-30">
				{/* X Content Faded Borders */}
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 -z-1 size-full overflow-hidden"
				>
					<div className="absolute inset-y-0 left-4 w-px bg-linear-to-b from-transparent via-border to-border md:left-8" />
					<div className="absolute inset-y-0 right-4 w-px bg-linear-to-b from-transparent via-border to-border md:right-8" />
					<div className="absolute inset-y-0 left-8 w-px bg-linear-to-b from-transparent via-border/50 to-border/50 md:left-12" />
					<div className="absolute inset-y-0 right-8 w-px bg-linear-to-b from-transparent via-border/50 to-border/50 md:right-12" />
				</div>

				<h1
					className={cn(
						"fade-in slide-in-from-bottom-10 animate-in text-balance fill-mode-backwards text-center text-4xl tracking-tight delay-100 duration-500 ease-out md:text-5xl lg:text-6xl",
						"text-shadow-[0_0px_50px_theme(--color-foreground/.2)]"
					)}
				>
					Typing Is Boring. <br /> Make long docs feel effortless.
				</h1>

				<p className="fade-in slide-in-from-bottom-10 mx-auto max-w-md animate-in fill-mode-backwards text-center text-base text-foreground/80 tracking-wider delay-200 duration-500 ease-out sm:text-lg md:text-xl">
					Paste your text, pick a Google Doc, and watch it type itself with human-like rhythm — pauses, bursts, and everything in between.
				</p>

				<div className="fade-in slide-in-from-bottom-10 flex animate-in flex-row flex-wrap items-center justify-center gap-3 fill-mode-backwards pt-2 delay-300 duration-500 ease-out">
					<Button
						className="rounded-full cursor-pointer"
						size="lg"
						onClick={() => {
							if (isLoading) return;
							setIsLoading(true);
							signIn("google", { callbackUrl: "/" });
						}}
						disabled={isLoading}
					>
						{isLoading ? (
							<>
								<Loader2 className="size-4 animate-spin me-2" />
								Loading...
							</>
						) : (
							<>
								Get Started{" "}
								<ArrowRightIcon className="size-4 ms-2" data-icon="inline-end" />
							</>
						)}
					</Button>
				</div>
			</div>
		</section>
	);
}

export function ProofBar() {
	return (
		<section className="relative space-y-4 border-t pt-6 pb-10">
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
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
						<span>2,800+ Active Users</span>
					</div>
				</div>
			</div>
		</section>
	);
}

export function FeaturesSection() {
	return (
		<section id="features" className="relative space-y-8 py-16 px-4">
			<div className="mx-auto max-w-5xl">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					<div className="text-center">
						<div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
							<svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
						</div>
						<h3 className="text-lg font-semibold mb-2">Human-Like Rhythm</h3>
						<p className="text-sm text-muted-foreground">
							Simulate natural pacing, including realistic pauses and typing bursts.
						</p>
					</div>
					<div className="text-center">
						<div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
							<svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
						</div>
						<h3 className="text-lg font-semibold mb-2">Google Docs Native</h3>
						<p className="text-sm text-muted-foreground">
							No extensions needed. We type directly into your Google account via official APIs.
						</p>
					</div>
					<div className="text-center">
						<div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
							<svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
							</svg>
						</div>
						<h3 className="text-lg font-semibold mb-2">Total Control</h3>
						<p className="text-sm text-muted-foreground">
							Adjust speed, fatigue levels, and pacing to match your specific voice.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}

export function TrustSection() {
	return (
		<section id="trust" className="relative space-y-8 py-16 px-4">
			<div className="mx-auto max-w-5xl">
				<div className="text-center mb-12">
					<h2 className="text-3xl sm:text-4xl font-semibold mb-3 tracking-tight">
						Why you can trust us
					</h2>
					<p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
						Your data and documents are protected with industry-standard security and privacy practices.
					</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					<div className="text-center">
						<div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
							<svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
							</svg>
						</div>
						<h3 className="text-lg font-semibold mb-2">Official Google OAuth</h3>
						<p className="text-sm text-muted-foreground">
							We use Google's official OAuth system. Your credentials are never stored or shared.
						</p>
					</div>
					<div className="text-center">
						<div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
							<svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
							</svg>
						</div>
						<h3 className="text-lg font-semibold mb-2">Stripe Secure Payments</h3>
						<p className="text-sm text-muted-foreground">
							All payments are processed securely through Stripe. We never see your payment details.
						</p>
					</div>
					<div className="text-center">
						<div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
							<svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
							</svg>
						</div>
						<h3 className="text-lg font-semibold mb-2">Your Data Stays Private</h3>
						<p className="text-sm text-muted-foreground">
							We never read or store your Google Docs content. We only type the text you provide.
						</p>
					</div>
				</div>
				{/* Thin gray separator matching header (1px, same tone) */}
				<div className="h-px w-full shrink-0 bg-gray-200/90 mt-8" aria-hidden="true" />
			</div>
		</section>
	);
}

export function AboutSection() {
	return (
		<section id="about" className="relative space-y-8 py-16 px-4">
			<div className="mx-auto max-w-5xl">
				<div className="text-center mb-12">
					<h2 className="text-3xl sm:text-4xl font-semibold mb-3 tracking-tight">
						About Typing Is Boring
					</h2>
					<p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
						We're on a mission to make document creation effortless by automating the tedious parts of typing.
					</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					<div className="space-y-4">
						<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
							<svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
						</div>
						<h3 className="text-xl font-semibold mb-2">Our Mission</h3>
						<p className="text-sm text-muted-foreground leading-relaxed">
							Typing Is Boring was born from a simple idea: long documents shouldn't require hours of manual typing. 
							We've built a tool that automates typing into Google Docs with natural, human-like rhythm, so you can 
							focus on what matters—your content, not the mechanics of typing it.
						</p>
					</div>
					<div className="space-y-4">
						<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
							<svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
							</svg>
						</div>
						<h3 className="text-xl font-semibold mb-2">What We Do</h3>
						<p className="text-sm text-muted-foreground leading-relaxed">
							Using Google's official APIs, we type directly into your documents with realistic pacing, pauses, 
							and bursts. No browser extensions, no copy-paste workarounds—just seamless, natural typing automation 
							that respects your voice and style.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
