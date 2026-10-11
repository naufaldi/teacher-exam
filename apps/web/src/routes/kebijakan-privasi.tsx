import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@teacher-exam/ui"
import { PublicPageShell } from "../components/layout/public-page-shell.js"

export const Route = createFileRoute("/kebijakan-privasi")({
  component: KebijakanPrivasiPage
})

function KebijakanPrivasiPage() {
  return (
    <PublicPageShell>
      <PageHeader title="Kebijakan privasi" subtitle="Ujian Sekolah" />
      <div className="flex max-w-2xl flex-col gap-4 text-body text-text-secondary">
        <p>
          Ujian Sekolah menyimpan akun yang dipakai untuk masuk. Akun itu bisa akun Google atau akun dev.
        </p>
        <p>Aplikasi juga menyimpan profil guru, ujian yang dibuat, dan PDF yang diunggah.</p>
        <p>Cookie sesi menyimpan status masuk. Cookie itu ada selama guru masih masuk.</p>
        <p>Menghapus akun menghapus data tersebut.</p>
      </div>
    </PublicPageShell>
  )
}
