import { Button } from '@teacher-exam/ui'
import { RefreshCw } from 'lucide-react'

export interface RegenerateQuestionButtonProps {
  loading: boolean
  failedRetry: boolean
  disabled?: boolean
  onClick: () => void
  testId?: string
}

export function RegenerateQuestionButton({
  loading,
  failedRetry,
  disabled = false,
  onClick,
  testId,
}: RegenerateQuestionButtonProps) {
  const label = loading ? 'Meregenerate…' : failedRetry ? 'Coba lagi' : 'Regenerate'

  return (
    <Button
      size="sm"
      variant={failedRetry ? 'secondary' : 'primary'}
      disabled={disabled || loading}
      onClick={onClick}
      data-testid={testId}
      aria-busy={loading ? 'true' : undefined}
    >
      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} aria-hidden />
      {label}
    </Button>
  )
}
