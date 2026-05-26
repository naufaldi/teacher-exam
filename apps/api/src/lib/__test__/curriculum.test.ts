import { describe, expect, test } from 'vitest'
import { Effect } from 'effect'
import { NodeContext } from '@effect/platform-node'
import type { ExamSubject } from '@teacher-exam/shared'
import { curriculumMdFilename } from '../curriculum'
import {
  CurriculumService,
  CurriculumServiceLive,
} from '../../api/services/curriculum-service'

describe('Matematika curriculum corpus', () => {
  test('uses the canonical Matematika markdown filename', () => {
    expect(curriculumMdFilename('matematika' as ExamSubject, 5)).toBe('matematika-kelas-5.md')
    expect(curriculumMdFilename('matematika' as ExamSubject, 6)).toBe('matematika-kelas-6.md')
  })

  test('loads Matematika class 5 corpus without diagram topics before D phase', async () => {
    const text = await Effect.runPromise(
      Effect.gen(function* () {
        const curriculum = yield* CurriculumService
        return yield* curriculum.getText('matematika' as ExamSubject, 5)
      }).pipe(Effect.provide(CurriculumServiceLive), Effect.provide(NodeContext.layer)),
    )

    expect(text).toContain('# Matematika Kelas 5')
    expect(text).toContain('Fase C')
    expect(text).not.toContain('Bangun Datar')
    expect(text).not.toContain('Bangun Ruang')
    expect(text).not.toContain('Bidang Koordinat')
  })
})
