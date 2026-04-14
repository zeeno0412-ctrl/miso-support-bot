import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `아래 텍스트에서 MISO 버그/개선 접수에 필요한 정보를 추출해서 JSON으로만 응답해줘. 없으면 빈 문자열로.

텍스트: "${text}"

추출할 필드:
- name: 제보자 이름
- type: 유형 (버그 및 오류 / UX 개선 / 기능 추가 중 하나, 모르면 "")
- screen: 화면 (미소 AI / 에이전트 / 워크플로우 / 지식관리 / 도구 모음 / 기타 중 하나, 모르면 "")
- detail: 문제 상황 또는 요청 내용
- extraInfo: 재현 경로 또는 추가 정보
- env: 발생 환경 (예: 사내망 / 맥북 / 크롬)

반드시 JSON만 응답: {"name":"","type":"","screen":"","detail":"","extraInfo":"","env":""}`
      }]
    })

    const raw = (response.content[0] as any).text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    return NextResponse.json({ parsed })
  } catch (e) {
    console.error('Parse error:', e)
    return NextResponse.json({ parsed: {} })
  }
}
