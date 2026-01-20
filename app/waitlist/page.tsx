import type { Metadata } from "next"
import { WaitlistExperience } from "@/components/ui/waitlist-landing-page-with-countdown-timer"

export const metadata: Metadata = {
  title: "Join the Waitlist - Typing Is Boring",
  description:
    "Get early access to Typing Is Boring - the next generation typing automation platform. Join the waitlist to be notified when we launch.",
  robots: {
    index: true,
    follow: true,
  },
}

export default function WaitlistPage() {
  return <WaitlistExperience />
}
