'use client'

import { useRef, useState, KeyboardEvent } from 'react'
import ScrambleText from './scramble-text'

// ─── Markup format ───────────────────────────────────────────────────────────
// **bold**          — must open and close on the same line
// _italic_          — must open and close on the same line
// [color:NAME]text[/color]   — same line only
// [scramble]text[/scramble]  — same line only
// \* \_ \\          — escape: displays the literal character, hides the backslash
// Tab key / ⇥ button inserts 4 spaces
// ─────────────────────────────────────────────────────────────────────────────

const COLORS: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  white: '#f4f4f5',
}
const COLOR_NAMES = Object.keys(COLORS)

// Tag lengths (so we never get the off-by-one again)
const TAG = {
  scrambleOpen:  '[scramble]',   // 10
  scrambleClose: '[/scramble]',  // 11
  colorClose:    '[/color]',     //  8
}

interface Props {
  value: string
  onChange: (v: string) => void
}

// ─── Preview renderer ─────────────────────────────────────────────────────────
// Rules:
//  • Formatting tags only match within a single line (no \n between open/close)
//  • \X escape: backslash before a special char shows the char, hides the backslash
export function renderMarkup(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let i = 0
  let key = 0

  function peek(tag: string) {
    return text.startsWith(tag, i)
  }

  // Find closing tag but only if there is no newline between pos and the tag
  function findClose(closeTag: string, from: number): number {
    const pos = text.indexOf(closeTag, from)
    if (pos === -1) return -1
    // Reject if a newline sits between `from` and the closing tag
    const between = text.slice(from, pos)
    if (between.includes('\n')) return -1
    return pos
  }

  while (i < text.length) {

    // Backslash escape: \* \_ \\ \[ — show next char literally, skip backslash
    if (text[i] === '\\' && i + 1 < text.length) {
      const next = text[i + 1]
      if (next === '*' || next === '_' || next === '\\' || next === '[') {
        nodes.push(<span key={key++}>{next}</span>)
        i += 2
        continue
      }
    }

    // [scramble]...[/scramble]  — same line only
    if (peek(TAG.scrambleOpen)) {
      const openEnd = i + TAG.scrambleOpen.length   // first char of inner text
      const close = findClose(TAG.scrambleClose, openEnd)
      if (close !== -1) {
        const inner = text.slice(openEnd, close)
        nodes.push(<ScrambleText key={key++} text={inner} />)
        i = close + TAG.scrambleClose.length
        continue
      }
    }

    // [color:NAME]...[/color]  — same line only
    const colorMatch = text.slice(i).match(/^\[color:([a-z]+)\]/)
    if (colorMatch) {
      const colorName = colorMatch[1]
      const openEnd = i + colorMatch[0].length
      const close = findClose(TAG.colorClose, openEnd)
      if (close !== -1) {
        const inner = text.slice(openEnd, close)
        const css = COLORS[colorName] ?? '#f4f4f5'
        nodes.push(
          <span key={key++} style={{ color: css }}>
            {inner}
          </span>
        )
        i = close + TAG.colorClose.length
        continue
      }
    }

    // **bold**  — same line only
    if (peek('**')) {
      const openEnd = i + 2
      const close = findClose('**', openEnd)
      if (close !== -1) {
        const inner = text.slice(openEnd, close)
        nodes.push(<strong key={key++}>{inner}</strong>)
        i = close + 2
        continue
      }
    }

    // _italic_  — same line only
    if (text[i] === '_') {
      const openEnd = i + 1
      const close = findClose('_', openEnd)
      if (close !== -1) {
        const inner = text.slice(openEnd, close)
        nodes.push(<em key={key++}>{inner}</em>)
        i = close + 1
        continue
      }
    }

    // Newline → <br>
    if (text[i] === '\n') {
      nodes.push(<br key={key++} />)
      i++
      continue
    }

    // Plain text — accumulate until we hit something special
    let j = i + 1
    while (j < text.length) {
      const c = text[j]
      if (
        c === '\n' ||
        c === '\\' ||
        c === '_' ||
        (c === '*' && text[j + 1] === '*') ||
        text.startsWith('[scramble]', j) ||
        text.startsWith('[color:', j)
      ) break
      j++
    }
    nodes.push(<span key={key++}>{text.slice(i, j)}</span>)
    i = j
  }

  return nodes
}

// ─── Editor toolbar helpers ──────────────────────────────────────────────────
function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  onChange: (v: string) => void
) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const selected = value.slice(start, end) || 'text'
  const newValue =
    value.slice(0, start) + before + selected + after + value.slice(end)
  onChange(newValue)
  requestAnimationFrame(() => {
    textarea.focus()
    textarea.setSelectionRange(start + before.length, start + before.length + selected.length)
  })
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function RichEditor({ value, onChange }: Props) {
  const [mode, setMode] = useState<'editor' | 'preview'>('editor')
  const [colorOpen, setColorOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function wrap(before: string, after: string) {
    if (!textareaRef.current) return
    wrapSelection(textareaRef.current, before, after, onChange)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = textareaRef.current!
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newValue = value.slice(0, start) + '    ' + value.slice(end)
      onChange(newValue)
      requestAnimationFrame(() => {
        ta.focus()
        ta.setSelectionRange(start + 4, start + 4)
      })
    }
  }

  const toolbarBtn =
    'px-2.5 py-1.5 text-xs font-medium rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors select-none'

  return (
    <div className="flex flex-col gap-0 rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-700">

        {/* Editor / Preview toggle */}
        <div className="flex rounded-md overflow-hidden border border-zinc-300 dark:border-zinc-600 mr-2">
          <button
            type="button"
            onClick={() => setMode('editor')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'editor'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-zinc-300 dark:border-zinc-600 ${
              mode === 'preview'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            Preview
          </button>
        </div>

        {mode === 'editor' && (
          <>
            <button
              type="button"
              className={toolbarBtn}
              onClick={() => wrap('**', '**')}
              title="Bold — wraps selection in **"
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              className={`${toolbarBtn} italic`}
              onClick={() => wrap('_', '_')}
              title="Italic — wraps selection in _"
            >
              I
            </button>
            <button
              type="button"
              className={toolbarBtn}
              onClick={() => {
                const ta = textareaRef.current
                if (!ta) return
                const start = ta.selectionStart
                const newValue = value.slice(0, start) + '    ' + value.slice(ta.selectionEnd)
                onChange(newValue)
                requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + 4, start + 4) })
              }}
              title="Insert 4 spaces"
            >
              ⇥ Tab
            </button>

            {/* Color picker */}
            <div className="relative">
              <button
                type="button"
                className={toolbarBtn}
                onClick={() => setColorOpen((o) => !o)}
                title="Color"
              >
                🎨 Color
              </button>
              {colorOpen && (
                <div className="absolute top-full left-0 mt-1 z-20 flex flex-wrap gap-1 p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg w-48">
                  {COLOR_NAMES.map((name) => (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      className="w-7 h-7 rounded-full border-2 border-zinc-200 dark:border-zinc-700 hover:scale-110 transition-transform"
                      style={{ backgroundColor: COLORS[name] }}
                      onClick={() => {
                        wrap(`[color:${name}]`, '[/color]')
                        setColorOpen(false)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Scramble */}
            <button
              type="button"
              className={toolbarBtn}
              onClick={() => wrap('[scramble]', '[/scramble]')}
              title="Scramble effect"
            >
              ∿ Scramble
            </button>

            {/* Escape hint */}
            <span className="text-xs text-zinc-400 ml-1 hidden sm:inline">
              Use <code className="font-mono">\</code> before * _ [ to show them literally
            </span>
          </>
        )}
      </div>

      {/* Editor / Preview area */}
      {mode === 'editor' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck
          placeholder="Start writing…"
          className="flex-1 min-h-[400px] w-full px-4 py-3 text-sm font-mono bg-white dark:bg-zinc-950 focus:outline-none resize-y"
        />
      ) : (
        <div className="min-h-[400px] px-4 py-3 text-sm leading-relaxed bg-white dark:bg-zinc-950 whitespace-pre-wrap">
          {value.trim() ? (
            renderMarkup(value)
          ) : (
            <span className="text-zinc-400">Nothing to preview yet.</span>
          )}
        </div>
      )}
    </div>
  )
}
