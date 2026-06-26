import { createFileRoute } from "@tanstack/react-router"
import type { SessionDetailResponse, SessionQuestion, SessionStudent, SubmitSessionInput } from "@teacher-exam/shared"
import { Button, Card } from "@teacher-exam/ui"
import { Either, Match } from "effect"
import { useEffect, useMemo, useState } from "react"
import { MathText } from "../components/math-text.js"
import { api } from "../lib/api.js"

export const Route = createFileRoute("/ujian/$code")({
  component: UjianTakeExamPage
})

type AnswerByQuestion = Record<
  string,
  | { _tag: "mcq_single"; answer: "a" | "b" | "c" | "d" }
  | { _tag: "mcq_multi"; answers: Array<"a" | "b" | "c" | "d"> }
  | { _tag: "true_false"; answers: Array<boolean> }
>

function UjianTakeExamPage() {
  const { code } = Route.useParams()
  const [detail, setDetail] = useState<SessionDetailResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [student, setStudent] = useState<SessionStudent | null>(null)
  const [name, setName] = useState("")
  const [answers, setAnswers] = useState<AnswerByQuestion>({})
  const [current, setCurrent] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    api.sessions.public.get(code).then((result) => {
      if (cancelled) return
      if (Either.isLeft(result)) {
        setLoadError("Sesi tidak ditemukan.")
        return
      }
      setDetail(result.right)
    })
    return () => {
      cancelled = true
    }
  }, [code])

  const windowClosed = useMemo(() => {
    if (!detail) return false
    const now = Date.now()
    return detail.status === "closed" || now >= new Date(detail.closesAt).getTime()
  }, [detail])

  useEffect(() => {
    if (!detail || !student || windowClosed) return
    const startedAt = Date.now()
    const end = Math.min(
      new Date(detail.closesAt).getTime(),
      startedAt + (detail.durationMinutes ?? 0) * 60_000
    )
    setSecondsLeft(Math.max(0, Math.floor((end - startedAt) / 1000)))
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null) return prev
        if (prev <= 1) {
          window.clearInterval(id)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [detail, student, windowClosed])

  // Anti-cheat: flag on tab hide, disable copy
  useEffect(() => {
    const onVisibility = (): void => {
      if (document.hidden) {
        setError("Jangan berpindah tab saat ujian berlangsung.")
      }
    }
    const onCopy = (e: ClipboardEvent): void => {
      e.preventDefault()
    }
    document.addEventListener("visibilitychange", onVisibility)
    document.addEventListener("copy", onCopy)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      document.removeEventListener("copy", onCopy)
    }
  }, [])

  const handleStart = async (): Promise<void> => {
    if (!detail) return
    setError(null)
    const result = await api.sessions.public.start(detail.sessionCode, { studentName: name })
    if (Either.isLeft(result)) {
      setError("Gagal memulai sesi.")
      return
    }
    setStudent(result.right)
  }

  const handleSubmit = async (): Promise<void> => {
    if (!student || !detail) return
    setError(null)
    const input: SubmitSessionInput = {
      token: student.token,
      answers
    }
    const result = await api.sessions.public.submit(detail.sessionCode, input)
    if (Either.isLeft(result)) {
      setError("Gagal mengumpulkan jawaban.")
      return
    }
    setSubmitted(true)
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center px-6">
        <Card className="max-w-md w-full p-6 text-center space-y-2">
          <h1 className="text-h2 font-semibold text-text-primary">Sesi tidak ditemukan</h1>
          <p className="text-body-sm text-text-secondary">{loadError}</p>
        </Card>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center px-6">
        <p className="text-body-sm text-text-secondary">Memuat sesi…</p>
      </div>
    )
  }

  if (windowClosed && !student) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center px-6">
        <Card className="max-w-md w-full p-6 text-center space-y-2">
          <h1 className="text-h2 font-semibold text-text-primary">Ujian berakhir</h1>
          <p className="text-body-sm text-text-secondary">
            Sesi ujian ini telah ditutup dan tidak lagi menerima jawaban.
          </p>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center px-6">
        <Card className="max-w-md w-full p-6 text-center space-y-2">
          <h1 className="text-h2 font-semibold text-text-primary">Jawaban terkumpul</h1>
          <p className="text-body-sm text-text-secondary">Terima kasih telah mengerjakan ujian.</p>
        </Card>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center px-6">
        <Card className="max-w-md w-full p-6 space-y-4">
          <div>
            <h1 className="text-h2 font-semibold text-text-primary">{detail.title}</h1>
            <p className="text-body-sm text-text-secondary">
              Durasi {detail.durationMinutes ?? "-"} menit · {detail.questions.length} soal
            </p>
          </div>
          <label className="block space-y-1">
            <span className="text-body-sm font-medium text-text-primary">Nama</span>
            <input
              className="w-full rounded-sm border border-border-default bg-white px-3 py-2 text-body text-text-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap"
            />
          </label>
          {error ? <p className="text-body-sm text-primary-600">{error}</p> : null}
          <Button className="w-full" disabled={name.trim().length === 0} onClick={handleStart}>
            Mulai
          </Button>
        </Card>
      </div>
    )
  }

  const question = detail.questions[current]
  if (!question) return null

  return (
    <div className="min-h-screen bg-bg-app">
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-h3 font-semibold text-text-primary">{detail.title}</h1>
          <span className="text-body-sm font-mono text-text-secondary">
            {secondsLeft !== null ? formatTime(secondsLeft) : "--:--"}
          </span>
        </div>
        {error ? <p className="text-body-sm text-primary-600">{error}</p> : null}

        <QuestionCard
          index={current}
          total={detail.questions.length}
          question={question}
          answer={answers[question.id]}
          onAnswer={(a) => setAnswers((prev) => ({ ...prev, [question.id]: a }))}
        />

        <div className="flex items-center justify-between">
          <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
            Sebelumnya
          </Button>
          {current < detail.questions.length - 1 ?
            <Button onClick={() => setCurrent((c) => c + 1)}>Berikutnya</Button> :
            <Button onClick={handleSubmit}>Kumpulkan</Button>}
        </div>
      </main>
    </div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function QuestionCard({
  answer,
  index,
  onAnswer,
  question,
  total
}: {
  index: number
  total: number
  question: SessionQuestion
  answer: AnswerByQuestion[string] | undefined
  onAnswer: (a: AnswerByQuestion[string]) => void
}) {
  return (
    <Card className="p-6 space-y-4">
      <p className="text-body-sm text-text-secondary">Soal {index + 1} dari {total}</p>
      <p className="text-body font-medium text-text-primary">
        <MathText text={question.text} />
      </p>
      {Match.value(question).pipe(
        Match.tag("mcq_single", (q) => (
          <div className="space-y-2">
            {(["a", "b", "c", "d"] as const).map((key) => (
              <label key={key} className="flex items-start gap-2">
                <input
                  type="radio"
                  name={q.id}
                  checked={answer?._tag === "mcq_single" && answer.answer === key}
                  onChange={() => onAnswer({ _tag: "mcq_single", answer: key })}
                />
                <span className="text-body text-text-primary">
                  {key.toUpperCase()}. <MathText text={q.options[key]} />
                </span>
              </label>
            ))}
          </div>
        )),
        Match.tag("mcq_multi", (q) => (
          <div className="space-y-2">
            {(["a", "b", "c", "d"] as const).map((key) => {
              const selected = answer?._tag === "mcq_multi" && answer.answers.includes(key)
              return (
                <label key={key} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const currentArr = answer?._tag === "mcq_multi" ? answer.answers : []
                      const next = selected
                        ? currentArr.filter((k) => k !== key)
                        : [...currentArr, key]
                      onAnswer({ _tag: "mcq_multi", answers: next })
                    }}
                  />
                  <span className="text-body text-text-primary">
                    {key.toUpperCase()}. <MathText text={q.options[key]} />
                  </span>
                </label>
              )
            })}
          </div>
        )),
        Match.tag("true_false", (q) => (
          <div className="space-y-2">
            {q.statements.map((statement, i) => {
              const currentArr = answer?._tag === "true_false" ? answer.answers : []
              return (
                <div key={i} className="space-y-1">
                  <p className="text-body text-text-primary">
                    <MathText text={statement.text} />
                  </p>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name={`${q.id}-${i}`}
                        checked={currentArr[i] === true}
                        onChange={() => {
                          const next = [...currentArr]
                          next[i] = true
                          onAnswer({ _tag: "true_false", answers: next })
                        }}
                      />
                      <span className="text-body-sm text-text-secondary">Benar</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name={`${q.id}-${i}`}
                        checked={currentArr[i] === false}
                        onChange={() => {
                          const next = [...currentArr]
                          next[i] = false
                          onAnswer({ _tag: "true_false", answers: next })
                        }}
                      />
                      <span className="text-body-sm text-text-secondary">Salah</span>
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        )),
        Match.exhaustive
      )}
    </Card>
  )
}
