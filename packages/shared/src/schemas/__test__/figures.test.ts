import { describe, expect, test } from 'vitest'
import { Either, Schema } from 'effect'
import { FigureSpecSchema } from '../figures.js'

const decode = Schema.decodeUnknownEither(FigureSpecSchema)

describe('FigureSpecSchema', () => {
  test.each([
    [{ type: 'circle', radius: 7, label: 'r = 7 cm' }],
    [{ type: 'square', side: 8, label: 's = 8 cm' }],
    [{ type: 'rectangle', width: 12, height: 5, label: '12 cm x 5 cm' }],
    [{ type: 'triangle', base: 10, height: 6, label: 'a = 10 cm, t = 6 cm' }],
    [{ type: 'trapezoid', topBase: 6, bottomBase: 12, height: 4, label: 't = 4 cm' }],
    [{
      type: 'coordinate_plane',
      xMin: -2,
      xMax: 4,
      yMin: -1,
      yMax: 5,
      points: [{ x: 1, y: 2, label: 'A' }],
    }],
  ])('decodes supported figure %#', (figure) => {
    const result = decode(figure)
    expect(Either.isRight(result)).toBe(true)
  })

  test('rejects unsupported figure types', () => {
    const result = decode({ type: 'pentagon', side: 5 })
    expect(Either.isLeft(result)).toBe(true)
  })

  test('rejects missing required dimensions', () => {
    const result = decode({ type: 'rectangle', width: 12 })
    expect(Either.isLeft(result)).toBe(true)
  })
})
