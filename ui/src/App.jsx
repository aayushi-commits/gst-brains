import { useState, useRef, useEffect } from 'react'

const MAX_QUERIES = 10
const STATES = ['', 'central', 'Maharashtra', 'Gujarat', 'Karnataka', 'Delhi', 'Tamil Nadu', 'UP']
const SUGGESTED = [
  'Is manpower supply to a hospital exempt from GST?',
  'What is the GST rate on renting commercial property?',
  'Are legal services taxable under GST?',
]

function CitationTag({ citation }) {
  const [open, setOpen] = useState(false)

  function handleClick() {
    if (citation.source_url) {
      window.open(citation.source_url, '_blank')
    } else {
      setOpen(o => !o)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="font-semibold">{citation.circular_no}</span>
        <span className="text-blue-300">·</span>
        <span className="text-blue-500">{citation.date}</span>
        {citation.state && (
          <>
            <span className="text-blue-300">·</span>
            <span className="text-blue-500 capitalize">{citation.state}</span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-30">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-xs font-semibold text-gray-900">{citation.circular_no}</p>
              <p className="text-xs text-gray-400">{citation.date} · {citation.ruling_type} · {citation.state}</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-6">{citation.excerpt || 'No excerpt available.'}</p>
        </div>
      )}
    </div>
  )
}

function AssistantMessage({ msg }) {
  return (
    <div className="flex flex-col gap-2 max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
      </div>

      {msg.conflicts?.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2.5">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="space-y-0.5">
            {msg.conflicts.map((c, i) => (
              <p key={i} className="text-xs text-amber-800 font-medium">{c}</p>
            ))}
          </div>
        </div>
      )}

      {msg.citations?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {msg.citations.map((c, i) => (
            <CitationTag key={i} citation={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function UserMessage({ msg }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-xl bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
        {msg.content}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm">
        <div className="flex gap-1.5 items-center">
          {[0, 150, 300].map(delay => (
            <span
              key={delay}
              className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [state, setState] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(false)
  const [queryCount, setQueryCount] = useState(
    () => parseInt(localStorage.getItem('gstbrain_count') || '0')
  )
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendQuestion() {
    const text = question.trim()
    if (!text || loading || queryCount >= MAX_QUERIES) return

    setQuestion('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    const newCount = queryCount + 1
    setQueryCount(newCount)
    localStorage.setItem('gstbrain_count', newCount)

    try {
      const res = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          state: state || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
      })

      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        conflicts: data.conflicts,
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Could not reach the API: ${err.message}.\n\nMake sure the FastAPI server is running:\n  uvicorn api.main:app --reload --port 8000`,
        citations: [],
        conflicts: [],
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendQuestion()
    }
  }

  function handleInput(e) {
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const remaining = MAX_QUERIES - queryCount
  const hasFilters = state || dateFrom || dateTo

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-base select-none">
            G
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 text-base leading-tight">GSTBrain</h1>
            <p className="text-xs text-gray-400">GST circular intelligence</p>
          </div>
        </div>

        {/* Query counter */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          remaining === 0
            ? 'bg-red-50 border-red-200 text-red-700'
            : remaining <= 3
            ? 'bg-amber-50 border-amber-200 text-amber-700'
            : 'bg-gray-50 border-gray-200 text-gray-500'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            remaining === 0 ? 'bg-red-400' : remaining <= 3 ? 'bg-amber-400' : 'bg-green-400'
          }`} />
          {queryCount} of {MAX_QUERIES} queries used
        </div>
      </header>

      {/* Chat */}
      <main className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="text-5xl mb-4 select-none">⚖️</div>
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">Ask a GST question</h2>
              <p className="text-sm text-gray-400 mb-8">
                Answers are grounded in CBIC circulars and notifications
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED.map(q => (
                  <button
                    key={q}
                    onClick={() => setQuestion(q)}
                    className="text-xs px-4 py-2 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) =>
            msg.role === 'user'
              ? <UserMessage key={i} msg={msg} />
              : <AssistantMessage key={i} msg={msg} />
          )}

          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 sticky bottom-0 shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-3xl mx-auto space-y-3">

          {/* Filter toggle */}
          <div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors"
            >
              <svg className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span>Filters</span>
              {hasFilters && (
                <>
                  {state && <span className="ml-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-medium">{state}</span>}
                  {(dateFrom || dateTo) && (
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-medium">
                      {dateFrom || '…'} → {dateTo || '…'}
                    </span>
                  )}
                </>
              )}
            </button>

            {showFilters && (
              <div className="mt-2 flex flex-wrap items-end gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">State</label>
                  <select
                    value={state}
                    onChange={e => setState(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {STATES.map(s => (
                      <option key={s} value={s}>{s || 'All states'}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">Date from</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">Date to</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                {hasFilters && (
                  <button
                    onClick={() => { setState(''); setDateFrom(''); setDateTo('') }}
                    className="text-xs text-gray-400 hover:text-red-500 py-1.5 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Query limit banner */}
          {remaining === 0 ? (
            <div className="flex items-center justify-between text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3 border border-red-200">
              <span>Query limit reached (10/10).</span>
              <button
                onClick={() => { setQueryCount(0); localStorage.setItem('gstbrain_count', '0') }}
                className="font-semibold underline hover:text-red-900 transition-colors"
              >
                Reset counter
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                placeholder="Ask a GST question… (Enter to send, Shift+Enter for new line)"
                rows={1}
                disabled={loading}
                className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white leading-relaxed disabled:opacity-50"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <button
                onClick={sendQuestion}
                disabled={!question.trim() || loading}
                className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors flex-shrink-0"
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
