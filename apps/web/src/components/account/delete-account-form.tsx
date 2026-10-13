import { Button, Input, Label } from "@teacher-exam/ui"
import { type FormEvent, useState } from "react"

export function DeleteAccountForm() {
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const ready = confirm === "HAPUS" && !pending

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (confirm !== "HAPUS" || pending) return
    setPending(true)
    setError(null)
    void fetch("/api/account", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "HAPUS" })
    })
      .then((res) => {
        if (!res.ok) {
          setPending(false)
          setError("Akun belum terhapus. Ketik HAPUS persis seperti itu.")
          return
        }
        window.location.replace("/")
      })
      .catch(() => {
        setPending(false)
        setError("Akun belum terhapus. Coba lagi.")
      })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-sm border border-danger-border bg-bg-surface p-6"
    >
      <p className="text-body text-text-secondary">
        Menghapus akun menghapus akun Google atau akun dev, profil, ujian, dan PDF yang diunggah. Tindakan ini tidak
        bisa dibatalkan.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm-hapus">Ketik HAPUS untuk menghapus akun</Label>
        <Input
          id="confirm-hapus"
          name="confirm"
          autoComplete="off"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </div>
      {error ?
        <p role="alert" className="text-body-sm text-danger-fg">{error}</p> :
        null}
      <Button type="submit" variant="danger" disabled={!ready}>
        Hapus akun
      </Button>
    </form>
  )
}
