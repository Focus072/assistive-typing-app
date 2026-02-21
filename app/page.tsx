import type { Metadata } from "next"
import { HeroSection, FeaturesSection, TrustSection, AboutSection } from "@/components/ui/hero-1"
import { Header } from "@/components/ui/header-1"
import { PricingCards } from "@/components/ui/pricing-cards"
import { Footer } from "@/components/ui/footer"
import { AnnouncementsSection } from "@/components/ui/announcements-section"

export const metadata: Metadata = {
  title: "Typing Is Boring - Natural Typing for Google Docs",
  description:
    "Automate typing in Google Docs with natural human-like rhythm. Paste your text, pick a Google Doc, and watch it type itself with pauses, bursts, and realistic delays.",
  robots: {
    index: true,
    follow: true,
  },
}

export default function HomePage() {
  return (
    <div className="flex w-full flex-col">
      <Header />
      <main className="grow">
        <HeroSection />
        <FeaturesSection />
        <TrustSection />
        <AboutSection />
        <AnnouncementsSection />
        <section id="pricing" className="px-6 py-32 sm:py-40">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground mb-3 sm:mb-4 tracking-tighter">
                Simple, transparent pricing
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                Choose the perfect plan for your typing automation needs. All plans include core features.
              </p>
            </div>
            <PricingCards highlightPlan="unlimited" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
