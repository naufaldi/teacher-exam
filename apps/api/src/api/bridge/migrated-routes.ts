export function isAuthPath(pathname: string): boolean {
  return pathname.startsWith('/api/auth/')
}

export function isHttpApiPath(pathname: string): boolean {
  if (!pathname.startsWith('/api/')) return false
  if (isAuthPath(pathname)) return false
  return true
}
