type PrintScope = "all" | "soal" | "lj" | "kunci" | "pembahasan"

const PRINT_CLEANUP_FALLBACK_MS = 10_000

function triggerPrint(scope: PrintScope) {
  const body = document.body
  let fallbackId: number | undefined

  const cleanup = () => {
    if (fallbackId !== undefined) window.clearTimeout(fallbackId)
    window.removeEventListener("afterprint", cleanup)
    delete body.dataset["printScope"]
  }

  body.dataset["printScope"] = scope
  window.addEventListener("afterprint", cleanup, { once: true })

  window.setTimeout(() => {
    window.print()
    fallbackId = window.setTimeout(cleanup, PRINT_CLEANUP_FALLBACK_MS)
  }, 50)
}

export { triggerPrint }
export type { PrintScope }
