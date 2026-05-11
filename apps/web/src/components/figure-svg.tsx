import type { ReactNode } from 'react'
import type { FigureSpec } from '@teacher-exam/shared'
import { renderFigureSvg } from '../lib/figure-renderer.js'

type FigureSvgProps = {
  figure: FigureSpec
}

export function FigureSvg({ figure }: FigureSvgProps): ReactNode {
  return (
    <div
      className="my-3 flex justify-center"
      data-figure-svg
      dangerouslySetInnerHTML={{ __html: renderFigureSvg(figure) }}
    />
  )
}
