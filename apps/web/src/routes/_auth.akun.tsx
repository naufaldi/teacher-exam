import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@teacher-exam/ui"
import { DeleteAccountForm } from "../components/account/delete-account-form.js"

export const Route = createFileRoute("/_auth/akun")({
  component: AkunPage
})

function AkunPage() {
  return (
    <div className="max-w-xl">
      <PageHeader
        title="Akun"
        subtitle="Hapus akun beserta data yang tersimpan untuk guru ini."
      />
      <DeleteAccountForm />
    </div>
  )
}
