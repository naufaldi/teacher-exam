export function isDevLoginEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env['VITE_DEV_AUTH'] === 'true'
}

export async function devLogin(): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch('/api/dev/login', { method: 'POST', credentials: 'include' })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    return {
      ok: false,
      message: body?.message ?? `Dev login failed (${res.status})`,
    }
  }
  return { ok: true }
}
