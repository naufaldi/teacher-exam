import { type ExamWithQuestions, type ExportOptions, type PublicExamWithQuestions } from "@teacher-exam/shared"
import { Context, Data, Effect, Layer } from "effect"
import { renderExamDocx } from "./export-docx.js"
import { renderExamHtml } from "./export-render.js"

export class ExportError extends Data.TaggedError("ExportError")<{
  reason: string
  cause?: unknown
}> {}

type ExportExam = ExamWithQuestions | PublicExamWithQuestions

export interface ExportServiceApi {
  readonly exportExamPdf: (
    exam: ExportExam,
    opts: ExportOptions
  ) => Effect.Effect<Uint8Array, ExportError>
  readonly exportExamDocx: (
    exam: ExportExam,
    opts: ExportOptions
  ) => Effect.Effect<Uint8Array, ExportError>
}

export class ExportService extends Context.Tag("ExportService")<
  ExportService,
  ExportServiceApi
>() {}

type BrowserHandle = {
  close: () => Promise<void>
  newPage: () => Promise<{
    setContent: (html: string) => Promise<void>
    pdf: (opts: {
      format: "A4"
      printBackground: boolean
      margin: { top: string; bottom: string; left: string; right: string }
    }) => Promise<Uint8Array>
    close: () => Promise<void>
  }>
}

/** Lazy Chromium launcher — kept behind an interface so the renderer is swappable in tests. */
type BrowserLauncher = () => Effect.Effect<BrowserHandle, ExportError>

const launchPlaywright: BrowserLauncher = () =>
  Effect.gen(function*() {
    const chromium = yield* Effect.tryPromise({
      try: () => import("playwright"),
      catch: (e) => new ExportError({ reason: "Playwright module not available", cause: e })
    })
    return yield* Effect.tryPromise({
      try: async () => {
        const browser = await chromium.chromium.launch({ headless: true })
        return {
          close: () => browser.close(),
          newPage: async () => {
            const page = await browser.newPage()
            return {
              setContent: (html: string) => page.setContent(html, { waitUntil: "networkidle" }),
              pdf: (opts) => page.pdf(opts),
              close: () => page.close()
            }
          }
        } satisfies BrowserHandle
      },
      catch: (e) => new ExportError({ reason: "Failed to launch Chromium browser", cause: e })
    })
  })

export const ExportServiceLive = Layer.effect(
  ExportService,
  Effect.gen(function*() {
    let browserPromise: Promise<BrowserHandle> | null = null

    const getBrowser = (): Effect.Effect<BrowserHandle, ExportError> =>
      Effect.gen(function*() {
        if (browserPromise === null) {
          const launched = yield* launchPlaywright()
          browserPromise = Promise.resolve(launched)
        }
        return yield* Effect.tryPromise({
          try: () => browserPromise as Promise<BrowserHandle>,
          catch: (e) => new ExportError({ reason: "Browser unavailable", cause: e })
        })
      })

    const exportExamPdf = (
      exam: ExportExam,
      opts: ExportOptions
    ): Effect.Effect<Uint8Array, ExportError> =>
      Effect.gen(function*() {
        const html = renderExamHtml(exam, opts.variant)
        const browser = yield* getBrowser()
        const page = yield* Effect.tryPromise({
          try: () => browser.newPage(),
          catch: (e) => new ExportError({ reason: "Failed to open browser page", cause: e })
        })
        const bytes = yield* Effect.tryPromise({
          try: async () => {
            await page.setContent(html)
            return page.pdf({
              format: "A4",
              printBackground: true,
              margin: { top: "12mm", bottom: "12mm", left: "14mm", right: "14mm" }
            })
          },
          catch: (e) => new ExportError({ reason: "Failed to render PDF from exam HTML", cause: e })
        })
        yield* Effect.tryPromise(() => page.close()).pipe(Effect.ignore)
        return bytes
      })

    const exportExamDocx = (
      exam: ExportExam,
      opts: ExportOptions
    ): Effect.Effect<Uint8Array, ExportError> =>
      Effect.tryPromise({
        try: () => renderExamDocx(exam, opts.variant),
        catch: (e) => new ExportError({ reason: "Failed to build DOCX document", cause: e })
      })

    return { exportExamPdf, exportExamDocx }
  })
)
