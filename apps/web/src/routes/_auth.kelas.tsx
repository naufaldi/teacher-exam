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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast
} from "@teacher-exam/ui"
import { Plus, Trash2, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { api, unwrapApiEither } from "../lib/api.js"

export const Route = createFileRoute("/_auth/kelas")({
  component: KelasPage
})

type StudentDraft = { name: string; identifier?: string }

type ClassTemplateForm = {
  name: string
  schoolName: string
  academicYear: string
  defaultExamType: "latihan" | "formatif" | "sts" | "sas" | "tka"
  defaultExamDate: string
  defaultDurationMinutes: string
  defaultInstructions: string
}

const EXAM_TYPE_OPTIONS: ReadonlyArray<{
  value: ClassTemplateForm["defaultExamType"]
  label: string
}> = [
  { value: "latihan", label: "Latihan Soal" },
  { value: "formatif", label: "Ulangan Harian" },
  { value: "sts", label: "UTS · Sumatif Tengah Semester" },
  { value: "sas", label: "UAS · Sumatif Akhir Semester" },
  { value: "tka", label: "TKA" }
]

function makeEmptyForm(): ClassTemplateForm {
  return {
    name: "",
    schoolName: "",
    academicYear: "",
    defaultExamType: "formatif",
    defaultExamDate: "",
    defaultDurationMinutes: "",
    defaultInstructions: ""
  }
}

function formFromClass(cls: ClassEntity): ClassTemplateForm {
  return {
    name: cls.name,
    schoolName: cls.schoolName ?? "",
    academicYear: cls.academicYear ?? "",
    defaultExamType: cls.defaultExamType ?? "formatif",
    defaultExamDate: cls.defaultExamDate ?? "",
    defaultDurationMinutes: cls.defaultDurationMinutes !== null ? String(cls.defaultDurationMinutes) : "",
    defaultInstructions: cls.defaultInstructions ?? ""
  }
}

function parseDuration(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return undefined
  const n = parseInt(trimmed, 10)
  return Number.isNaN(n) ? undefined : n
}

function buildClassPayload(form: ClassTemplateForm): Parameters<typeof api.classes.create>[0] {
  const schoolName = form.schoolName.trim()
  const academicYear = form.academicYear.trim()
  const defaultExamDate = form.defaultExamDate.trim()
  const defaultDurationMinutes = parseDuration(form.defaultDurationMinutes)
  const defaultInstructions = form.defaultInstructions.trim()
  return {
    name: form.name.trim(),
    defaultExamType: form.defaultExamType,
    ...(schoolName.length > 0 ? { schoolName } : {}),
    ...(academicYear.length > 0 ? { academicYear } : {}),
    ...(defaultExamDate.length > 0 ? { defaultExamDate } : {}),
    ...(defaultDurationMinutes !== undefined ? { defaultDurationMinutes } : {}),
    ...(defaultInstructions.length > 0 ? { defaultInstructions } : {})
  }
}

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
  return <KelasPageImpl />
}

function KelasPageImpl() {
  const { toast } = useToast()
  const [classes, setClasses] = useState<ReadonlyArray<ClassEntity>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<ClassTemplateForm>(() => makeEmptyForm())

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ClassTemplateForm>(() => makeEmptyForm())
  const [students, setStudents] = useState<ReadonlyArray<StudentEntity>>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [importText, setImportText] = useState("")
  const [importing, setImporting] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
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
    const name = createForm.name.trim()
    if (name.length === 0) return
    try {
      const created = unwrapApiEither(await api.classes.create(buildClassPayload(createForm)))
      setClasses((prev) => [created, ...prev])
      setCreateForm(makeEmptyForm())
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
    setEditForm(formFromClass(cls))
    setImportText("")
    void loadStudents(cls.id)
  }

  async function handleSaveTemplate() {
    if (!selectedId) return
    setSavingTemplate(true)
    try {
      const updated = unwrapApiEither(await api.classes.update(selectedId, buildClassPayload(editForm)))
      setClasses((prev) => prev.map((cls) => cls.id === updated.id ? updated : cls))
      setEditForm(formFromClass(updated))
      toast({ variant: "success", title: "Template kelas disimpan" })
    } catch (err: unknown) {
      toast({ variant: "error", title: err instanceof Error ? err.message : "Gagal menyimpan template" })
    } finally {
      setSavingTemplate(false)
    }
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
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="mis. Kelas 5A"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-school">Nama Sekolah</Label>
              <Input
                id="class-school"
                value={createForm.schoolName}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, schoolName: e.target.value }))}
                placeholder="SD Negeri ..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="class-year">Tahun Pelajaran</Label>
                <Input
                  id="class-year"
                  value={createForm.academicYear}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, academicYear: e.target.value }))}
                  placeholder="2025/2026"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="class-duration">Durasi Default</Label>
                <Input
                  id="class-duration"
                  value={createForm.defaultDurationMinutes}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, defaultDurationMinutes: e.target.value }))}
                  placeholder="60"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-exam-type">Jenis Ujian Default</Label>
              <Select
                value={createForm.defaultExamType}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    defaultExamType: value as ClassTemplateForm["defaultExamType"]
                  }))}
              >
                <SelectTrigger id="class-exam-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-exam-date">Tanggal Ujian Default</Label>
              <Input
                id="class-exam-date"
                type="date"
                value={createForm.defaultExamDate}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, defaultExamDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-instructions">Petunjuk Default</Label>
              <Textarea
                id="class-instructions"
                value={createForm.defaultInstructions}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, defaultInstructions: e.target.value }))}
                rows={3}
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
                          {cls.schoolName ?? (cls.grade ? `Kelas ${cls.grade}` : "Belum ada template")}
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
                      <h2 className="font-semibold text-text-primary">Template Lembar Ujian</h2>
                      <p className="text-body-sm text-text-tertiary">
                        Simpan identitas sekolah dan default lembar untuk kelas ini.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => void handleSaveTemplate()}
                      disabled={savingTemplate || editForm.name.trim().length === 0}
                    >
                      {savingTemplate ? "Menyimpan..." : "Simpan template"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-class-name">Nama kelas template</Label>
                      <Input
                        id="edit-class-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-school-name">Nama sekolah template</Label>
                      <Input
                        id="edit-school-name"
                        value={editForm.schoolName}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, schoolName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-academic-year">Tahun pelajaran default</Label>
                      <Input
                        id="edit-academic-year"
                        value={editForm.academicYear}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, academicYear: e.target.value }))}
                        placeholder="2025/2026"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-duration">Durasi default</Label>
                      <Input
                        id="edit-duration"
                        value={editForm.defaultDurationMinutes}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, defaultDurationMinutes: e.target.value }))}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-exam-type">Jenis ujian default</Label>
                      <Select
                        value={editForm.defaultExamType}
                        onValueChange={(value) =>
                          setEditForm((prev) => ({
                            ...prev,
                            defaultExamType: value as ClassTemplateForm["defaultExamType"]
                          }))}
                      >
                        <SelectTrigger id="edit-exam-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXAM_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-exam-date">Tanggal ujian default</Label>
                      <Input
                        id="edit-exam-date"
                        type="date"
                        value={editForm.defaultExamDate}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, defaultExamDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-instructions">Petunjuk default template</Label>
                    <Textarea
                      id="edit-instructions"
                      value={editForm.defaultInstructions}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, defaultInstructions: e.target.value }))}
                      rows={4}
                    />
                  </div>
                </div>

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
