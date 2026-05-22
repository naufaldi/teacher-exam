import { vi } from 'vitest'
import { createMockDbModule } from './src/__test__/mock-db.js'

process.env['DATABASE_URL'] ??= 'postgres://test:test@127.0.0.1:5432/test'
process.env['SESSION_SECRET'] ??= 'vitest-session-secret-minimum-32-characters'
process.env['GOOGLE_CLIENT_ID'] ??= 'vitest-google-client-id'
process.env['GOOGLE_CLIENT_SECRET'] ??= 'vitest-google-client-secret'
process.env['APP_URL'] ??= 'http://localhost:5173'
process.env['ANTHROPIC_API_KEY'] ??= 'vitest-anthropic-key'
process.env['AI_PROVIDER'] ??= 'anthropic'

vi.mock('@teacher-exam/db', () => createMockDbModule())
