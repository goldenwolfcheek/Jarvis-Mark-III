import { useState, useEffect, useCallback, useRef } from 'react'

interface CodeEditorProps {
  filePath: string
  fileName: string
  onClose: () => void
}

// Simple keyword-based syntax highlighting for common languages
function getLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescriptreact',
    js: 'javascript', jsx: 'javascriptreact', mjs: 'javascript', cjs: 'javascript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
    java: 'java', kt: 'kotlin', cs: 'csharp',
    json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml', xml: 'xml',
    html: 'html', css: 'css', scss: 'scss', less: 'less',
    sh: 'shell', bash: 'shell', zsh: 'shell', bat: 'batch', cmd: 'batch', ps1: 'powershell',
    sql: 'sql', graphql: 'graphql', gql: 'graphql',
    dockerfile: 'dockerfile',
    vue: 'vue', svelte: 'svelte',
    md: 'markdown', txt: 'text',
  }
  return map[ext] || 'text'
}

// Keyword sets per language for basic highlighting
const KEYWORDS: Record<string, Set<string>> = {
  typescript: new Set(['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'class', 'extends', 'implements', 'interface', 'type', 'enum', 'import', 'from', 'export', 'default', 'as', 'async', 'await', 'new', 'this', 'super', 'typeof', 'instanceof', 'in', 'of', 'try', 'catch', 'finally', 'throw', 'void', 'null', 'undefined', 'true', 'false', 'readonly', 'private', 'protected', 'public', 'static', 'abstract', 'declare', 'namespace', 'module', 'keyof', 'infer', 'extends', 'satisfies']),
  typescriptreact: null as any, // uses typescript
  javascript: new Set(['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'class', 'extends', 'import', 'from', 'export', 'default', 'as', 'async', 'await', 'new', 'this', 'super', 'typeof', 'instanceof', 'in', 'of', 'try', 'catch', 'finally', 'throw', 'void', 'null', 'undefined', 'true', 'false', 'yield', 'static', 'get', 'set']),
  javascriptreact: null as any,
  python: new Set(['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'yield', 'lambda', 'pass', 'del', 'global', 'nonlocal', 'assert', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False', 'self', 'print', 'async', 'await']),
  go: new Set(['func', 'package', 'import', 'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'break', 'continue', 'struct', 'interface', 'type', 'var', 'const', 'map', 'chan', 'go', 'select', 'defer', 'nil', 'true', 'false', 'make', 'new', 'len', 'cap', 'append', 'error']),
  rust: new Set(['fn', 'let', 'mut', 'const', 'struct', 'enum', 'impl', 'trait', 'pub', 'use', 'mod', 'crate', 'self', 'super', 'return', 'if', 'else', 'for', 'while', 'loop', 'match', 'break', 'continue', 'move', 'ref', 'async', 'await', 'dyn', 'where', 'type', 'true', 'false', 'Some', 'None', 'Ok', 'Err', 'Self']),
  json: new Set([]),
  yaml: new Set([]),
  html: new Set(['html', 'head', 'body', 'div', 'span', 'p', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'img', 'link', 'meta', 'script', 'style', 'true', 'false', 'null']),
  css: new Set(['import', 'media', 'keyframes', 'font-face', 'supports', 'important']),
  shell: new Set(['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function', 'return', 'exit', 'echo', 'export', 'local', 'readonly', 'unset', 'source', 'cd', 'ls', 'grep', 'sed', 'awk', 'find', 'cat', 'echo', 'true', 'false']),
  sql: new Set(['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'NULL', 'TRUE', 'FALSE', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'UNION', 'ALL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END']),
}

// Copy the typescript keywords for derived languages
KEYWORDS.typescriptreact = KEYWORDS.typescript
KEYWORDS.javascriptreact = KEYWORDS.javascript

interface Token {
  text: string
  type: 'keyword' | 'string' | 'comment' | 'number' | 'type' | 'function' | 'operator' | 'punctuation' | 'plain'
}

function tokenizeLine(line: string, lang: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < line.length) {
    // Line comments
    if ((lang.startsWith('javascript') || lang === 'typescript' || lang === 'typescriptreact' ||
         lang === 'go' || lang === 'rust' || lang === 'java' || lang === 'csharp' ||
         lang === 'css' || lang === 'scss' || lang === 'less' || lang === 'vue' || lang === 'svelte') &&
        line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ text: line.slice(i), type: 'comment' })
      break
    }
    if (lang === 'python' || lang === 'ruby' || lang === 'shell' || lang === 'yaml') {
      if (line[i] === '#') {
        tokens.push({ text: line.slice(i), type: 'comment' })
        break
      }
    }

    // Hash comments for some others
    if ((lang === 'go' || lang === 'rust' || lang === 'sql') && line[i] === '#') {
      tokens.push({ text: line.slice(i), type: 'comment' })
      break
    }

    // Block comment start (simplified - single line only)
    if ((lang.startsWith('javascript') || lang === 'typescript' || lang === 'typescriptreact' ||
         lang === 'java' || lang === 'csharp' || lang === 'css' || lang === 'scss') &&
        line[i] === '/' && line[i + 1] === '*') {
      const end = line.indexOf('*/', i + 2)
      if (end !== -1) {
        tokens.push({ text: line.slice(i, end + 2), type: 'comment' })
        i = end + 2
        continue
      } else {
        tokens.push({ text: line.slice(i), type: 'comment' })
        break
      }
    }

    // Strings (double quotes)
    if (line[i] === '"') {
      let j = i + 1
      while (j < line.length && line[j] !== '"') {
        if (line[j] === '\\') j++
        j++
      }
      tokens.push({ text: line.slice(i, j + 1), type: 'string' })
      i = j + 1
      continue
    }

    // Strings (single quotes)
    if (line[i] === "'") {
      let j = i + 1
      while (j < line.length && line[j] !== "'") {
        if (line[j] === '\\') j++
        j++
      }
      tokens.push({ text: line.slice(i, j + 1), type: 'string' })
      i = j + 1
      continue
    }

    // Template literals
    if (line[i] === '`') {
      let j = i + 1
      while (j < line.length && line[j] !== '`') {
        if (line[j] === '\\') j++
        j++
      }
      tokens.push({ text: line.slice(i, j + 1), type: 'string' })
      i = j + 1
      continue
    }

    // Numbers
    if (/[0-9]/.test(line[i]) && (i === 0 || /[\s(,+\-*/=<>[\]{}:!&|^~]/.test(line[i - 1]))) {
      let j = i
      while (j < line.length && /[0-9xXa-fA-F._]/.test(line[j])) j++
      tokens.push({ text: line.slice(i, j), type: 'number' })
      i = j
      continue
    }

    // Words (identifiers / keywords)
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++
      const word = line.slice(i, j)
      const kwSet = KEYWORDS[lang]
      if (kwSet && kwSet.has(word)) {
        tokens.push({ text: word, type: 'keyword' })
      } else if (lang === 'typescript' || lang === 'typescriptreact') {
        // Type detection: words starting with uppercase after space/: are likely types
        const prevNonSpace = i > 0 ? line.slice(0, i).trimEnd().slice(-1) : ''
        if (/^[A-Z]/.test(word) && (prevNonSpace === ':' || prevNonSpace === '<' || prevNonSpace === ',')) {
          tokens.push({ text: word, type: 'type' })
        } else if (j < line.length && line[j] === '(') {
          tokens.push({ text: word, type: 'function' })
        } else {
          tokens.push({ text: word, type: 'plain' })
        }
      } else if (j < line.length && line[j] === '(') {
        tokens.push({ text: word, type: 'function' })
      } else {
        tokens.push({ text: word, type: 'plain' })
      }
      i = j
      continue
    }

    // Operators
    if (/[=+\-*/<>!&|^~%?:]/.test(line[i])) {
      let j = i
      while (j < line.length && /[=+\-*/<>!&|^~%?:]/.test(line[j])) j++
      tokens.push({ text: line.slice(i, j), type: 'operator' })
      i = j
      continue
    }

    // Punctuation
    if (/[{}()\[\];,.]/.test(line[i])) {
      tokens.push({ text: line[i], type: 'punctuation' })
      i++
      continue
    }

    // Whitespace and other
    tokens.push({ text: line[i], type: 'plain' })
    i++
  }

  return tokens
}

const TOKEN_COLORS: Record<Token['type'], string> = {
  keyword: 'text-jarvis-cyan',
  string: 'text-green-400',
  comment: 'text-jarvis-muted/60 italic',
  number: 'text-amber-400',
  type: 'text-yellow-300',
  function: 'text-blue-400',
  operator: 'text-jarvis-cyan/70',
  punctuation: 'text-jarvis-muted/70',
  plain: 'text-jarvis-text',
}

function HighlightedLine({ line, lang }: { line: string; lang: string }) {
  if (!line) return <span>{'\n'}</span>
  const tokens = tokenizeLine(line, lang)
  return (
    <>
      {tokens.map((token, i) => (
        <span key={i} className={TOKEN_COLORS[token.type]}>{token.text}</span>
      ))}
    </>
  )
}

export default function CodeEditor({ filePath, fileName, onClose }: CodeEditorProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

  const lang = getLanguage(fileName)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      const api = (window as any).electronAPI
      try {
        if (api?.readFile) {
          const result = await api.readFile(filePath)
          if (cancelled) return
          if (result?.error) setError(result.error)
          else { setContent(result.content || ''); setSaved(true) }
        } else {
          const res = await fetch(`http://localhost:11711/api/file?path=${encodeURIComponent(filePath)}`)
          if (!res.ok) throw new Error(`Status ${res.status}`)
          const data = await res.json()
          if (cancelled) return
          if (data?.error) setError(data.error)
          else { setContent(data.content || ''); setSaved(true) }
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to read file')
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [filePath])

  const handleSave = useCallback(async () => {
    setSaving(true)
    const api = (window as any).electronAPI
    try {
      if (api?.writeFile) {
        const result = await api.writeFile(filePath, content)
        if (result?.error) { setError(result.error); setSaving(false); return }
      } else {
        const res = await fetch(`http://localhost:11711/api/file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: filePath, content }),
        })
        if (!res.ok) throw new Error(`Status ${res.status}`)
      }
      setSaved(true)
      setSaveFlash(true)
      setTimeout(() => setSaveFlash(false), 1500)
    } catch (e: any) {
      setError(e.message || 'Failed to save file')
    }
    setSaving(false)
  }, [filePath, content])

  // Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    setSaved(false)
  }, [])

  // Sync scroll between textarea and highlight overlay
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])

  // Tab key inserts spaces
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newContent = content.slice(0, start) + '  ' + content.slice(end)
      setContent(newContent)
      setSaved(false)
      // Restore cursor position after React re-renders
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
  }, [content])

  const lines = content.split('\n')
  const lineCount = lines.length

  return (
    <div className="flex-1 flex flex-col h-full bg-jarvis-bg overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center h-9 bg-jarvis-surface/80 border-b border-jarvis-border/30 shrink-0">
        <div className="flex items-center h-full px-3 gap-2 bg-jarvis-bg/60 border-r border-jarvis-border/30">
          <span className="text-[10px]">📜</span>
          <span className="text-xs text-jarvis-text font-medium">{fileName}</span>
          <span className="text-[9px] text-jarvis-muted/50 uppercase">{lang}</span>
          {!saved && <span className="w-1.5 h-1.5 rounded-full bg-jarvis-cyan" />}
          <button onClick={onClose}
            className="ml-1 text-jarvis-muted hover:text-jarvis-error transition-colors text-xs leading-none">
            ✕
          </button>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3">
          {saveFlash && (
            <span className="text-[10px] text-jarvis-success animate-fade-in">✓ Saved</span>
          )}
          <button onClick={handleSave} disabled={saving || saved}
            className="text-[10px] px-2 py-0.5 rounded border border-jarvis-blue/40 text-jarvis-cyan hover:bg-jarvis-blue/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editor area */}
      {loading && (
        <div className="flex-1 flex items-center justify-center text-jarvis-muted text-sm">
          Loading...
        </div>
      )}
      {error && !loading && (
        <div className="flex-1 flex items-center justify-center text-jarvis-error text-sm px-8 text-center">
          {error}
        </div>
      )}
      {!loading && !error && (
        <div className="flex-1 flex overflow-hidden relative">
          {/* Line numbers */}
          <div className="w-12 bg-jarvis-surface/30 border-r border-jarvis-border/20 overflow-hidden shrink-0 pt-2 pb-4 select-none">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1} className="text-right pr-2 text-[11px] leading-[20px] text-jarvis-muted/40 font-mono">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code area with syntax highlighting overlay */}
          <div className="flex-1 relative overflow-hidden">
            {/* Highlight layer (behind textarea) */}
            <div ref={highlightRef}
              className="absolute inset-0 p-2 overflow-hidden pointer-events-none font-mono text-[13px] leading-[20px] whitespace-pre"
              aria-hidden="true"
            >
              {lines.map((line, i) => (
                <div key={i} className="h-[20px]">
                  <HighlightedLine line={line} lang={lang} />
                </div>
              ))}
            </div>

            {/* Transparent textarea on top for editing */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              className="absolute inset-0 p-2 bg-transparent text-transparent caret-jarvis-cyan text-[13px] leading-[20px] font-mono resize-none outline-none selection:bg-jarvis-cyan/20 w-full h-full"
              spellCheck={false}
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="h-6 bg-jarvis-surface/60 border-t border-jarvis-border/30 flex items-center px-3 text-[10px] text-jarvis-muted shrink-0">
        <span>{lineCount} lines</span>
        <span className="mx-2">·</span>
        <span>{content.length} chars</span>
        <span className="mx-2">·</span>
        <span className="uppercase">{lang}</span>
        <div className="flex-1" />
        <span title={filePath} className="truncate max-w-[300px]">{filePath}</span>
      </div>
    </div>
  )
}
