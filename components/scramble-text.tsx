'use client'

import { useEffect, useRef, useState } from 'react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)]
}

interface Props {
  text: string
  className?: string
}

export default function ScrambleText({ text, className }: Props) {
  const [display, setDisplay] = useState(text)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Every 2.5s start a quick scramble cycle then resolve back
    function startCycle() {
      let frame = 0
      const totalFrames = 18
      intervalRef.current = setInterval(() => {
        frame++
        if (frame >= totalFrames) {
          setDisplay(text)
          if (intervalRef.current) clearInterval(intervalRef.current)
          // Schedule next cycle
          setTimeout(startCycle, 2000 + Math.random() * 2000)
          return
        }
        // Scramble a random portion of characters, leaving some correct
        const ratio = frame / totalFrames
        setDisplay(
          text
            .split('')
            .map((ch) => {
              if (ch === ' ') return ' '
              return Math.random() > ratio ? randomChar() : ch
            })
            .join('')
        )
      }, 60)
    }

    const timeout = setTimeout(startCycle, 500 + Math.random() * 1500)
    return () => {
      clearTimeout(timeout)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [text])

  return (
    <span className={className} aria-label={text}>
      {display}
    </span>
  )
}
