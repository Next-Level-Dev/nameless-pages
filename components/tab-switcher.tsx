'use client'

import { useState } from 'react'

interface Panel {
  key: string
  label: string
  content: React.ReactNode
}

interface Props {
  panels: Panel[]
  defaultTab?: string
}

export default function TabSwitcher({ panels, defaultTab }: Props) {
  const [active, setActive] = useState(defaultTab ?? panels[0]?.key ?? '')

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar — centered floating pills, no underline */}
      <div className="shrink-0 flex justify-center gap-1 px-4 py-3 overflow-x-auto scrollbar-none">
        {panels.map((panel) => (
          <button
            key={panel.key}
            onClick={() => setActive(panel.key)}
            className={`shrink-0 px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-150 whitespace-nowrap
              ${active === panel.key
                ? 'bg-zinc-800 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900'
                : 'text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700/60 dark:hover:text-zinc-200'
              }`}
          >
            {panel.label}
          </button>
        ))}
      </div>

      {/* Panels — all rendered, visibility toggled via CSS to preserve server content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {panels.map((panel) => (
          <div key={panel.key} className={active === panel.key ? 'block' : 'hidden'}>
            {panel.content}
          </div>
        ))}
      </div>
    </div>
  )
}
