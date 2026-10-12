
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'

const API_URL = 'http://127.0.0.1:8000'

type ChatMessage = {
  id: number
  role: 'user' | 'assistant'
  content: string
  error?: boolean
  sources?: number[]
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [result, setResult] = useState('')
  const [uploaded, setUploaded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [asking, setAsking] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const nextMessageId = useRef(0)
  const conversationEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!selectedFile) {
      setPdfUrl('')
      return
    }

    const url = URL.createObjectURL(selectedFile)
    setPdfUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [selectedFile])

  useEffect(() => {
    if (!asking) return

    const startTime = Date.now()

    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
    }, 250)

    return () => window.clearInterval(interval)
  }, [asking])

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }, [messages, asking])

  function resetDocument() {
    setUploaded(false)
    setResult('')
    setQuestion('')
    setMessages([])
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    resetDocument()

    if (!file) {
      setSelectedFile(null)
      return
    }

    if (
      file.type !== 'application/pdf' &&
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      setSelectedFile(null)
      alert('Please select a PDF file.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setSelectedFile(null)
      alert('The PDF must be 10 MB or smaller.')
      return
    }

    setSelectedFile(file)
  }

  async function handleUpload() {
    if (!selectedFile || uploading || asking) return

    setUploading(true)
    resetDocument()

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || 'Upload failed')
      }

      const data = await response.json()

      setResult(
        `File: ${data.filename}\n` +
        `Pages: ${data.pages}\n` +
        `Characters: ${data.characters}\n\n` +
        `Preview:\n${data.text_preview}`
      )

      setUploaded(true)
    } catch (error) {
      setResult(
        error instanceof Error
          ? `Upload error: ${error.message}`
          : 'Upload failed.'
      )
    } finally {
      setUploading(false)
    }
  }

  async function handleAskQuestion() {
    const submittedQuestion = question.trim()

    if (!uploaded || !submittedQuestion || asking || uploading) {
      return
    }

    nextMessageId.current += 1

    setMessages((previous) => [
      ...previous,
      {
        id: nextMessageId.current,
        role: 'user',
        content: submittedQuestion,
      },
    ])

    setQuestion('')
    setElapsedSeconds(0)
    setAsking(true)

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: submittedQuestion,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || 'AI request failed')
      }

      const data = await response.json()
      console.log('AI API response:', data)

      
      const sources: number[] = Array.isArray(data?.sources)
      ? Array.from(
          new Set<number>(
            data.sources.filter(
              (page: unknown): page is number =>
                typeof page === 'number' &&
                Number.isInteger(page) &&
                page > 0
            )
          )
        ).sort((a: number, b: number) => a - b)
      : []


      nextMessageId.current += 1

      setMessages((previous) => [
        ...previous,
        {
          id: nextMessageId.current,
          role: 'assistant',
          content:
            typeof data?.answer === 'string' && data.answer.trim()
              ? data.answer
              : 'No answer was returned by the AI.',
          sources,
        },
      ])
    } catch (error) {
      nextMessageId.current += 1

      setMessages((previous) => [
        ...previous,
        {
          id: nextMessageId.current,
          role: 'assistant',
          content:
            error instanceof Error
              ? `Error: ${error.message}`
              : 'Unable to generate an answer.',
          error: true,
        },
      ])
    } finally {
      setAsking(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">✦</div>
          <span>DocuMind</span>
        </div>

        <div className="model-status">
          <span className="status-dot" />
          Local AI · Ollama
        </div>
      </header>

      <main className="dashboard">
        <div className="hero">
          <span className="eyebrow">
            AI DOCUMENT INTELLIGENCE
          </span>

          <h1>Chat with your documents.</h1>

          <p>
            Upload a PDF, extract its content, and get answers
            powered by your local AI model.
          </p>
        </div>

        <div className="workspace">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="step-label">STEP 01</span>
                <h2>Upload document</h2>
              </div>

              <span className="panel-icon">📄</span>
            </div>

            <label className="upload-zone">
              <span className="upload-symbol">↑</span>

              <strong>
                {selectedFile
                  ? selectedFile.name
                  : 'Choose a PDF document'}
              </strong>

              <span>PDF files only · Maximum 10 MB</span>

              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                disabled={uploading || asking}
              />
            </label>

            <button
              className="primary-button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading || asking}
            >
              {uploading
                ? 'Processing PDF...'
                : 'Upload & Analyze →'}
            </button>

            {uploading && (
              <div className="loading-area">
                <div className="progress-track">
                  <div className="progress-indeterminate" />
                </div>
                <p>Extracting text from your document...</p>
              </div>
            )}

            {uploaded && (
              <div className="success-message">
                <span>✓</span>
                Document processed successfully
              </div>
            )}

            {result && (
              <div className="document-preview">
                <h3>Document details</h3>
                <pre>{result}</pre>
              </div>
            )}
          </section>

          <section className="panel chat-panel">
            <div className="panel-heading">
              <div>
                <span className="step-label">STEP 02</span>
                <h2>Ask your document</h2>
              </div>

              <div className="chat-heading-actions">
                {messages.length > 0 && (
                  <button
                    type="button"
                    className="clear-chat-button"
                    onClick={() => setMessages([])}
                    disabled={asking}
                  >
                    Clear chat
                  </button>
                )}

                <span className="panel-icon">✧</span>
              </div>
            </div>

            <p className="section-description">
              Ask a question and let your local AI analyze
              the document.
            </p>

            {messages.length > 0 && (
              <div
                className="chat-history"
                aria-label="Conversation history"
                aria-live="polite"
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-message ${
                      message.role === 'user'
                        ? 'chat-user'
                        : 'chat-assistant'
                    }${message.error ? ' chat-error' : ''}`}
                  >
                    <div className="chat-message-label">
                      {message.role === 'user'
                        ? 'YOU'
                        : '✦ LOCAL AI'}
                    </div>

                    <div className="chat-message-content">
                      {message.role === 'assistant' &&
                      !message.error ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                        >
                          {message.content}
                        </ReactMarkdown>
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>

                    {message.role === 'assistant' &&
                      !message.error &&
                      message.sources &&
                      message.sources.length > 0 && (
                        <div className="message-sources">
                          <div className="sources-heading">
                            📖 Retrieved pages
                          </div>

                          <div className="source-list">
                            {message.sources.map((page) =>
                              pdfUrl ? (
                                <a
                                  key={page}
                                  className="source-chip"
                                  href={`${pdfUrl}#page=${page}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`Open PDF at page ${page}`}
                                >
                                  Page {page} ↗
                                </a>
                              ) : (
                                <span
                                  key={page}
                                  className="source-chip"
                                >
                                  Page {page}
                                </span>
                              )
                            )}
                          </div>

                          <p className="sources-note">
                            Pages retrieved for this answer.
                            Check the PDF to verify supporting
                            information.
                          </p>
                        </div>
                      )}
                  </div>
                ))}

                <div ref={conversationEndRef} />
              </div>
            )}

            <textarea
              className="question-input"
              placeholder={
                uploaded
                  ? 'What would you like to know about this document?'
                  : 'Upload a PDF first to start asking questions.'
              }
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              disabled={!uploaded || asking || uploading}
              rows={5}
            />

            <button
              className="primary-button"
              onClick={handleAskQuestion}
              disabled={
                !uploaded ||
                !question.trim() ||
                asking ||
                uploading
              }
            >
              {asking
                ? 'Generating answer...'
                : 'Ask AI ✦'}
            </button>

            {asking && (
              <div className="ai-loading">
                <div className="loading-header">
                  <span className="loading-pulse" />
                  <strong>AI is thinking</strong>
                  <span className="timer">
                    {elapsedSeconds}s elapsed
                  </span>
                </div>

                <div
                  className="progress-track"
                  role="progressbar"
                  aria-label="AI generating answer"
                  aria-valuetext="Processing, completion time unknown"
                >
                  <div className="progress-indeterminate" />
                </div>

                <p>
                  Ollama is processing your question.
                  This may take a little longer on
                  the first request.
                </p>
              </div>
            )}

            {!uploaded && (
              <div className="empty-state">
                <span>◇</span>
                <p>
                  Your document insights will appear here.
                </p>
              </div>
            )}
          </section>
        </div>

        <footer className="footer">
          Powered by React, FastAPI &amp; Ollama · Runs locally
        </footer>
      </main>
    </div>
  )
}

export default App
