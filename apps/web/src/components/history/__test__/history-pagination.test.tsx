import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HistoryPagination } from '../history-pagination.js'

describe('HistoryPagination', () => {
  it('disables the Previous button on page 1', () => {
    render(
      <HistoryPagination
        page={1}
        pageSize={8}
        totalItems={40}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /sebelumnya/i })).toBeDisabled()
  })

  it('disables the Next button on the last page', () => {
    render(
      <HistoryPagination
        page={5}
        pageSize={8}
        totalItems={40}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /berikutnya/i })).toBeDisabled()
  })

  it('enables both Prev and Next on a middle page', () => {
    render(
      <HistoryPagination
        page={2}
        pageSize={8}
        totalItems={40}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /sebelumnya/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /berikutnya/i })).not.toBeDisabled()
  })

  it('calls onPageChange with the previous page number when Prev is clicked', () => {
    const onPageChange = vi.fn()
    render(
      <HistoryPagination
        page={3}
        pageSize={8}
        totalItems={40}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /sebelumnya/i }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange with the next page number when Next is clicked', () => {
    const onPageChange = vi.fn()
    render(
      <HistoryPagination
        page={3}
        pageSize={8}
        totalItems={40}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /berikutnya/i }))
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('calls onPageChange with the clicked page number', () => {
    const onPageChange = vi.fn()
    render(
      <HistoryPagination
        page={1}
        pageSize={8}
        totalItems={40}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageSizeChange with the new size when page-size changes', () => {
    const onPageSizeChange = vi.fn()
    render(
      <HistoryPagination
        page={1}
        pageSize={8}
        totalItems={40}
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
      />,
    )
    // Simulate select change directly on the underlying <select> element
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '16' } })
    expect(onPageSizeChange).toHaveBeenCalledWith(16)
  })

  it('renders only one page when totalItems equals pageSize', () => {
    render(
      <HistoryPagination
        page={1}
        pageSize={8}
        totalItems={8}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '2' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sebelumnya/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /berikutnya/i })).toBeDisabled()
  })

  it('renders correctly when totalItems is 0', () => {
    render(
      <HistoryPagination
        page={1}
        pageSize={8}
        totalItems={0}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /sebelumnya/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /berikutnya/i })).toBeDisabled()
  })
})
