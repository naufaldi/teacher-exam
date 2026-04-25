import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopicMultiSelect } from '../topic-multi-select'

const OPTIONS = ['Teks Narasi', 'Puisi', 'Kosakata', 'Gaya Bahasa', 'Cerpen'] as const

describe('TopicMultiSelect', () => {
  it('shows placeholder when nothing selected', () => {
    render(
      <TopicMultiSelect options={OPTIONS} selected={[]} onChange={vi.fn()} />,
    )
    expect(screen.getByText('Pilih topik...')).toBeInTheDocument()
  })

  it('shows selected topics as pills', () => {
    render(
      <TopicMultiSelect options={OPTIONS} selected={['Puisi', 'Kosakata']} onChange={vi.fn()} />,
    )
    expect(screen.getByText('Puisi')).toBeInTheDocument()
    expect(screen.getByText('Kosakata')).toBeInTheDocument()
  })

  it('calls onChange with item removed when pill × clicked', () => {
    const onChange = vi.fn()
    render(
      <TopicMultiSelect options={OPTIONS} selected={['Puisi', 'Kosakata']} onChange={onChange} />,
    )
    fireEvent.click(screen.getByLabelText('Hapus topik: Puisi'))
    expect(onChange).toHaveBeenCalledWith(['Kosakata'])
  })

  it('calls onChange with item added when option clicked', () => {
    const onChange = vi.fn()
    const { getByRole } = render(
      <TopicMultiSelect options={OPTIONS} selected={['Puisi']} onChange={onChange} />,
    )
    // Open popover
    fireEvent.click(getByRole('combobox'))
    fireEvent.click(screen.getByText('Teks Narasi'))
    expect(onChange).toHaveBeenCalledWith(['Puisi', 'Teks Narasi'])
  })

  it('does not call onChange when clicking disabled option at maxItems', () => {
    const onChange = vi.fn()
    const { getByRole } = render(
      <TopicMultiSelect
        options={OPTIONS}
        selected={['Puisi', 'Kosakata']}
        onChange={onChange}
        maxItems={2}
      />,
    )
    fireEvent.click(getByRole('combobox'))
    fireEvent.click(screen.getByText('Teks Narasi'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows max notice when at maxItems', () => {
    const { getByRole } = render(
      <TopicMultiSelect
        options={OPTIONS}
        selected={['Puisi', 'Kosakata']}
        onChange={vi.fn()}
        maxItems={2}
      />,
    )
    fireEvent.click(getByRole('combobox'))
    expect(screen.getByText('Maksimal 2 topik dipilih.')).toBeInTheDocument()
  })

  it('calls onCustom and closes popover when custom option clicked', () => {
    const onCustom = vi.fn()
    const { getByRole } = render(
      <TopicMultiSelect options={OPTIONS} selected={[]} onChange={vi.fn()} onCustom={onCustom} />,
    )
    fireEvent.click(getByRole('combobox'))
    fireEvent.click(screen.getByText('Lainnya (ketik sendiri)...'))
    expect(onCustom).toHaveBeenCalled()
  })
})
