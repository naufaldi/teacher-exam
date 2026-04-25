import { describe, test, expect } from 'vitest'
import { questions } from '../questions.js'

describe('questions table schema', () => {
  test('type column exists and has correct config', () => {
    const col = questions.type
    expect(col).toBeDefined()
    // text column with notNull + default 'mcq_single'
    expect((col as any).notNull).toBe(true)
    expect((col as any).default).toBe('mcq_single')
  })

  test('payload column exists and is nullable', () => {
    const col = questions.payload
    expect(col).toBeDefined()
    expect((col as any).notNull).toBeFalsy()
  })

  test('optionA through optionD are nullable', () => {
    expect((questions.optionA as any).notNull).toBeFalsy()
    expect((questions.optionB as any).notNull).toBeFalsy()
    expect((questions.optionC as any).notNull).toBeFalsy()
    expect((questions.optionD as any).notNull).toBeFalsy()
  })

  test('correctAnswer is nullable', () => {
    expect((questions.correctAnswer as any).notNull).toBeFalsy()
  })
})
