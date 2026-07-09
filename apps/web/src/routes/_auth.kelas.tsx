import { createFileRoute } from "@tanstack/react-router"
import type { ClassEntity, CreateClassInput, Semester } from "@teacher-exam/shared"
import {
  CreateClassInputSchema,
  isCompleteClassTemplate
} from "@teacher-exam/shared"
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
import { Either, Schema } from "effect"
import { Plus, Trash2, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { api, unwrapApiEither } from "../lib/api.js"

export const Route = createFileRoute("/_auth/kelas")({
  component: KelasPage
})

type ClassTemplateForm = {
  name: string
  schoolName: string
  academicYear: string
  semester: Semester | ""
  defaultExamType: CreateClassInput["defaultExamType"]
  defaultExamDate: string
  defaultDurationMinutes: string
  defaultInstructions: string
}

const SEMESTER_OPTIONS: ReadonlyArray<{ value: Semester; label: string }> = [
  { value: "ganjil", label: "Ganjil" },
  { value: "genap", label: "Genap" }
]

type TemplateFieldErrors = {
  name?: string
  schoolName?: string
  academicYear?: string
  defaultExamType?: string
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
    semester: "",
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
    semester: cls.semester ?? "",
    defaultExamType: cls.defaultExamType ?? "formatif",
    defaultExamDate: cls.defaultExamDate ?? "",
    defaultDurationMinutes: cls.defaultDurationMinutes !== null
      ? String(cls.defaultDurationMinutes)
      : "",
    defaultInstructions: cls.defaultInstructions ?? ""
  }
}

function buildClassPayload(form: ClassTemplateForm): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: form.name,
    schoolName: form.schoolName,
    academicYear: form.academicYear,
    defaultExamType: form.defaultExamType
  }
  if (form.semester === "ganjil" || form.semester === "genap") {
    payload["semester"] = form.semester
  }
  const examDate = form.defaultExamDate.trim()
  if (examDate.length > 0) {
    payload["defaultExamDate"] = examDate
  }
  const durationRaw = form.defaultDurationMinutes.trim()
  if (durationRaw.length > 0) {
    const duration = Number(durationRaw)
    if (Number.isInteger(duration)) {
      payload["defaultDurationMinutes"] = duration
    }
  }
  const instructions = form.defaultInstructions.trim()
  if (instructions.length > 0) {
    payload["defaultInstructions"] = instructions
  }
  return payload
}

function parseErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string" &&
    (error as { message: string }).message.length > 0
  ) {
    return (error as { message: string }).message
  }
  return fallback
}

function firstIssueMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "issue" in error &&
    typeof (error as { issue: unknown }).issue === "object" &&
    (error as { issue: unknown }).issue !== null
  ) {
    const issue = (error as { issue: { message?: unknown } }).issue
    if (typeof issue.message === "string" && issue.message.length > 0) {
      return issue.message
    }
  }
  return parseErrorMessage(error, fallback)
}

function validateTemplateForm(
  form: ClassTemplateForm
): Either.Either<CreateClassInput, TemplateFieldErrors> {
  const payload = buildClassPayload(form)
  const decoded = Schema.decodeUnknownEither(CreateClassInputSchema)(payload)
  if (Either.isRight(decoded)) {
    return Either.right(decoded.right)
  }

  const errors: TemplateFieldErrors = {}
  const nameResult = Schema.decodeUnknownEither(CreateClassInputSchema.fields.name)(form.name)
  if (Either.isLeft(nameResult)) {
    errors.name = firstIssueMessage(nameResult.left, "Wajib diisi")
  }
  const schoolResult = Schema.decodeUnknownEither(CreateClassInputSchema.fields.schoolName)(
    form.schoolName
  )
  if (Either.isLeft(schoolResult)) {
    errors.schoolName = firstIssueMessage(schoolResult.left, "Wajib diisi")
  }
  const yearResult = Schema.decodeUnknownEither(CreateClassInputSchema.fields.academicYear)(
    form.academicYear
  )
  if (Either.isLeft(yearResult)) {
    errors.academicYear = firstIssueMessage(
      yearResult.left,
      "Tahun pelajaran harus berformat YYYY/YYYY"
    )
  }
  const examTypeResult = Schema.decodeUnknownEither(CreateClassInputSchema.fields.defaultExamType)(
    form.defaultExamType
  )
  if (Either.isLeft(examTypeResult)) {
    errors.defaultExamType = firstIssueMessage(examTypeResult.left, "Wajib diisi")
  }
  if (
    errors.name === undefined &&
    errors.schoolName === undefined &&
    errors.academicYear === undefined &&
    errors.defaultExamType === undefined
  ) {
    errors.name = "Wajib diisi"
  }
  return Either.left(errors)
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
  const [createErrors, setCreateErrors] = useState<TemplateFieldErrors>({})

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ClassTemplateForm>(() => makeEmptyForm())
  const [editErrors, setEditErrors] = useState<TemplateFieldErrors>({})
  const [savingTemplate, setSavingTemplate] = useState(false)
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
    const validated = validateTemplateForm(createForm)
    if (Either.isLeft(validated)) {
      setCreateErrors(validated.left)
      toast({ variant: "error", title: "Lengkapi template kelas" })
      return
    }
    setCreateErrors({})
    try {
      const created = unwrapApiEither(await api.classes.create(validated.right))
      setClasses((prev) => [created, ...prev])
      setCreateForm(makeEmptyForm())
      toast({ variant: "success", title: "Kelas ditambahkan" })
    } catch (err: unknown) {
      toast({ variant: "error", title: err instanceof Error ? err.message : "Gagal menambah kelas" })
    }
  }

  function selectClass(cls: ClassEntity) {
    setSelectedId(cls.id)
    setEditForm(formFromClass(cls))
    setEditErrors({})
  }

  async function handleSaveTemplate() {
    if (!selectedId) return
    const validated = validateTemplateForm(editForm)
    if (Either.isLeft(validated)) {
      setEditErrors(validated.left)
      toast({ variant: "error", title: "Lengkapi template kelas" })
      return
    }
    setEditErrors({})
    setSavingTemplate(true)
    try {
      const updated = unwrapApiEither(await api.classes.update(selectedId, validated.right))
      setClasses((prev) => prev.map((cls) => cls.id === updated.id ? updated : cls))
      setEditForm(formFromClass(updated))
      toast({ variant: "success", title: "Template kelas disimpan" })
    } catch (err: unknown) {
      toast({ variant: "error", title: err instanceof Error ? err.message : "Gagal menyimpan template" })
    } finally {
      setSavingTemplate(false)
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
        setEditForm(makeEmptyForm())
        setEditErrors({})
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
  const selectedIncomplete = selected !== null && !isCompleteClassTemplate(selected)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelas"
        subtitle="Template Kelas = header sekolah (nama SDN, tahun, semester, petunjuk). Beda dari menu Template = preset Generate (Coming Soon)."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-4">
          <form
            onSubmit={handleCreateClass}
            className="rounded-lg border border-border-default bg-bg-surface p-4 space-y-3"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="class-name">Nama kelas</Label>
              <Input
                id="class-name"
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="mis. Kelas 5A"
                autoComplete="off"
                aria-invalid={createErrors.name !== undefined}
                aria-describedby={createErrors.name !== undefined ? "class-name-error" : undefined}
              />
              {createErrors.name !== undefined ?
                (
                  <p id="class-name-error" className="text-caption text-danger-600" role="alert">
                    {createErrors.name}
                  </p>
                ) :
                null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-school">Nama Sekolah</Label>
              <Input
                id="class-school"
                value={createForm.schoolName}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, schoolName: e.target.value }))}
                placeholder="SD Negeri ..."
                aria-invalid={createErrors.schoolName !== undefined}
                aria-describedby={createErrors.schoolName !== undefined
                  ? "class-school-error"
                  : undefined}
              />
              {createErrors.schoolName !== undefined ?
                (
                  <p id="class-school-error" className="text-caption text-danger-600" role="alert">
                    {createErrors.schoolName}
                  </p>
                ) :
                null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="class-year">Tahun Pelajaran</Label>
                <Input
                  id="class-year"
                  value={createForm.academicYear}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, academicYear: e.target.value }))}
                  placeholder="2025/2026"
                  aria-invalid={createErrors.academicYear !== undefined}
                  aria-describedby={createErrors.academicYear !== undefined
                    ? "class-year-error"
                    : undefined}
                />
                {createErrors.academicYear !== undefined ?
                  (
                    <p id="class-year-error" className="text-caption text-danger-600" role="alert">
                      {createErrors.academicYear}
                    </p>
                  ) :
                  null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="class-semester">Semester</Label>
                <Select
                  {...(createForm.semester !== "" ? { value: createForm.semester } : {})}
                  onValueChange={(value) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      semester: value as Semester
                    }))}
                >
                  <SelectTrigger id="class-semester">
                    <SelectValue placeholder="Pilih semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-exam-type">Jenis Ujian</Label>
              <Select
                value={createForm.defaultExamType}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    defaultExamType: value as ClassTemplateForm["defaultExamType"]
                  }))}
              >
                <SelectTrigger
                  id="class-exam-type"
                  aria-invalid={createErrors.defaultExamType !== undefined}
                >
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
              {createErrors.defaultExamType !== undefined ?
                (
                  <p className="text-caption text-danger-600" role="alert">
                    {createErrors.defaultExamType}
                  </p>
                ) :
                null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="class-duration">Durasi default (menit)</Label>
                <Input
                  id="class-duration"
                  type="number"
                  min={1}
                  value={createForm.defaultDurationMinutes}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      defaultDurationMinutes: e.target.value
                    }))}
                  placeholder="60"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="class-exam-date">Tanggal ujian default</Label>
                <Input
                  id="class-exam-date"
                  type="date"
                  value={createForm.defaultExamDate}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      defaultExamDate: e.target.value
                    }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-instructions">Petunjuk default</Label>
              <Textarea
                id="class-instructions"
                value={createForm.defaultInstructions}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    defaultInstructions: e.target.value
                  }))}
                placeholder="Kerjakan dengan teliti."
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
                description="Buat template kelas pertama untuk mengisi Detail Lembar Ujian lebih cepat."
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
                          {cls.semester === "ganjil" ?
                            " · Ganjil" :
                            cls.semester === "genap" ?
                            " · Genap" :
                            ""}
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
                description="Pilih kelas di samping untuk mengedit template lembar ujian."
              />
            ) :
            (
              <div className="space-y-5">
                <div className="rounded-lg border border-border-default bg-bg-surface p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-text-primary">Template Kelas</h2>
                      <p className="text-body-sm text-text-tertiary">
                        Header sekolah untuk Detail Lembar Ujian — bukan preset Generate di menu Template.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => void handleSaveTemplate()}
                      disabled={savingTemplate}
                    >
                      {savingTemplate ? "Menyimpan..." : "Simpan template"}
                    </Button>
                  </div>
                  {selectedIncomplete ?
                    (
                      <div
                        className="rounded-sm border border-warning-border bg-warning-bg px-3 py-2"
                        role="status"
                      >
                        <p className="text-body-sm text-warning-fg font-medium">
                          Lengkapi template sebelum dipakai di Review
                        </p>
                      </div>
                    ) :
                    null}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-class-name">Nama kelas template</Label>
                      <Input
                        id="edit-class-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                        aria-invalid={editErrors.name !== undefined}
                        aria-describedby={editErrors.name !== undefined
                          ? "edit-class-name-error"
                          : undefined}
                      />
                      {editErrors.name !== undefined ?
                        (
                          <p
                            id="edit-class-name-error"
                            className="text-caption text-danger-600"
                            role="alert"
                          >
                            {editErrors.name}
                          </p>
                        ) :
                        null}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-school-name">Nama sekolah template</Label>
                      <Input
                        id="edit-school-name"
                        value={editForm.schoolName}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, schoolName: e.target.value }))}
                        aria-invalid={editErrors.schoolName !== undefined}
                        aria-describedby={editErrors.schoolName !== undefined
                          ? "edit-school-name-error"
                          : undefined}
                      />
                      {editErrors.schoolName !== undefined ?
                        (
                          <p
                            id="edit-school-name-error"
                            className="text-caption text-danger-600"
                            role="alert"
                          >
                            {editErrors.schoolName}
                          </p>
                        ) :
                        null}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-academic-year">Tahun pelajaran default</Label>
                      <Input
                        id="edit-academic-year"
                        value={editForm.academicYear}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, academicYear: e.target.value }))}
                        placeholder="2025/2026"
                        aria-invalid={editErrors.academicYear !== undefined}
                        aria-describedby={editErrors.academicYear !== undefined
                          ? "edit-academic-year-error"
                          : undefined}
                      />
                      {editErrors.academicYear !== undefined ?
                        (
                          <p
                            id="edit-academic-year-error"
                            className="text-caption text-danger-600"
                            role="alert"
                          >
                            {editErrors.academicYear}
                          </p>
                        ) :
                        null}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-semester">Semester template</Label>
                      <Select
                        {...(editForm.semester !== "" ? { value: editForm.semester } : {})}
                        onValueChange={(value) =>
                          setEditForm((prev) => ({
                            ...prev,
                            semester: value as Semester
                          }))}
                      >
                        <SelectTrigger id="edit-semester">
                          <SelectValue placeholder="Pilih semester" />
                        </SelectTrigger>
                        <SelectContent>
                          {SEMESTER_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-exam-type">Jenis ujian template</Label>
                      <Select
                        value={editForm.defaultExamType}
                        onValueChange={(value) =>
                          setEditForm((prev) => ({
                            ...prev,
                            defaultExamType: value as ClassTemplateForm["defaultExamType"]
                          }))}
                      >
                        <SelectTrigger
                          id="edit-exam-type"
                          aria-invalid={editErrors.defaultExamType !== undefined}
                        >
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
                      {editErrors.defaultExamType !== undefined ?
                        (
                          <p className="text-caption text-danger-600" role="alert">
                            {editErrors.defaultExamType}
                          </p>
                        ) :
                        null}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-duration">Durasi default template</Label>
                      <Input
                        id="edit-duration"
                        type="number"
                        min={1}
                        value={editForm.defaultDurationMinutes}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            defaultDurationMinutes: e.target.value
                          }))}
                        placeholder="60"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-exam-date">Tanggal ujian default</Label>
                      <Input
                        id="edit-exam-date"
                        type="date"
                        value={editForm.defaultExamDate}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            defaultExamDate: e.target.value
                          }))}
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="edit-instructions">Petunjuk default template</Label>
                      <Textarea
                        id="edit-instructions"
                        value={editForm.defaultInstructions}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            defaultInstructions: e.target.value
                          }))}
                        placeholder="Kerjakan dengan teliti."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <EmptyState
                  icon={<Users size={28} />}
                  title="Segera hadir"
                  description="Pengelolaan daftar siswa untuk kelas ini sedang dalam pengembangan."
                />
              </div>
            )}
        </div>
      </div>

      <AlertDialog
        open={pendingDeleteClass !== null}
        onOpenChange={(open) => !open && setPendingDeleteClass(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kelas?</AlertDialogTitle>
            <AlertDialogDescription>
              Kelas "{pendingDeleteClass?.name}" akan dihapus permanen.
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
