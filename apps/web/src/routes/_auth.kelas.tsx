import { createFileRoute } from "@tanstack/react-router"
import type { ClassEntity, StudentEntity } from "@teacher-exam/shared"
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
  Input,
  Label,
  LoadingSpinner,
  PageHeader,
  Textarea,
  useToast
} from "@teacher-exam/ui"
import { Plus, Trash2, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { ComingSoonPage } from "../components/coming-soon-page.js"
import { api, unwrapApiEither } from "../lib/api.js"

export const Route = createFileRoute("/_auth/kelas")({
  component: KelasPage
})

type StudentDraft = { name: string; identifier?: string }

function parseImport(text: string): Array<StudentDraft> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [name, identifier] = line.split(/[,;\t]/).map((part) => part.trim())
      const trimmedName = (name ?? "").trim()
      if (trimmedName.length === 0) return null
      const trimmedId = (identifier ?? "").trim()
      return trimmedId.length > 0
        ? { name: trimmedName, identifier: trimmedId }
        : { name: trimmedName }
    })
    .filter((draft): draft is StudentDraft => draft !== null)
}

function KelasPage() {
  return (
    <ComingSoonPage
      title="Kelas"
      subtitle="Kelola kelas dan daftar siswa untuk pengiriman ujian."
      icon={<Users size={24} className="text-text-tertiary" />}
    />
  )
}

function _KelasPageImpl() {
  const { toast } = useToast()
  const [classes, setClasses] = useState<ReadonlyArray<ClassEntity>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState("")

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [students, setStudents] = useState<ReadonlyArray<StudentEntity>>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [importText, setImportText] = useState("")
  const [importing, setImporting] = useState(false)
  const [pendingDeleteStudent, setPendingDeleteStudent] = useState<StudentEntity | null>(null)
  const [deletingStudent, setDeletingStudent] = useState(false)
  const [pendingDeleteClass, setPendingDeleteClass] = useState<ClassEntity | null>(null)
  const [deletingClass, setDeletingClass] = useState(false)

  useEffect(() => {
    void loadClasses()
  }, [])

  async function loadClasses() {
    try {
      const list = unwrapApiEither(await api.classes.list())
      setClasses(list as ReadonlyArray<ClassEntity>)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat kelas")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateClass(event: React.FormEvent) {
    event.preventDefault()
    const name = newName.trim()
    if (name.length === 0) return
    try {
      const created = unwrapApiEither(await api.classes.create({ name }))
      setClasses((prev) => [created, ...prev])
      setNewName("")
      toast({ variant: "success", title: "Kelas ditambahkan" })
    } catch (err: unknown) {
      toast({ variant: "error", title: err instanceof Error ? err.message : "Gagal menambah kelas" })
    }
  }

  async function loadStudents(classId: string) {
    setStudentsLoading(true)
    try {
      const list = unwrapApiEither(await api.classes.students.list(classId))
      setStudents(list)
    } catch (err: unknown) {
      toast({ variant: "error", title: err instanceof Error ? err.message : "Gagal memuat siswa" })
      setStudents([])
    } finally {
      setStudentsLoading(false)
    }
  }

  function selectClass(cls: ClassEntity) {
    setSelectedId(cls.id)
    setImportText("")
    void loadStudents(cls.id)
  }

  async function handleImport() {
    if (!selectedId) return
    const drafts = parseImport(importText)
    if (drafts.length === 0) {
      toast({ variant: "error", title: "Tidak ada baris valid untuk diimpor" })
      return
    }
    setImporting(true)
    try {
      const inserted = unwrapApiEither(
        await api.classes.students.bulkCreate(selectedId, { students: drafts })
      )
      setStudents((prev) => [...prev, ...inserted])
      setImportText("")
      toast({ variant: "success", title: `${inserted.length} siswa diimpor` })
    } catch (err: unknown) {
      toast({ variant: "error", title: err instanceof Error ? err.message : "Gagal mengimpor siswa" })
    } finally {
      setImporting(false)
    }
  }

  async function confirmDeleteStudent() {
    if (!pendingDeleteStudent || !selectedId) return
    setDeletingStudent(true)
    try {
      unwrapApiEither(await api.classes.students.remove(selectedId, pendingDeleteStudent.id))
      setStudents((prev) => prev.filter((s) => s.id !== pendingDeleteStudent.id))
      setPendingDeleteStudent(null)
      toast({ variant: "success", title: "Siswa dihapus" })
    } catch (err: unknown) {
      toast({ variant: "error", title: err instanceof Error ? err.message : "Gagal menghapus siswa" })
    } finally {
      setDeletingStudent(false)
    }
  }

  async function confirmDeleteClass() {
    if (!pendingDeleteClass) return
    setDeletingClass(true)
    try {
      unwrapApiEither(await api.classes.remove(pendingDeleteClass.id))
      setClasses((prev) => prev.filter((c) => c.id !== pendingDeleteClass.id))
      if (selectedId === pendingDeleteClass.id) {
        setSelectedId(null)
        setStudents([])
      }
      setPendingDeleteClass(null)
      toast({ variant: "success", title: "Kelas dihapus" })
    } catch (err: unknown) {
      toast({ variant: "error", title: err instanceof Error ? err.message : "Gagal menghapus kelas" })
    } finally {
      setDeletingClass(false)
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
        <Button variant="secondary" size="sm" onClick={() => void loadClasses()}>
          Coba lagi
        </Button>
      </div>
    )
  }

  const selected = classes.find((c) => c.id === selectedId) ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelas"
        subtitle="Kelola kelas dan daftar siswa untuk pengiriman ujian."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-4">
          <form
            onSubmit={handleCreateClass}
            className="rounded-lg border border-border-default bg-bg-surface p-4 space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="class-name">Nama kelas</Label>
              <Input
                id="class-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="mis. Kelas 5A"
                autoComplete="off"
              />
            </div>
            <Button type="submit" size="sm" className="w-full">
              <Plus size={14} />
              Tambah kelas
            </Button>
          </form>

          {classes.length === 0 ?
            (
              <EmptyState
                icon={<Users size={28} />}
                title="Belum ada kelas"
                description="Buat kelas pertama Anda untuk mulai mengelola siswa."
              />
            ) :
            (
              <ul className="space-y-2">
                {classes.map((cls) => (
                  <li key={cls.id}>
                    <div
                      className={`rounded-lg border p-3 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        selectedId === cls.id
                          ? "border-primary-600 bg-primary-50"
                          : "border-border-default bg-bg-surface hover:border-kertas-300"
                      }`}
                      onClick={() => selectClass(cls)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          selectClass(cls)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate">{cls.name}</p>
                        <p className="text-body-sm text-text-tertiary">
                          {cls.grade ? `Kelas ${cls.grade}` : "—"}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Hapus kelas ${cls.name}`}
                        className="text-text-tertiary hover:text-danger-600 p-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPendingDeleteClass(cls)
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </div>

        <div className="space-y-4">
          {!selected ?
            (
              <EmptyState
                icon={<Users size={28} />}
                title="Pilih kelas"
                description="Pilih kelas di samping untuk melihat dan mengelola siswa."
              />
            ) :
            (
              <div className="space-y-5">
                <div className="rounded-lg border border-border-default bg-bg-surface p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-text-primary">{selected.name}</h2>
                      <p className="text-body-sm text-text-tertiary">
                        {students.length} siswa
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="import-students">Impor siswa (satu baris per siswa: Nama,identifier)</Label>
                    <Textarea
                      id="import-students"
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder={"Budi,001\nSiti\nAndi,003"}
                      rows={5}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => void handleImport()}
                    disabled={importing || importText.trim().length === 0}
                  >
                    <Plus size={14} />
                    Impor
                  </Button>
                </div>

                <div className="rounded-lg border border-border-default bg-bg-surface">
                  {studentsLoading ?
                    (
                      <div className="flex justify-center py-10">
                        <LoadingSpinner />
                      </div>
                    ) :
                    students.length === 0 ?
                    (
                      <div className="py-10 text-center">
                        <p className="text-body-sm text-text-tertiary">
                          Belum ada siswa di kelas ini. Impor di atas.
                        </p>
                      </div>
                    ) :
                    (
                      <ul className="divide-y divide-border-default">
                        {students.map((student) => (
                          <li
                            key={student.id}
                            className="flex items-center justify-between gap-2 p-3"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-text-primary truncate">{student.name}</p>
                              <p className="text-body-sm text-text-tertiary">
                                {student.identifier ?? "—"}
                              </p>
                            </div>
                            <button
                              type="button"
                              aria-label={`Hapus siswa ${student.name}`}
                              className="text-text-tertiary hover:text-danger-600 p-1"
                              onClick={() => setPendingDeleteStudent(student)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
              </div>
            )}
        </div>
      </div>

      <AlertDialog
        open={pendingDeleteStudent !== null}
        onOpenChange={(open) => !open && setPendingDeleteStudent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus siswa?</AlertDialogTitle>
            <AlertDialogDescription>
              Siswa "{pendingDeleteStudent?.name}" akan dihapus dari kelas ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingStudent}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmDeleteStudent()
              }}
              disabled={deletingStudent}
              className="bg-danger-600 text-white hover:bg-danger-700"
            >
              {deletingStudent ? "Menghapus…" : "Ya, hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDeleteClass !== null}
        onOpenChange={(open) => !open && setPendingDeleteClass(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kelas?</AlertDialogTitle>
            <AlertDialogDescription>
              Kelas "{pendingDeleteClass?.name}" dan seluruh siswanya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingClass}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmDeleteClass()
              }}
              disabled={deletingClass}
              className="bg-danger-600 text-white hover:bg-danger-700"
            >
              {deletingClass ? "Menghapus…" : "Ya, hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
