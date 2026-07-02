// Banned usernames and display name validation
// Uses bad-words library + custom patterns

import { Filter } from 'bad-words'

// Regex patterns for banned usernames (case-insensitive)
const BANNED_PATTERNS = [
  /^admin$/i, /^moderator$/i, /^mod$/i, /^owner$/i, /^founder$/i,
  /^creator$/i, /^root$/i, /^superuser$/i, /^sysadmin$/i, /^system$/i,
  /^nameless$/i, /^pages$/i, /^api$/i, /^http$/i, /^localhost$/i,
  /^staff$/i, /^support$/i, /^help$/i, /^team$/i,
  /^demo$/i, /^test$/i, /^guest$/i, /^anonymous$/i, /^anon$/i,
  /^user\d+$/i, /^test\d+$/i, /^fake\d+$/i, /^[a-z]$/i,
]

// Profanity filter with custom words
const profanityFilter = new Filter({
  placeHolder: '*',
  emptyList: true,
})

// Common profanity to block
profanityFilter.addWords(
  'arse', 'ass', 'asses', 'asshole', 'bastard', 'bitch', 'bitches',
  'bullshit', 'cock', 'cocksucker', 'cunt', 'damn', 'damned',
  'dick', 'dickhead', 'fag', 'faggot', 'fatass', 'fucker',
  'fucking', 'goddamn', 'nigger', 'piss', 'pissed', 'pussy',
  'retard', 'retarded', 'shit', 'shithead', 'slut', 'sluts',
  'twat', 'vagina', 'wank', 'wanker', 'whore', "niga", "niger", "nigga", "nigger"
)

export function validateUsername(username: string): { valid: boolean; reason?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, reason: 'Username is required' }
  }

  const trimmed = username.trim()

  if (trimmed.length < 5) {
    return { valid: false, reason: 'Username must be at least 5 characters' }
  }
  if (trimmed.length > 15) {
    return { valid: false, reason: 'Username must be at most 15 characters' }
  }
  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    return { valid: false, reason: 'Username can only contain lowercase letters, numbers, and underscores' }
  }

  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: 'This username is not allowed' }
    }
  }

  if (profanityFilter.isProfane(trimmed)) {
    return { valid: false, reason: 'Username contains inappropriate language' }
  }

  return { valid: true }
}

export function validateDisplayName(name: string): { valid: boolean; reason?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, reason: 'Display name is required' }
  }

  const trimmed = name.trim()

  if (trimmed.length < 3 || trimmed.length > 15) {
    return { valid: false, reason: 'Display name must be 3-15 characters' }
  }

  if (profanityFilter.isProfane(trimmed)) {
    return { valid: false, reason: 'Display name contains inappropriate language' }
  }

  return { valid: true }
}