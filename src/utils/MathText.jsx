import katex from 'katex'
import 'katex/dist/katex.min.css'

/**
 * Renders a string that may contain LaTeX.
 * Use $...$ for inline math, $$...$$ for display (block) math.
 * Example: "Solve $x^2 + 1 = 0$"
 */
export default function MathText({ text, className }) {
  if (!text) return null

  // Split on $$...$$ first (display), then $...$ (inline)
  const parts = splitMath(text)

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === 'display') {
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(part.content, {
                  displayMode: true,
                  throwOnError: false,
                }),
              }}
            />
          )
        }
        if (part.type === 'inline') {
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(part.content, {
                  displayMode: false,
                  throwOnError: false,
                }),
              }}
            />
          )
        }
        return <span key={i}>{part.content}</span>
      })}
    </span>
  )
}

function splitMath(text) {
  const parts = []
  // Match $$...$$ or $...$
  const regex = /\$\$(.+?)\$\$|\$(.+?)\$/gs
  let last = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', content: text.slice(last, match.index) })
    }
    if (match[1] !== undefined) {
      parts.push({ type: 'display', content: match[1] })
    } else {
      parts.push({ type: 'inline', content: match[2] })
    }
    last = regex.lastIndex
  }

  if (last < text.length) {
    parts.push({ type: 'text', content: text.slice(last) })
  }

  return parts
}
