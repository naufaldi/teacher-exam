import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen } from 'lucide-react'
import { Button, EmptyState } from '@teacher-exam/ui'

export const Route = createFileRoute('/_auth/bank-soal')({
  component: BankSoalPage,
})

function BankSoalPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <EmptyState
        icon={<BookOpen size={24} className="text-text-tertiary" />}
        title="Bank Soal"
        description="Fitur Bank Soal segera hadir. Nantinya Anda bisa menyimpan, mengelola, dan menyusun ulang soal dari koleksi pribadi."
        action={
          <Button asChild variant="primary" size="md">
            <Link to="/dashboard">Kembali ke Dashboard</Link>
          </Button>
        }
      />
    </div>
  )
}
