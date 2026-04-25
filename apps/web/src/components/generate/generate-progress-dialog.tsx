import { useEffect, useState } from 'react'
import { Sparkles, Check, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Progress,
} from '@teacher-exam/ui'

// Elapsed seconds counter — shown only when the bar has frozen at 99%
function useElapsedSeconds(active: boolean) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!active) { setSeconds(0); return }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [active])
  return seconds
}

const STEPS = [
  { id: 0, label: 'Menganalisis materi & CP Fase C', threshold: 0 },
  { id: 1, label: 'Menyusun soal pilihan ganda', threshold: 20 },
  { id: 2, label: 'Membuat kunci jawaban', threshold: 60 },
  { id: 3, label: 'Validasi akhir', threshold: 90 },
] as const

const TIPS = [
  'AI menyertakan Capaian Pembelajaran Fase C secara otomatis.',
  'Setiap lembar berisi soal pilihan ganda — siap dicetak ke A4.',
  'Setelah selesai, Anda bisa edit setiap soal sebelum dicetak.',
] as const

export interface GenerateProgressDialogProps {
  open: boolean
  progress: number
  totalSoal: number
}

/**
 * Centered modal that mimics a real AI streaming response while a lembar is generated.
 * Renders a 4-step checklist, generated-question counter, and a rotating tip.
 */
export function GenerateProgressDialog({
  open,
  progress,
  totalSoal,
}: GenerateProgressDialogProps) {
  const [tipIndex, setTipIndex] = useState(0)
  const isOvertime = progress >= 99
  const overtimeSeconds = useElapsedSeconds(open && isOvertime)

  useEffect(() => {
    if (!open) {
      setTipIndex(0)
      return
    }
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length)
    }, 2500)
    return () => clearInterval(id)
  }, [open])

  // Counter starts ramping when step 2 begins and caps at the requested total.
  const soalCount = Math.max(
    0,
    Math.min(totalSoal, Math.floor(((progress - 20) / 70) * totalSoal)),
  )

  const activeStepIndex = STEPS.reduce(
    (acc, step) => (progress >= step.threshold ? step.id : acc),
    0,
  )

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md p-0 [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="p-7 space-y-6">
          {/* Icon + title */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary-200/50 blur-xl animate-pulse" />
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center shadow-md">
                <Sparkles size={24} className="animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-h3">Membuat lembar ujian Anda</DialogTitle>
              <DialogDescription className="text-body-sm">
                AI sedang menyusun soal sesuai Kurikulum Merdeka Fase C.
              </DialogDescription>
            </div>
          </div>

          {/* Progress bar + counter */}
          <div className="space-y-2">
            <Progress
              value={progress}
              className={['h-2', isOvertime ? 'animate-pulse' : ''].join(' ')}
            />
            <div className="flex items-center justify-between text-caption text-text-tertiary tabular-nums">
              <span>
                {isOvertime ? (
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <Loader2 size={11} className="animate-spin shrink-0" />
                    Menunggu AI… {overtimeSeconds > 0 ? `${overtimeSeconds}dtk` : ''}
                  </span>
                ) : (
                  `${Math.round(progress)}% selesai`
                )}
              </span>
              <span>
                Soal{' '}
                <span className="font-mono font-semibold text-text-primary">
                  {soalCount}
                </span>{' '}
                / {totalSoal} dibuat
              </span>
            </div>
          </div>

          {/* Step checklist */}
          <ol className="space-y-2.5">
            {STEPS.map((step) => {
              const isDone = progress > 100 || activeStepIndex > step.id || progress >= 100
              const isActive = !isDone && activeStepIndex === step.id
              return (
                <li
                  key={step.id}
                  className="flex items-center gap-3 text-body-sm"
                >
                  <span
                    className={[
                      'flex items-center justify-center w-5 h-5 rounded-full shrink-0',
                      'transition-colors duration-[180ms]',
                      isDone
                        ? 'bg-success-solid text-white'
                        : isActive
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-bg-muted text-text-tertiary',
                    ].join(' ')}
                  >
                    {isDone ? (
                      <Check size={12} strokeWidth={3} />
                    ) : isActive ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span
                    className={
                      isDone
                        ? 'text-text-secondary line-through decoration-text-tertiary/40'
                        : isActive
                          ? 'text-text-primary font-medium'
                          : 'text-text-tertiary'
                    }
                  >
                    {step.label}
                  </span>
                </li>
              )
            })}
          </ol>

          {/* Tip rotator */}
          <div className="rounded-sm bg-bg-muted border border-border-default px-3 py-2.5">
            <p className="text-caption text-text-secondary">
              <span className="font-semibold text-text-primary">Tip · </span>
              <span key={tipIndex} className="animate-fade-up inline-block">
                {TIPS[tipIndex]}
              </span>
            </p>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
