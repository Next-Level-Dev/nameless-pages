'use client'

import { renderMarkup } from './rich-editor'

interface Props {
  body: string
}

export default function PageRenderer({ body }: Props) {
  if (!body.trim()) {
    return (
      <div className="text-zinc-400 italic">This page has no content yet.</div>
    )
  }

  return (
    <div className="text-base leading-relaxed whitespace-pre-wrap">
      {renderMarkup(body)}
    </div>
  )
}
