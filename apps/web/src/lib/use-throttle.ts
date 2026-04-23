import { useCallback, useRef } from 'react'

/**
 * Returns a stable callback that ignores invocations occurring less than
 * `intervalMs` after the previous accepted invocation. Use to prevent
 * accidental double-clicks on mutation triggers (submit, logout, finalize).
 */
export function useThrottle<TArgs extends readonly unknown[]>(
  fn: (...args: TArgs) => void | Promise<void>,
  intervalMs = 250,
): (...args: TArgs) => void {
  const lastFiredAt = useRef(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  return useCallback(
    (...args: TArgs) => {
      const now = Date.now()
      if (now - lastFiredAt.current < intervalMs) return
      lastFiredAt.current = now
      void fnRef.current(...args)
    },
    [intervalMs],
  )
}
