import { useNavigate, useRouter } from "@tanstack/react-router"
import type { Exam } from "@teacher-exam/shared"
import { useToast } from "@teacher-exam/ui"
import { useState } from "react"
import { api, ApiError, unwrapApiEither } from "../lib/api.js"

export function useDuplicateExam() {
  const navigate = useNavigate()
  const router = useRouter()
  const { toast } = useToast()
  const [confirmingExam, setConfirmingExam] = useState<Exam | null>(null)
  const [isPending, setIsPending] = useState(false)

  function openFor(exam: Exam) {
    setConfirmingExam(exam)
  }

  function close() {
    setConfirmingExam(null)
  }

  async function confirm() {
    if (!confirmingExam) return
    setIsPending(true)
    try {
      const newExam = unwrapApiEither(await api.exams.duplicate(confirmingExam.id))
      await router.invalidate()
      setConfirmingExam(null)
      void navigate({ to: "/review", search: { examId: newExam.id, mode: newExam.reviewMode } })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Gagal menduplikat lembar"
      toast({ variant: "error", title: message })
    } finally {
      setIsPending(false)
    }
  }

  return { confirmingExam, isPending, openFor, close, confirm }
}
