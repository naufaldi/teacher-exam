import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import { MathText } from './math-text.js'

type MarkdownMathProps = {
  markdown: string
}

export function MarkdownMath({ markdown }: MarkdownMathProps) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p>{renderMathChildren(children)}</p>,
        li: ({ children }) => <li>{renderMathChildren(children)}</li>,
        h1: ({ children }) => <h1>{renderMathChildren(children)}</h1>,
        h2: ({ children }) => <h2>{renderMathChildren(children)}</h2>,
        h3: ({ children }) => <h3>{renderMathChildren(children)}</h3>,
        strong: ({ children }) => <strong>{renderMathChildren(children)}</strong>,
        em: ({ children }) => <em>{renderMathChildren(children)}</em>,
        code: ({ children }) => <code>{children}</code>,
      }}
    >
      {markdown}
    </ReactMarkdown>
  )
}

function renderMathChildren(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === 'string') return <MathText text={child} />
    if (!isValidElement<{ children?: ReactNode }>(child)) return child
    if (isLiteralCodeElement(child)) return child
    return cloneElement(child, {
      children: renderMathChildren(child.props.children),
    })
  })
}

function isLiteralCodeElement(child: ReactElement<{ children?: ReactNode; node?: { tagName?: string } }>): boolean {
  return child.type === 'code' || child.type === 'pre' || child.props.node?.tagName === 'code'
}
