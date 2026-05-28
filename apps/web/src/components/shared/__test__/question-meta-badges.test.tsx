import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { QuestionMetaBadges } from '../question-meta-badges.js'

describe('QuestionMetaBadges', () => {
  it('renders subject badge with subject-ipas variant for IPAS', () => {
    render(
      <QuestionMetaBadges
        subject="ipas"
        grade={5}
        difficulty="mudah"
        isPublic
      />,
    )

    const subjectBadge = screen.getByText('IPAS')
    expect(subjectBadge.className).toMatch(/subject-ipas/)
    expect(screen.getByText('Kelas 5')).toBeInTheDocument()
    expect(screen.getByText('mudah')).toBeInTheDocument()
    expect(screen.getByText(/Publik/i)).toBeInTheDocument()
  })

  it('renders Pribadi badge when not public', () => {
    render(
      <QuestionMetaBadges
        subject="ipas"
        grade={5}
        difficulty="sedang"
        isPublic={false}
      />,
    )

    expect(screen.getByText(/Pribadi/i)).toBeInTheDocument()
  })

  it('renders topic caption when topics provided', () => {
    render(
      <QuestionMetaBadges
        subject="ipas"
        grade={5}
        difficulty="mudah"
        isPublic
        topics={['Energi', 'Panas']}
        showTopicCaption
      />,
    )

    expect(screen.getByText('Topik: Energi, Panas')).toBeInTheDocument()
  })
})
