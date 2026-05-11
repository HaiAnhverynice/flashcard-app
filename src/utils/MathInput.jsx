import { useState, useRef, useEffect } from 'react'
import katex from 'katex'

/**
 * Converts plain typing shortcuts into LaTeX, then renders with KaTeX.
 * Desmos-style: type x^2 → renders as x²
 *
 * Conversion rules (applied to the raw input string):
 *   x^2        → x^{2}   (superscripts)
 *   x_2        → x_{2}   (subscripts)
 *   sqrt(x)    → \sqrt{x}
 *   pi         → \pi
 *   theta      → \theta
 *   alpha,beta,gamma,delta,epsilon,lambda,mu,sigma,omega → \<name>
 *   >=  <=  !=  → \geq \leq \neq
 *   ->          → \rightarrow
 *   inf         → \infty
 *   *           → \cdot
 */

// Convert user-friendly shorthand to valid LaTeX
function toLatex(raw) {
  let s = raw

  // Greek letters (order matters — longer first)
  const greeks = [
    'epsilon','lambda','sigma','theta','alpha','delta','gamma','omega',
    'beta','mu','pi',
  ]
  for (const g of greeks) {
    s = s.replace(new RegExp(`\\b${g}\\b`, 'gi'), `\\${g.toLowerCase()} `)
  }

  // Infinity
  s = s.replace(/\binf\b/gi, '\\infty ')

  // Arrows
  s = s.replace(/->/g, '\\rightarrow ')
  s = s.replace(/<-/g, '\\leftarrow ')

  // Relations
  s = s.replace(/>=/g, '\\geq ')
  s = s.replace(/<=/g, '\\leq ')
  s = s.replace(/!=/g, '\\neq ')

  // sqrt(...) → \sqrt{...}
  s = s.replace(/sqrt\(([^)]*)\)/g, '\\sqrt{$1}')

  // Multiplication dot (but not in \commands)
  s = s.replace(/(?<!\\)\*/g, '\\cdot ')

  // Auto-brace superscripts and subscripts with multi-char exponents
  // x^23 → x^{23},  x^{23} stays as-is
  s = s.replace(/\^(?!\{)(-?\d+(?:\.\d+)?)/g, '^{$1}')
  s = s.replace(/_(?!\{)(-?\d+(?:\.\d+)?)/g, '_{$1}')

  return s
}

function renderLatex(latex) {
  try {
    return katex.renderToString(latex, {
      displayMode: false,
      throwOnError: false,
      strict: false,
    })
  } catch {
    return null
  }
}

export default function MathInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = 'Type your answer…',
  style,
}) {
  const inputRef = useRef()
  const [focused, setFocused] = useState(false)

  // Always focus on mount / when disabled clears
  useEffect(() => {
    if (!disabled) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [disabled])

  const latex = toLatex(value)
  const rendered = renderLatex(latex)
  const hasContent = value.trim().length > 0

  // Show preview only when there's content that actually contains math-like chars
  const hasMath = hasContent && /[\^_\\{}]|sqrt|pi\b|theta|alpha|beta|gamma|delta|epsilon|lambda|sigma|omega|mu|inf\b|>=|<=|!=|->|\*/.test(value)

  const handleKey = (e) => {
    if (e.key === 'Enter' && !disabled && value.trim()) {
      e.preventDefault()
      onSubmit?.(value.trim())
    }
  }

  return (
    <div className="math-input-wrap" style={style}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`math-raw-input ${disabled ? 'math-disabled' : ''}`}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {hasMath && rendered && (
        <div
          className="math-preview"
          dangerouslySetInnerHTML={{ __html: rendered }}
          title="Live math preview"
        />
      )}
      {hasMath && (
        <div className="math-hint">math preview ↑</div>
      )}
    </div>
  )
}

// Also export the converter so Quiz can use it for answer comparison
export { toLatex }
