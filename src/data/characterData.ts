/**
 * Character data and utilities for character clustering and role analysis.
 * Extracted from CharacterClusterViz for reusability across components.
 */

export type Category = 'vowel' | 'common_consonant' | 'rare' | 'boundary' | 'other'

/**
 * The vocabulary: space + a-z (27 characters total)
 */
export const VOCAB = [
  ' ',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
]

/**
 * Character category sets for classification
 */
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])
const COMMON_CONSONANTS = new Set(['t', 'n', 's', 'r', 'h', 'l'])
const RARE = new Set(['q', 'x', 'z', 'j'])

/**
 * Color and label configuration for each character category
 */
export const CATEGORY_COLORS: Record<Category, { fill: string; label: string }> = {
  vowel: { fill: '#4ecdc4', label: 'Vowels' },
  common_consonant: { fill: '#ffe66d', label: 'Common consonants' },
  rare: { fill: '#ff6b6b', label: 'Rare' },
  boundary: { fill: '#a855f7', label: 'Boundary (space)' },
  other: { fill: '#6b7280', label: 'Other' },
}

/**
 * Get the category for a given character
 */
export function getCharCategory(char: string): Category {
  if (char === ' ') return 'boundary'
  if (VOWELS.has(char)) return 'vowel'
  if (RARE.has(char)) return 'rare'
  if (COMMON_CONSONANTS.has(char)) return 'common_consonant'
  return 'other'
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const denom = norm2(a) * norm2(b)
  if (denom === 0) return 0
  return dot(a, b) / denom
}

/**
 * Vector utilities
 */
function dot(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

function norm2(v: number[]): number {
  return Math.sqrt(dot(v, v))
}

/**
 * Format a character for display (space becomes ␣)
 */
export function prettyChar(c: string): string {
  return c === ' ' ? '␣' : c
}
