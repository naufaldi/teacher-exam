import { describe, it, expect } from 'vitest'
import { formatTopicsDisplay } from '../mini-paper-preview.js'

describe('formatTopicsDisplay', () => {
  it('shows a single topic as-is', () => {
    expect(formatTopicsDisplay(['Matematika'])).toBe('Matematika')
  })

  it('shows two topics joined with middle dot', () => {
    expect(formatTopicsDisplay(['Topic1', 'Topic2'])).toBe('Topic1 · Topic2')
  })

  it('shows first 2 topics then +N for 3 topics', () => {
    expect(formatTopicsDisplay(['Topic1', 'Topic2', 'Topic3'])).toBe('Topic1 · Topic2 +1')
  })

  it('shows first 2 topics then +N for 5 topics', () => {
    expect(formatTopicsDisplay(['Topic1', 'Topic2', 'Topic3', 'Topic4', 'Topic5'])).toBe(
      'Topic1 · Topic2 +3',
    )
  })
})
