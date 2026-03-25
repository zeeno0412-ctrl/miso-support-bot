'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  submitted?: boolean
  issueNumber?: string
}

const QUICK_ACTIONS = [
  { label: '🐛 버그 접수', text: '버그를 신고하고 싶어요' },
  { label: '✨ UX 개선 요청', text: 'UX 개선 요청을 하고 싶어요' },
  { label: '➕ 기능 추가 요청', text: '기능 추가 요청을 하고 싶어요' },
  { label: '📖 사용법 안내', text: 'MISO 사용법을 알려주세요' },
  { label: '🖼️ 이미지 생성', text: '이미지 생성 기능은 어떻게 쓰나요?' },
]

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '안녕하세요! 👋 **MISO 지원 챗봇**입니다.\n\n버그/장애 접수나 MISO 활용법 안내를 도와드립니다.\n무엇을 도와드릴까요?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text?: string) => {
    const userText = text || input.trim()
    if (!userText || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.message || data.error || '오류가 발생했습니다.',
          submitted: data.submitted,
          issueNumber: data.issueNumber,
        },
      ])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '네트워크 오류가 발생했습니다.' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatMessage = (text: string) => {
    // 코드블록 제거 후 마크다운 간단 파싱
    return text
      .replace(/```json[\s\S]*?```/g, '')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
      .trim()
  }

  const isFirstMessage = messages.length === 1

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      background: 'var(--bg)',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36,
          borderRadius: '10px',
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
        }}>🤖</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>MISO 지원 챗봇</div>
          <div style={{ fontSize: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
            온라인
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
          AX스쿼드 운영
        </div>
      </header>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxWidth: 760,
        width: '100%',
        margin: '0 auto',
        alignSelf: 'center',
        boxSizing: 'border-box',
      }}>
        {messages.map((msg, i) => (
          <div key={i} className="msg-enter" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            gap: 4,
          }}>
            {msg.role === 'assistant' && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: 4 }}>MISO 봇</div>
            )}
            <div style={{
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface)',
              border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'var(--text-primary)',
            }}
              dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
            />
            {msg.submitted && msg.issueNumber && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px',
                borderRadius: 8,
                background: 'rgba(52, 211, 153, 0.1)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                fontSize: '13px',
                color: 'var(--success)',
              }}>
                ✅ Notion에 접수 완료 · <strong>{msg.issueNumber}</strong>
              </div>
            )}
          </div>
        ))}

        {/* Quick actions on first message */}
        {isFirstMessage && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 4 }}>
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.label}
                onClick={() => sendMessage(action.text)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: '1px solid var(--border)',
                  background: 'var(--surface2)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.borderColor = 'var(--accent)'
                  ;(e.target as HTMLElement).style.color = 'var(--accent)'
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.borderColor = 'var(--border)'
                  ;(e.target as HTMLElement).style.color = 'var(--text-secondary)'
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="msg-enter" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{
              padding: '14px 18px',
              borderRadius: '4px 18px 18px 18px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex', gap: 5, alignItems: 'center',
            }}>
              {[0,1,2].map(i => (
                <span key={i} className="typing-dot" style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--text-muted)', display: 'inline-block',
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}>
        <div style={{
          maxWidth: 760,
          margin: '0 auto',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요... (Shift+Enter: 줄바꿈)"
            rows={1}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--surface2)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              maxHeight: 120,
              overflowY: 'auto',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              width: 44, height: 44,
              borderRadius: 12,
              border: 'none',
              background: input.trim() && !loading ? 'var(--accent)' : 'var(--surface2)',
              color: input.trim() && !loading ? '#fff' : 'var(--text-muted)',
              fontSize: '18px',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ↑
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: 8 }}>
          AX스쿼드 · 문의: 윤진호M
        </div>
      </div>
    </div>
  )
}
