"use client"

interface Template {
  id: string
  name: string
  description: string
  textLength: number
  durationMinutes: number
  profile: "steady" | "fatigue" | "burst" | "micropause"
  icon: React.ReactNode
}

interface JobTemplatesProps {
  onSelect: (template: Template) => void
}

const templates: Template[] = [
  {
    id: "quick-note",
    name: "Quick Note",
    description: "Perfect for short messages",
    textLength: 500,
    durationMinutes: 5,
    profile: "steady",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    id: "essay",
    name: "Essay",
    description: "Standard essay length",
    textLength: 5000,
    durationMinutes: 60,
    profile: "steady",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: "novel-chapter",
    name: "Novel Chapter",
    description: "Long-form writing",
    textLength: 10000,
    durationMinutes: 180,
    profile: "fatigue",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    id: "blog-post",
    name: "Blog Post",
    description: "Medium-length article",
    textLength: 3000,
    durationMinutes: 45,
    profile: "micropause",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
  },
]

export function JobTemplates({ onSelect }: JobTemplatesProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-black flex items-center gap-2">
        <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
        </svg>
        Quick Templates
      </label>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className="p-3 md:p-4 rounded-lg bg-white border border-black hover:bg-gray-50 transition-all text-left group"
          >
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-black flex items-center justify-center mb-2 group-hover:bg-gray-900 transition-colors text-white">
              {template.icon}
            </div>
            <div className="font-medium text-black text-sm md:text-base mb-1">{template.name}</div>
            <div className="text-xs text-gray-600 mb-2">{template.description}</div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>~{(template.textLength / 1000).toFixed(1)}K chars</span>
              <span>•</span>
              <span>{template.durationMinutes} min</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

