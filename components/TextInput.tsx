"use client"

interface TextInputProps {
  value: string
  onChange: (value: string) => void
  maxChars?: number
}

export function TextInput({ value, onChange, maxChars = 50000 }: TextInputProps) {
  const charCount = value.length
  const isNearLimit = charCount > maxChars * 0.9
  const percentage = (charCount / maxChars) * 100

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= maxChars) {
      onChange(newValue)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor="text-input" className="text-sm font-medium text-black flex items-center gap-2">
          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Text to Type
        </label>
        <div className="flex items-center gap-3">
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                isNearLimit ? 'bg-red-500' : 'bg-black'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <span className={`text-xs font-mono ${isNearLimit ? "text-red-600" : "text-gray-600"}`}>
            {charCount.toLocaleString()}
          </span>
        </div>
      </div>
      
      <div className="relative group">
        <textarea
          id="text-input"
          value={value}
          onChange={handleChange}
          placeholder="Paste or type the text you want to be typed into Google Docs..."
          className="w-full min-h-[150px] md:min-h-[180px] px-3 md:px-4 py-2 md:py-3 rounded-lg bg-white border border-black text-black placeholder:text-gray-400 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all touch-manipulation"
          aria-label="Text to type into Google Docs"
          aria-describedby="char-count"
          tabIndex={0}
        />
      </div>
      
      <p id="char-count" className="sr-only">
        {charCount} characters entered
      </p>
    </div>
  )
}
