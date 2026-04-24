import { describe, expect, it } from 'vitest'
import { Schema } from 'effect'
import { UpdateQuestionInputSchema } from '@teacher-exam/shared'

describe('UpdateQuestionInputSchema', () => {
  it('accepts status: pending', () => {
    const result = Schema.decodeUnknownEither(UpdateQuestionInputSchema)({ status: 'pending' })
    expect(result._tag).toBe('Right')
  })

  it('accepts status: accepted', () => {
    const result = Schema.decodeUnknownEither(UpdateQuestionInputSchema)({ status: 'accepted' })
    expect(result._tag).toBe('Right')
  })

  it('accepts status: rejected', () => {
    const result = Schema.decodeUnknownEither(UpdateQuestionInputSchema)({ status: 'rejected' })
    expect(result._tag).toBe('Right')
  })
})

describe('RegenerateQuestionInputSchema', () => {
  it('accepts empty body (no hint)', async () => {
    const { RegenerateQuestionInputSchema } = await import('@teacher-exam/shared')
    const result = Schema.decodeUnknownEither(RegenerateQuestionInputSchema)({})
    expect(result._tag).toBe('Right')
  })

  it('accepts body with hint string', async () => {
    const { RegenerateQuestionInputSchema } = await import('@teacher-exam/shared')
    const result = Schema.decodeUnknownEither(RegenerateQuestionInputSchema)({ hint: 'fokus ke sila ke-3' })
    expect(result._tag).toBe('Right')
    if (result._tag === 'Right') expect(result.right.hint).toBe('fokus ke sila ke-3')
  })

  it('rejects hint that is not a string', async () => {
    const { RegenerateQuestionInputSchema } = await import('@teacher-exam/shared')
    const result = Schema.decodeUnknownEither(RegenerateQuestionInputSchema)({ hint: 42 })
    expect(result._tag).toBe('Left')
  })
})
