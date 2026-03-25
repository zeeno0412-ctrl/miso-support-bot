'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  submitted?: boolean
  issueNumber?: string
}

interface SubmissionRecord {
  issueNumber: string
  title: string
  type: string
  date: string
  messages: Message[]
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: '안녕하세요! 👋 **MISO 지원 챗봇**입니다.\n\n버그/장애 접수나 MISO 활용법 안내를 도와드립니다.\n무엇을 도와드릴까요?',
}

const QUICK_ACTIONS = [
  { label: '🐛 버그 접수', text: '버그를 신고하고 싶어요', disabled: false },
  { label: '✨ UX 개선 요청', text: 'UX 개선 요청을 하고 싶어요', disabled: false },
  { label: '➕ 기능 추가 요청', text: '기능 추가 요청을 하고 싶어요', disabled: false },
  { label: '📖 사용법 안내', text: '', disabled: true },
]

const COMPANY_OPTIONS = ['GS리테일', 'GS E&R', 'GS칼텍스', '기타']
const SCREEN_OPTIONS = ['에이전트', '위젯', '앱리스트', '워크플로우', '챗플로우', '기타']

const ENV_GROUPS = [
  { key: 'net', options: ['사내망', '외부망'] },
  { key: 'device', options: ['맥북', '윈도우'] },
  { key: 'browser', options: ['크롬', '엣지', '기타'] },
]

const TYPE_COLORS: Record<string, string> = {
  '버그 및 오류': '#ef4444',
  'UX 개선': '#4f6ef7',
  '기능 추가': '#10b981',
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [envSelections, setEnvSelections] = useState<Record<string, string>>({})
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([])
  const [activeIssue, setActiveIssue] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('miso-submissions')
    if (saved) setSubmissions(JSON.parse(saved))
  }, [])

  const displayMessages = activeIssue
    ? (submissions.find(s => s.issueNumber === activeIssue)?.messages ?? [])
    : messages

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages, loading])

  const resetChat = () => {
    setActiveIssue(null)
    setMessages([INITIAL_MESSAGE])
    setEnvSelections({})
    setInput('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const sendMessage = async (text?: string) => {
    const userText = text || input.trim()
    if (!userText || loading || activeIssue) return

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
      const newMsg: Message = {
        role: 'assistant',
        content: data.message || data.error || '오류가 발생했습니다.',
        submitted: data.submitted,
        issueNumber: data.issueNumber,
      }
      const finalMessages = [...newMessages, newMsg]
      setMessages(finalMessages)

      if (data.submitted && data.issueNumber) {
        const record: SubmissionRecord = {
          issueNumber: data.issueNumber,
          title: data.title || '접수 내역',
          type: data.type || '',
          date: new Date().toISOString(),
          messages: finalMessages,
        }
        const updated = [record, ...submissions]
        setSubmissions(updated)
        localStorage.setItem('miso-submissions', JSON.stringify(updated))
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '네트워크 오류가 발생했습니다.' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatMessage = (text: string) => {
    return text
      .replace(/```json[\s\S]*?```/g, '')
      .replace(/NEEDS_COMPANY_BUTTONS/g, '')
      .replace(/NEEDS_SCREEN_BUTTONS/g, '')
      .replace(/NEEDS_ENV_BUTTONS/g, '')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
      .trim()
  }

  const lastAssistantContent = [...messages].reverse().find(m => m.role === 'assistant')?.content ?? ''
  const showCompanyButtons = !loading && !activeIssue && lastAssistantContent.includes('NEEDS_COMPANY_BUTTONS')
  const showScreenButtons = !loading && !activeIssue && lastAssistantContent.includes('NEEDS_SCREEN_BUTTONS')
  const showEnvButtons = !loading && !activeIssue && lastAssistantContent.includes('NEEDS_ENV_BUTTONS')
  const showConfirmButtons = !loading && !activeIssue && lastAssistantContent.includes('"확인"이라고 답해주세요')

  const chipStyle: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: 20,
    border: '1px solid var(--border)',
    background: 'var(--surface2)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }

  const handleEnvConfirm = () => {
    if (!ENV_GROUPS.every(g => envSelections[g.key])) return
    const combined = ENV_GROUPS.map(g => envSelections[g.key]).join(' / ')
    sendMessage(`환경 정보: ${combined}`)
    setEnvSelections({})
  }

  const isFirstMessage = messages.length === 1 && !activeIssue

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '10px',
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
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>AX스쿼드 운영</div>
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{
          width: 260,
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 12px', borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={resetChat}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--accent)',
                background: activeIssue === null && messages.length === 1 ? 'var(--accent)' : 'transparent',
                color: activeIssue === null && messages.length === 1 ? '#fff' : 'var(--accent)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left',
              }}
            >
              ✏️ 신규로 접수하기
            </button>
          </div>

          <div style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              접수 내역 ({submissions.length})
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {submissions.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                접수 내역이 없습니다
              </div>
            ) : submissions.map(s => (
              <button
                key={s.issueNumber}
                onClick={() => setActiveIssue(s.issueNumber)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: activeIssue === s.issueNumber ? 'var(--surface2)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
                onMouseEnter={e => {
                  if (activeIssue !== s.issueNumber)
                    (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'
                }}
                onMouseLeave={e => {
                  if (activeIssue !== s.issueNumber)
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 600,
                    color: TYPE_COLORS[s.type] ?? 'var(--text-muted)',
                    background: `${TYPE_COLORS[s.type] ?? 'var(--border)'}18`,
                    padding: '2px 6px', borderRadius: 4,
                  }}>
                    {s.type || '기타'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(s.date)}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}
                  title={s.title}>
                  {s.title.length > 28 ? s.title.slice(0, 28) + '…' : s.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.issueNumber}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* 과거 접수 조회 배너 */}
          {activeIssue && (
            <div style={{
              padding: '10px 20px',
              background: 'var(--surface2)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12,
              fontSize: '13px', color: 'var(--text-secondary)',
            }}>
              <span>📋 접수 내역 조회 중 · <strong style={{ color: 'var(--text-primary)' }}>{activeIssue}</strong></span>
              <button
                onClick={resetChat}
                style={{
                  marginLeft: 'auto', padding: '4px 12px', borderRadius: 12,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer',
                }}
              >
                새 접수
              </button>
            </div>
          )}

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '24px 16px',
            display: 'flex', flexDirection: 'column', gap: '16px',
            maxWidth: 760, width: '100%',
            margin: '0 auto', alignSelf: 'center',
            boxSizing: 'border-box',
          }}>
            {displayMessages.map((msg, i) => (
              <div key={i} className="msg-enter" style={{
                display: 'flex', flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: 4,
              }}>
                {msg.role === 'assistant' && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: 4 }}>MISO 봇</div>
                )}
                <div style={{
                  maxWidth: '85%', padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                  background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  fontSize: '14px', lineHeight: '1.6',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                }}
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                />
                {msg.submitted && msg.issueNumber && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', borderRadius: 8,
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontSize: '13px', color: 'var(--success)',
                  }}>
                    ✅ Notion에 접수 완료 · <strong>{msg.issueNumber}</strong>
                  </div>
                )}
              </div>
            ))}

            {/* Quick actions */}
            {isFirstMessage && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 4 }}>
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.label}
                    onClick={() => !action.disabled && sendMessage(action.text)}
                    disabled={action.disabled}
                    style={{ ...chipStyle, cursor: action.disabled ? 'not-allowed' : 'pointer', opacity: action.disabled ? 0.4 : 1 }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Company buttons */}
            {showCompanyButtons && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 4 }}>
                {COMPANY_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => sendMessage(opt)} style={chipStyle}
                    onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--accent)'; (e.target as HTMLElement).style.color = 'var(--accent)' }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--text-secondary)' }}
                  >{opt}</button>
                ))}
              </div>
            )}

            {/* Screen buttons */}
            {showScreenButtons && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 4 }}>
                {SCREEN_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => sendMessage(opt)} style={chipStyle}
                    onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--accent)'; (e.target as HTMLElement).style.color = 'var(--accent)' }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--text-secondary)' }}
                  >{opt}</button>
                ))}
              </div>
            )}

            {/* Env buttons */}
            {showEnvButtons && (
              <div style={{ paddingLeft: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ENV_GROUPS.map(group => (
                  <div key={group.key} style={{ display: 'flex', gap: 8 }}>
                    {group.options.map(opt => {
                      const selected = envSelections[group.key] === opt
                      return (
                        <button key={opt}
                          onClick={() => setEnvSelections(prev => ({ ...prev, [group.key]: opt }))}
                          style={{ ...chipStyle, borderColor: selected ? 'var(--accent)' : 'var(--border)', color: selected ? 'var(--accent)' : 'var(--text-secondary)', background: selected ? 'var(--accent-subtle)' : 'var(--surface2)' }}
                        >{opt}</button>
                      )
                    })}
                  </div>
                ))}
                <button onClick={handleEnvConfirm}
                  disabled={!ENV_GROUPS.every(g => envSelections[g.key])}
                  style={{ ...chipStyle, alignSelf: 'flex-start', background: ENV_GROUPS.every(g => envSelections[g.key]) ? 'var(--accent)' : 'var(--surface2)', color: ENV_GROUPS.every(g => envSelections[g.key]) ? '#fff' : 'var(--text-muted)', border: 'none', cursor: ENV_GROUPS.every(g => envSelections[g.key]) ? 'pointer' : 'not-allowed' }}
                >선택 완료</button>
              </div>
            )}

            {/* Confirm buttons */}
            {showConfirmButtons && (
              <div style={{ display: 'flex', gap: 8, paddingLeft: 4 }}>
                <button onClick={() => sendMessage('확인')}
                  style={{ ...chipStyle, background: 'var(--accent)', color: '#fff', border: 'none' }}
                >✅ 확인</button>
                <button onClick={() => sendMessage('수정할게요')} style={chipStyle}
                  onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--accent)'; (e.target as HTMLElement).style.color = 'var(--accent)' }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--text-secondary)' }}
                >✏️ 수정할게요</button>
              </div>
            )}

            {loading && (
              <div className="msg-enter" style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ padding: '14px 18px', borderRadius: '4px 18px 18px 18px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <span key={i} className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block' }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {!activeIssue && (
            <div style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
              <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="메시지를 입력하세요... (Shift+Enter: 줄바꿈)"
                  rows={1}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 12,
                    border: '1px solid var(--border)', background: 'var(--surface2)',
                    color: 'var(--text-primary)', fontSize: '14px',
                    resize: 'none', outline: 'none', fontFamily: 'inherit',
                    lineHeight: '1.5', maxHeight: 120, overflowY: 'auto',
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
                <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                  style={{
                    width: 44, height: 44, borderRadius: 12, border: 'none',
                    background: input.trim() && !loading ? 'var(--accent)' : 'var(--surface2)',
                    color: input.trim() && !loading ? '#fff' : 'var(--text-muted)',
                    fontSize: '18px', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >↑</button>
              </div>
              <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: 8 }}>
                AX스쿼드 · 문의: 윤진호M
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
