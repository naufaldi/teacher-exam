import { createFileRoute, Link } from "@tanstack/react-router"
import { SUBJECT_LABEL } from "@teacher-exam/shared"
import type { PublicExamDetailResponse } from "@teacher-exam/shared"
import { Badge, Button, EmptyState, PageHeader, Tabs, TabsList, TabsTrigger } from "@teacher-exam/ui"
import { Either, Match } from "effect"
import { BookOpen, ClipboardList, FileText, Key, Layers, Printer } from "lucide-react"
import { useState } from "react"
import {
  acceptedQuestions,
  ExamSheetContent,
  ExamSheetPrintStyles,
  toExamSheetMetadata,
  triggerPrint
} from "../components/exam-sheet/index.js"
import { ExportMenu } from "../components/export-menu.js"
import { api, unwrapApiEither } from "../lib/api.js"

class PublicShareNotFoundError extends Error {
  constructor() {
    super("Public exam not found")
    this.name = "PublicShareNotFoundError"
  }
}

export const Route = createFileRoute("/share/$slug")({
  loader: async ({ params }) => {
    const result = await api.publicExams.get(params.slug)
    if (Either.isLeft(result)) {
      const isNotFound = Match.value(result.left).pipe(
        Match.tag("ApiClientError", (err) => err.status === 404),
        Match.orElse(() => false)
      )
      if (isNotFound) {
        throw new PublicShareNotFoundError()
      }
      return unwrapApiEither(result)
    }
    return result.right
  },
  component: PublicSharePage,
  errorComponent: ShareRouteError
})

function ShareRouteError({ error }: { error: Error }) {
  if (error.name === "PublicShareNotFoundError") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app px-6">
        <EmptyState
          title="Lembar tidak ditemukan"
          description="Lembar tidak ditemukan atau tidak lagi publik."
          action={
            <Button asChild variant="primary" size="md">
              <Link to="/">Ke halaman login</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-app px-6">
      <EmptyState
        title="Terjadi kesalahan"
        description="Gagal memuat lembar publik. Silakan coba lagi."
        action={
          <Button variant="primary" size="md" onClick={() => window.location.reload()}>
            Muat ulang
          </Button>
        }
      />
    </div>
  )
}

function PublicSharePage() {
  const exam = Route.useLoaderData()
  const { slug } = Route.useParams()
  const [tab, setTab] = useState<"semua" | "soal" | "lj" | "kunci" | "pembahasan">("semua")

  const subjectLabel = SUBJECT_LABEL[exam.subject] ?? exam.subject
  const publishedDate = new Date(exam.publishedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  })
  const metadata = toExamSheetMetadata(exam)
  const questions = acceptedQuestions(exam)
  const topicsLabel = exam.topics.join(" · ")
  const hasPembahasan = exam.discussionMd !== null && exam.discussionMd.trim() !== ""

  const handleExport = async (format: "pdf" | "docx", variant: "soal" | "kunci" | "pembahasan") => {
    await api.publicExams.export(slug, format, variant)
  }

  return (
    <div className="min-h-screen bg-bg-app">
      <main className="max-w-[var(--container-app)] mx-auto px-6 py-8 space-y-6">
        <PageHeader
          data-screen-only
          data-no-print
          title={exam.title}
          subtitle={`${subjectLabel} · Kelas ${exam.grade} SD`}
        >
          <Badge variant="secondary">Publik</Badge>
        </PageHeader>

        <div
          data-screen-only
          data-no-print
          className="rounded-md border border-border-default bg-bg-surface px-5 py-4 flex flex-col gap-4"
        >
          <div className="space-y-1">
            <p className="text-body-sm text-text-secondary">
              Dibagikan pada {publishedDate}
            </p>
            <p className="text-body-sm text-text-tertiary">
              Unduh sebagai PDF/DOCX atau cetak langsung dari browser.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="semua">
                  <Layers className="h-3.5 w-3.5 mr-1.5" /> Semua
                </TabsTrigger>
                <TabsTrigger value="soal">
                  <FileText className="h-3.5 w-3.5 mr-1.5" /> Soal
                </TabsTrigger>
                <TabsTrigger value="lj">
                  <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Lembar Jawaban
                </TabsTrigger>
                <TabsTrigger value="kunci">
                  <Key className="h-3.5 w-3.5 mr-1.5" /> Kunci
                </TabsTrigger>
                {hasPembahasan ?
                  (
                    <TabsTrigger value="pembahasan">
                      <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Pembahasan
                    </TabsTrigger>
                  ) :
                  null}
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => triggerPrint("soal")}>
                <Printer className="h-3.5 w-3.5 mr-1.5" /> Cetak Soal
              </Button>
              <Button variant="ghost" size="sm" onClick={() => triggerPrint("lj")}>
                <Printer className="h-3.5 w-3.5 mr-1.5" /> Cetak LJ
              </Button>
              <Button variant="ghost" size="sm" onClick={() => triggerPrint("kunci")}>
                <Printer className="h-3.5 w-3.5 mr-1.5" /> Cetak Kunci
              </Button>
              {hasPembahasan ?
                (
                  <Button variant="ghost" size="sm" onClick={() => triggerPrint("pembahasan")}>
                    <Printer className="h-3.5 w-3.5 mr-1.5" /> Cetak Pembahasan
                  </Button>
                ) :
                null}
              <ExportMenu
                onExport={(format) => handleExport(format, "soal")}
                onPrint={() => triggerPrint("all")}
                triggerLabel="Unduh Soal"
              />
              <Button variant="secondary" size="sm" onClick={() => void handleExport("pdf", "kunci")}>
                PDF Kunci
              </Button>
              {hasPembahasan ?
                (
                  <Button variant="secondary" size="sm" onClick={() => void handleExport("pdf", "pembahasan")}>
                    PDF Pembahasan
                  </Button>
                ) :
                null}
            </div>
          </div>
        </div>

        <ExamSheetPrintStyles />

        <ExamSheetContent
          grade={exam.grade}
          metadata={metadata}
          questions={questions}
          subjectLabel={subjectLabel}
          topicsLabel={topicsLabel}
          discussionMd={exam.discussionMd}
          screenTab={tab}
        />
      </main>
    </div>
  )
}

export type { PublicExamDetailResponse }
