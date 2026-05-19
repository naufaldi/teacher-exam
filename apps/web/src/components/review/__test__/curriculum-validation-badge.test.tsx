import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TooltipProvider } from '@teacher-exam/ui'
import { CurriculumValidationBadge, needsCurriculumReview } from '../curriculum-validation-badge.js'

describe('CurriculumValidationBadge', () => {
  it('renders valid badge with Radix tooltip showing reason', async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <CurriculumValidationBadge status="valid" reason="Sesuai CP." />
      </TooltipProvider>,
    )
    expect(screen.getByTestId('curriculum-badge-valid')).toHaveTextContent('Sesuai')

    await user.hover(screen.getByTestId('curriculum-badge-valid'))
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Sesuai CP.')
  })

  it('renders needs_review and invalid variants', () => {
    render(
      <TooltipProvider>
        <CurriculumValidationBadge status="needs_review" reason="Minor issue" />
      </TooltipProvider>,
    )
    expect(screen.getByTestId('curriculum-badge-needs_review')).toHaveTextContent('Perlu review')

    render(
      <TooltipProvider>
        <CurriculumValidationBadge status="invalid" reason="Off topic" compact />
      </TooltipProvider>,
    )
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
