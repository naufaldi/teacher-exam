import { FolderOpen, Sparkles } from 'lucide-react'
import { Button } from '@teacher-exam/ui'

interface HistoryEmptyProps {
  variant: 'no-match' | 'truly-empty'
  onReset?: () => void
  onGenerate?: () => void
}

function HistoryEmpty({ variant, onReset, onGenerate }: HistoryEmptyProps) {
  const isNoMatch = variant === 'no-match'

  return (
    <div className="bg-bg-surface border border-border-default rounded-md py-14 px-6">
      <div className="mx-auto max-w-[420px] text-center">
        <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-kertas-100 border border-border-default flex items-center justify-center text-text-tertiary">
          <FolderOpen size={22} />
        </div>

        <h3 className="text-h3 font-semibold text-text-primary mb-1.5">
          {isNoMatch
            ? 'Tidak ada lembar yang cocok'
            : 'Belum ada lembar tersimpan'}
        </h3>

        <p className="text-body-sm text-text-secondary leading-relaxed">
          {isNoMatch
            ? 'Coba ubah atau bersihkan filter untuk melihat lembar lainnya.'
            : 'Mulai buat lembar pertama Anda — pilih mata pelajaran dan topik, AI akan menyiapkan 20 soal pilihan ganda.'}
        </p>

        <div className="mt-6 inline-flex gap-2">
          {isNoMatch && onReset ? (
            <Button variant="secondary" size="md" onClick={onReset}>
              Reset filter
            </Button>
          ) : null}
          {!isNoMatch && onGenerate ? (
            <Button variant="primary" size="md" onClick={onGenerate}>
              <Sparkles size={14} />
              Generate lembar pertama
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export { HistoryEmpty }
