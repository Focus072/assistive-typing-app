"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TypingProfile } from "@/types"

interface TypingProfileSelectorProps {
  value: TypingProfile
  onChange: (value: TypingProfile) => void
}

const profiles: { value: TypingProfile; label: string; description: string }[] = [
  {
    value: "steady",
    label: "Steady",
    description: "Uniform pace with slight variation",
  },
  {
    value: "fatigue",
    label: "Fatigue Mode",
    description: "Slows over time (for longer sessions)",
  },
  {
    value: "burst",
    label: "Burst Mode",
    description: "Short fast sessions with longer pauses",
  },
  {
    value: "micropause",
    label: "Micro-pause Mode",
    description: "Frequent tiny breaks",
  },
]

export function TypingProfileSelector({
  value,
  onChange,
}: TypingProfileSelectorProps) {
  const selectedProfile = profiles.find((p) => p.value === value)

  return (
    <div className="space-y-2">
      <Label htmlFor="typing-profile">Typing Profile</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="typing-profile" aria-label="Select typing profile">
          <SelectValue>
            {selectedProfile?.label} - {selectedProfile?.description}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {profiles.map((profile) => (
            <SelectItem key={profile.value} value={profile.value}>
              <div>
                <div className="font-medium">{profile.label}</div>
                <div className="text-xs text-muted-foreground">
                  {profile.description}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}


