import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('question shape repair migration', () => {
  test('adds missing type and payload columns idempotently', () => {
    const sql = readFileSync(
      join(process.cwd(), 'src/migrations/0003_repair_question_shape_columns.sql'),
      'utf8',
    )

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "type"')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "payload"')
    expect(sql).toContain('ALTER COLUMN "option_a" DROP NOT NULL')
    expect(sql).toContain('ALTER COLUMN "correct_answer" DROP NOT NULL')
  })
})

describe('subject enum phase 1 migration', () => {
  test('appends IPAS and Bahasa Inggris enum values', () => {
    const sql = readFileSync(
      join(process.cwd(), 'src/migrations/0005_brown_chronomancer.sql'),
      'utf8',
    )

    expect(sql).toContain("ADD VALUE 'ipas'")
    expect(sql).toContain("ADD VALUE 'bahasa_inggris'")
  })
})

describe('subject enum matematika migration', () => {
  test('appends Matematika enum value idempotently', () => {
    const sql = readFileSync(
      join(process.cwd(), 'src/migrations/0007_add_matematika_subject.sql'),
      'utf8',
    )

    expect(sql).toContain(
      'ALTER TYPE "public"."exam_subject" ADD VALUE IF NOT EXISTS \'matematika\'',
    )
  })
})
