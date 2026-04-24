import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { DatePicker } from '@teacher-exam/ui'

describe('DatePicker', () => {
  const user = userEvent.setup()

  it('renders placeholder when value is empty', () => {
    render(
      <DatePicker
        value=""
        onChange={vi.fn()}
        placeholder="Pilih tanggal ujian"
      />,
    )
    expect(screen.getByText('Pilih tanggal ujian')).toBeInTheDocument()
  })

  it('renders formatted Indonesian date when value is set', () => {
    render(<DatePicker value="2026-04-23" onChange={vi.fn()} />)
    expect(screen.getByText('23 April 2026')).toBeInTheDocument()
  })

  it('calendar is not visible before clicking trigger', () => {
    render(<DatePicker value="" onChange={vi.fn()} />)
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })

  it('opens calendar popover when trigger is clicked', async () => {
    render(<DatePicker value="" onChange={vi.fn()} />)
    const trigger = screen.getByRole('button')
    await user.click(trigger)
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument()
    })
  })

  it('fires onChange with ISO date string when a day is selected', async () => {
    const onChange = vi.fn()
    render(<DatePicker value="" onChange={onChange} />)
    await user.click(screen.getByRole('button'))
    await waitFor(() => screen.getByRole('grid'))

    const dayButtons = screen.getAllByRole('button', { name: /\d+/ })
    const firstAvailable = dayButtons.find(
      (btn) => !btn.hasAttribute('disabled') && btn.textContent?.trim().match(/^\d+$/),
    )
    if (!firstAvailable) throw new Error('No available day button found')

    await user.click(firstAvailable)
    expect(onChange).toHaveBeenCalledOnce()
    const calledWith = onChange.mock.calls[0]?.[0] as string
    expect(calledWith).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('fires onCommit when popover closes after selection', async () => {
    const onChange = vi.fn()
    const onCommit = vi.fn()
    render(<DatePicker value="" onChange={onChange} onCommit={onCommit} />)
    await user.click(screen.getByRole('button'))
    await waitFor(() => screen.getByRole('grid'))

    const dayButtons = screen.getAllByRole('button', { name: /\d+/ })
    const firstAvailable = dayButtons.find(
      (btn) => !btn.hasAttribute('disabled') && btn.textContent?.trim().match(/^\d+$/),
    )
    if (!firstAvailable) throw new Error('No available day button found')

    await user.click(firstAvailable)
    await waitFor(() => {
      expect(onCommit).toHaveBeenCalledOnce()
    })
    const isoValue = onCommit.mock.calls[0]?.[0] as string
    expect(isoValue).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('closes popover after day selection', async () => {
    const onChange = vi.fn()
    render(<DatePicker value="" onChange={onChange} />)
    await user.click(screen.getByRole('button'))
    await waitFor(() => screen.getByRole('grid'))

    const dayButtons = screen.getAllByRole('button', { name: /\d+/ })
    const firstAvailable = dayButtons.find(
      (btn) => !btn.hasAttribute('disabled') && btn.textContent?.trim().match(/^\d+$/),
    )
    if (!firstAvailable) throw new Error('No available day button found')

    await user.click(firstAvailable)
    await waitFor(() => {
      expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    })
  })

  it('is disabled when disabled prop is true', () => {
    render(<DatePicker value="" onChange={vi.fn()} disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
