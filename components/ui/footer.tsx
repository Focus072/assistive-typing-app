"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

export function Footer() {
	const currentYear = new Date().getFullYear()

	const footerLinks = {
		Product: [
			{ label: "Pricing", href: "#pricing" },
			{ label: "Features", href: "#features" },
		],
		Company: [
			{ label: "About", href: "#about" },
			{ label: "Trust", href: "#trust" },
		],
		Legal: [
			{ label: "Privacy Policy", href: "/privacy" },
			{ label: "Terms of Service", href: "/terms" },
		],
	}

	return (
		<footer className="border-t py-12 px-4">
			<div className="mx-auto max-w-5xl">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
					<div className="col-span-2 md:col-span-1">
						<div className="mb-4">
							<h3 className="text-lg font-semibold mb-2">Typing Is Boring</h3>
							<p className="text-sm text-muted-foreground">
								Natural typing automation for Google Docs.
							</p>
						</div>
					</div>
					{Object.entries(footerLinks).map(([category, links]) => (
						<div key={category}>
							<h4 className="text-sm font-semibold mb-4">{category}</h4>
							<ul className="space-y-2">
								{links.map((link) => (
									<li key={link.label}>
										<Link
											href={link.href}
											className={cn(
												"text-sm text-muted-foreground hover:text-foreground transition-colors",
												link.href.startsWith("#") && "cursor-pointer"
											)}
											onClick={(e) => {
												if (link.href.startsWith("#")) {
													e.preventDefault()
													const element = document.getElementById(link.href.slice(1))
													if (element) {
														element.scrollIntoView({ behavior: "smooth", block: "start" })
													}
												}
											}}
										>
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
				<div className="pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
					<p className="text-sm text-muted-foreground">
						© {currentYear} Typing Is Boring. All rights reserved.
					</p>
					<div className="flex items-center gap-4 text-sm text-muted-foreground">
						<Link href="/privacy" className="hover:text-foreground transition-colors">
							Privacy
						</Link>
						<span>·</span>
						<Link href="/terms" className="hover:text-foreground transition-colors">
							Terms
						</Link>
					</div>
				</div>
			</div>
		</footer>
	)
}
