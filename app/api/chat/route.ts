import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from '@/lib/system-prompt'
import { createIssue, IssueData } from '@/lib/notion'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 })
    }

    const text = content.text

    // JSON action 감지 및 Notion 저장
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1])
        if (parsed.action === 'submit_issue') {
          await createIssue(parsed.data as IssueData)
          return NextResponse.json({
            message: text,
            submitted: true,
            issueNumber: parsed.data.접수번호,
            title: parsed.data.제목,
            type: parsed.data.유형,
          })
        }
      } catch (e) {
        console.error('JSON parse error:', e)
      }
    }

    return NextResponse.json({ message: text, submitted: false })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
