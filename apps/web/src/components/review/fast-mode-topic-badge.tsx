import { Badge, Tooltip, TooltipContent, TooltipTrigger } from '@teacher-exam/ui'

export interface FastModeTopicBadgeProps {
  topic: string
}

export function FastModeTopicBadge({ topic }: FastModeTopicBadgeProps) {
  const shortLabel = topic.split(' ')[0] ?? topic

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          className="text-caption shrink-0 cursor-default"
          data-testid="fast-mode-topic-badge"
          aria-label={`Topik: ${topic}`}
        >
          {shortLabel}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        Topik: {topic}
      </TooltipContent>
    </Tooltip>
  )
}
