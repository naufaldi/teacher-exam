import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CurriculumValidationBadge, needsCurriculumReview } from '../curriculum-validation-badge.js'

describe('CurriculumValidationBadge', () => {
  it('renders valid badge with reason tooltip', () => {
    render(<CurriculumValidationBadge status="valid" reason="Sesuai CP." />)
    expect(screen.getByTestId('curriculum-badge-valid')).toHaveTextContent('Sesuai')
    expect(screen.getByTitle('Sesuai CP.')).toBeInTheDocument()
  })

  it('renders needs_review and invalid variants', () => {
    render(<CurriculumValidationBadge status="needs_review" reason="Minor issue" />)
    expect(screen.getByTestId('curriculum-badge-needs_review')).toHaveTextContent('Perlu review')

    render(<CurriculumValidationBadge status="invalid" reason="Off topic" compact />)
    expect(screen.getByTestId('curriculum-badge-invalid')).toHaveTextContent('Tidak')
  })
})

describe('needsCurriculumReview', () => {
  it('flags needs_review and invalid only', () => {
    expect(needsCurriculumReview('needs_review')).toBe(true)
    expect(needsCurriculumReview('invalid')).toBe(true)
    expect(needsCurriculumReview('valid')).toBe(false)
    expect(needsCurriculumReview(null)).toBe(false)
  })
})
