import { vi } from 'vitest'

export function createDrizzleOrmMock() {
  return {
    eq: vi.fn((col: unknown, val: unknown) => ({ op: 'eq', col, val })),
    and: vi.fn((...args: unknown[]) => ({ op: 'and', args })),
    desc: vi.fn((col: unknown) => ({ op: 'desc', col })),
    inArray: vi.fn((col: unknown, vals: unknown) => ({ op: 'inArray', col, vals })),
    sql: Object.assign(
      vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
        op: 'sql',
        strings,
        values,
      })),
      { raw: vi.fn((raw: string) => ({ op: 'sqlRaw', raw })) },
    ),
  }
}
