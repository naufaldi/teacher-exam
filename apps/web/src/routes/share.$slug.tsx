import { createFileRoute } from "@tanstack/react-router"
import { SUBJECT_LABEL } from "@teacher-exam/shared"
import type { PublicExamDetailResponse } from "@teacher-exam/shared"
import { Badge, PageHeader } from "@teacher-exam/ui"
import { BookOpen, Key } from "lucide-react"
import { ExportMenu } from "../components/export-menu.js"
import { FigureSvg } from "../components/figure-svg.js"
import { MarkdownMath } from "../components/markdown-math.js"
import { MathText } from "../components/math-text.js"
import { api, unwrapApiEither } from "../lib/api.js"
import { pointsPerQuestion } from "../lib/points.js"
import { matchQuestion, questionCorrectLabel } from "../lib/question-render.js"

export const Route = createFileRoute("/share/$slug")({
  loader: async ({ params }) => unwrapApiEither(await api.publicExams.get(params.slug)),
  component: PublicSharePage
})

function PublicSharePage() {
  const exam = Route.useLoaderData()
  const { slug } = Route.useParams()
  const subjectLabel = SUBJECT_LABEL[exam.subject] ?? exam.subject
  const publishedDate = new Date(exam.publishedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  })

  const handleExport = async (format: "pdf" | "docx") => {
    await api.publicExams.export(slug, format, "soal")
  }

  return (
    <div className="min-h-screen bg-bg-app">
      <main className="max-w-[var(--container-app)] mx-auto px-6 py-8 space-y-6">
        <PageHeader
          title={exam.title}
          subtitle={`${subjectLabel} · Kelas ${exam.grade} SD`}
        >
          <Badge variant="secondary">Publik</Badge>
        </PageHeader>

        <div className="rounded-md border border-border-default bg-bg-surface px-5 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-body-sm text-text-secondary">
              Dibagikan pada {publishedDate}
            </p>
            <p className="text-body-sm text-text-tertiary">
              Unduh sebagai PDF/DOCX atau cetak langsung dari browser.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportMenu onExport={handleExport} onPrint={() => window.print()} />
          </div>
        </div>

        <PublicExamSection exam={exam} />
        <PublicAnswerKeySection exam={exam} />
        {exam.discussionMd ? <PublicDiscussionSection markdown={exam.discussionMd} /> : null}
      </main>
    </div>
  )
}

function PublicExamSection({ exam }: { exam: PublicExamDetailResponse }) {
  const subjectLabel = SUBJECT_LABEL[exam.subject] ?? exam.subject

  return (
    <section className="rounded-md border border-border-default bg-white shadow-sm">
      <div className="border-b border-border-default px-6 py-4">
        <h2 className="text-h3 font-semibold text-text-primary">Soal Ujian</h2>
        <p className="text-body-sm text-text-secondary">
          {subjectLabel} · Kelas {exam.grade} · {exam.topics.join(" · ")}
        </p>
      </div>

      <div className="px-6 py-6 space-y-5">
        {exam.questions.map((question) => (
          <article key={question.id} className="space-y-2">
            <p className="text-body font-medium text-text-primary">
              {question.number}. <MathText text={question.text} />
            </p>
            {question.figure ? <FigureSvg figure={question.figure} /> : null}
            {matchQuestion(question, {
              mcq_single: (item) => (
                <ol className="space-y-1 pl-5 text-body-sm text-text-secondary" type="a">
                  {Object.entries(item.options).map(([key, value]) => (
                    <li key={key}>
                      <MathText text={value} />
                    </li>
                  ))}
                </ol>
              ),
              mcq_multi: (item) => (
                <ol className="space-y-1 pl-5 text-body-sm text-text-secondary" type="a">
                  {Object.entries(item.options).map(([key, value]) => (
                    <li key={key}>
                      <MathText text={value} />
                    </li>
                  ))}
                </ol>
              ),
              true_false: (item) => (
                <ul className="space-y-1 text-body-sm text-text-secondary">
                  {item.statements.map((statement, index) => (
                    <li key={`${question.id}-${index}`}>
                      <MathText text={statement.text} />
                    </li>
                  ))}
                </ul>
              )
            })}
          </article>
        ))}
      </div>
    </section>
  )
}

function PublicAnswerKeySection({ exam }: { exam: PublicExamDetailResponse }) {
  const points = pointsPerQuestion(exam.questions.length)

  return (
    <section className="rounded-md border border-border-default bg-white shadow-sm">
      <div className="border-b border-border-default px-6 py-4 flex items-center gap-2">
        <Key className="h-4 w-4 text-text-secondary" />
        <h2 className="text-h3 font-semibold text-text-primary">Kunci Jawaban</h2>
      </div>

      <div className="px-6 py-6 space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {exam.questions.map((question) => (
            <div
              key={question.id}
              className="rounded-sm border border-border-default bg-bg-surface px-3 py-2 text-body-sm"
            >
              <span className="font-semibold text-text-primary">{question.number}.</span>{" "}
              <span className="text-text-secondary">{questionCorrectLabel(question)}</span>
            </div>
          ))}
        </div>
        <p className="text-body-sm text-text-secondary">
          Setiap jawaban benar bernilai {points} poin.
        </p>
      </div>
    </section>
  )
}

function PublicDiscussionSection({ markdown }: { markdown: string }) {
  return (
    <section className="rounded-md border border-border-default bg-white shadow-sm">
      <div className="border-b border-border-default px-6 py-4 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-text-secondary" />
        <h2 className="text-h3 font-semibold text-text-primary">Pembahasan</h2>
      </div>

      <div className="px-6 py-6 prose prose-sm max-w-none">
        <MarkdownMath markdown={markdown} />
      </div>
    </section>
  )
}
