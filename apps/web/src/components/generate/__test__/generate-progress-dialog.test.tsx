import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GenerateProgressDialog } from '../generate-progress-dialog'

describe('GenerateProgressDialog', () => {
  it('uses the requested totalSoal in the generated-question counter', () => {
    render(<GenerateProgressDialog open progress={95} totalSoal={30} />)

    expect(screen.getByRole('dialog')).toHaveTextContent(/Soal\s+30\s+\/\s+30 dibuat/)
  })
})
