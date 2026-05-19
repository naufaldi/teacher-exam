import { describe, expect, it } from 'vitest'
import { mergeValidationStatus } from '../validation-status.js'

describe('mergeValidationStatus', () => {
  it('uses curriculum result when structural status is null', () => {
    expect(
      mergeValidationStatus(
        { status: null, reason: null },
        { status: 'valid', reason: 'Sesuai CP.' },
      ),
    ).toEqual({ validationStatus: 'valid', validationReason: 'Sesuai CP.' })
  })

  it('keeps needs_review when structural flag exists and curriculum is valid', () => {
    expect(
      mergeValidationStatus(
        { status: 'needs_review', reason: 'LaTeX invalid' },
        { status: 'valid', reason: 'Sesuai CP.' },
      ),
    ).toEqual({
      validationStatus: 'needs_review',
      validationReason: 'LaTeX invalid\nSesuai CP.',
    })
  })

  it('prefers invalid over needs_review', () => {
    expect(
      mergeValidationStatus(
        { status: 'needs_review', reason: 'FigureSpec' },
        { status: 'invalid', reason: 'Topik tidak sesuai CP.' },
      ),
    ).toEqual({
      validationStatus: 'invalid',
      validationReason: 'FigureSpec\nTopik tidak sesuai CP.',
    })
  })

  it('deduplicates identical reasons', () => {
    expect(
      mergeValidationStatus(
        { status: 'needs_review', reason: 'Same reason' },
        { status: 'needs_review', reason: 'Same reason' },
      ),
    ).toEqual({
      validationStatus: 'needs_review',
      validationReason: 'Same reason',
    })
  })
})
