"use client"

import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { formatDuration } from "@/lib/utils"

interface TimeSelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

export function TimeSelector({
  value,
  onChange,
  min = 10,
  max = 360,
}: TimeSelectorProps) {
  const handleValueChange = (values: number[]) => {
    onChange(values[0])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="duration-slider">Duration</Label>
        <span className="text-sm font-medium text-muted-foreground">
          Approximately {formatDuration(value)} minutes
        </span>
      </div>
      <Slider
        id="duration-slider"
        value={[value]}
        onValueChange={handleValueChange}
        min={min}
        max={max}
        step={5}
        className="w-full"
        aria-label="Select duration"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatDuration(min)}</span>
        <span>{formatDuration(max)}</span>
      </div>
    </div>
  )
}


