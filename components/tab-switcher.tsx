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
      {/* Tab bar — scrolls horizontally on small screens */}
      <div className="shrink-0 flex gap-1 border-b border-zinc-200 dark:border-zinc-800 px-4 pt-2 overflow-x-auto scrollbar-none">
        {panels.map((panel) => (
          <button
            key={panel.key}
            onClick={() => setActive(panel.key)}
            className={`shrink-0 px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 -mb-px whitespace-nowrap
              ${active === panel.key
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
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
