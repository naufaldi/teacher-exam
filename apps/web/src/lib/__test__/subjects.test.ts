import { describe, expect, it } from 'vitest'
import { SUBJECT_OPTIONS, subjectMetaFor } from '../subjects.js'

describe('subject metadata', () => {
  it('includes PRD v3 phase 1 subjects for UI selectors', () => {
    expect(SUBJECT_OPTIONS.map((option) => option.value)).toEqual([
      'bahasa_indonesia',
      'pendidikan_pancasila',
      'ipas',
      'bahasa_inggris',
    ])
  })

  it('provides display metadata for IPAS and Bahasa Inggris', () => {
    expect(subjectMetaFor('ipas')).toMatchObject({ label: 'IPAS', short: 'IPAS' })
    expect(subjectMetaFor('bahasa_inggris')).toMatchObject({
      label: 'Bahasa Inggris',
      short: 'BING',
    })
  })
})
