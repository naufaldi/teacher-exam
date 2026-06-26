import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import type { ExamTemplate } from "@teacher-exam/shared"
import { SUBJECT_LABEL } from "@teacher-exam/shared"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  useToast
} from "@teacher-exam/ui"
import { Copy, Plus, Sparkles, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { api, unwrapApiEither } from "../lib/api.js"

export const Route = createFileRoute("/_auth/templates")({
  component: TemplatesPage
})

type ApplyState = { templateId: string; name: string } | null

function TemplatesPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [templates, setTemplates] = useState<ReadonlyArray<ExamTemplate>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ExamTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [applyingId, setApplyingId] = useState<string | null>(null)

  useEffect(() => {
    void loadTemplates()
  }, [])

  async function loadTemplates() {
    try {
      const list = unwrapApiEither(await api.templates.list())
      setTemplates(list)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat template")
    } finally {
      setLoading(false)
    }
  }

  async function handleApply(template: ExamTemplate) {
    setApplyingId(template.id)
    try {
      const applied = unwrapApiEither(await api.templates.apply(template.id))
      toast({ variant: "success", title: `Template "${template.name}" dimuat` })
      void navigate({
        to: "/generate",
        state: { templateApply: applied } as unknown as Record<string, unknown>
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memuat template"
      toast({ variant: "error", title: message })
    } finally {
      setApplyingId(null)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      unwrapApiEither(await api.templates.remove(pendingDelete.id))
      setTemplates((prev) => prev.filter((t) => t.id !== pendingDelete.id))
      toast({ variant: "success", title: "Template dihapus" })
      setPendingDelete(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menghapus template"
      toast({ variant: "error", title: message })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-body text-danger-700">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => void loadTemplates()}>
          Coba lagi
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Template"
        subtitle="Simpan konfigurasi generate dan jalankan ulang dalam satu klik."
      >
        <Button asChild>
          <Link to="/generate">
            <Plus size={16} />
            Generate baru
          </Link>
        </Button>
      </PageHeader>

      {templates.length === 0 ?
        (
          <EmptyState
            icon={<Sparkles size={28} />}
            title="Belum ada template"
            description="Setelah membuat lembar di Generate, simpan konfigurasinya sebagai template untuk dipakai ulang."
            action={
              <Button asChild>
                <Link to="/generate">Mulai generate</Link>
              </Button>
            }
          />
        ) :
        (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <li
                key={template.id}
                className="rounded-lg border border-border-default bg-bg-surface p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-text-primary truncate">{template.name}</h3>
                    {template.description ?
                      (
                        <p className="text-body-sm text-text-tertiary line-clamp-2 mt-0.5">
                          {template.description}
                        </p>
                      ) :
                      null}
                  </div>
                  <Copy size={16} className="text-text-tertiary shrink-0" />
                </div>

                <dl className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm">
                  <div>
                    <dt className="sr-only">Mapel</dt>
                    <dd className="text-text-secondary">
                      {SUBJECT_LABEL[template.config.subject]}
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Kelas</dt>
                    <dd className="text-text-secondary">Kelas {template.config.grade}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Jumlah pakai</dt>
                    <dd className="text-text-tertiary">Dipakai {template.usageCount}×</dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                  {template.config.topics.slice(0, 3).map((topic) => (
                    <span
                      key={topic}
                      className="px-2 py-0.5 rounded-pill bg-kertas-100 text-text-secondary text-[12px]"
                    >
                      {topic}
                    </span>
                  ))}
                  {template.config.topics.length > 3 ?
                    (
                      <span className="px-2 py-0.5 text-text-tertiary text-[12px]">
                        +{template.config.topics.length - 3}
                      </span>
                    ) :
                    null}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border-default">
                  <Button
                    size="sm"
                    onClick={() => void handleApply(template)}
                    disabled={applyingId === template.id}
                  >
                    <Sparkles size={14} />
                    Gunakan
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDelete(template)}
                    aria-label={`Hapus ${template.name}`}
                  >
                    <Trash2 size={14} />
                    Hapus
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus template?</AlertDialogTitle>
            <AlertDialogDescription>
              Template "{pendingDelete?.name}" akan dihapus permanen dan tidak bisa dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
              disabled={deleting}
              className="bg-danger-600 text-white hover:bg-danger-700"
            >
              {deleting ? "Menghapus…" : "Ya, hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export type { ApplyState }
