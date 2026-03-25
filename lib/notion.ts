import { Client } from '@notionhq/client'

export const notion = new Client({
  auth: process.env.NOTION_API_KEY,
})

export interface IssueData {
  접수번호: string
  유형: '버그 및 오류' | 'UX 개선' | '기능 추가'
  게열사: string
  화면: string
  제목: string
  제보자: string
  상세내용: string
  재현경로: string
  리테일환경특이사항: boolean
  미소버전?: string
}

export async function createIssue(data: IssueData) {
  const response = await notion.pages.create({
    parent: { database_id: process.env.NOTION_DATABASE_ID! },
    properties: {
      '접수번호': {
        title: [{ text: { content: data.접수번호 } }]
      },
      '유형': {
        select: { name: data.유형 }
      },
      '게열사': {
        select: { name: data.게열사 }
      },
      '화면': {
        select: { name: data.화면 }
      },
      '제목': {
        rich_text: [{ text: { content: data.제목 } }]
      },
      '제보자': {
        rich_text: [{ text: { content: data.제보자 } }]
      },
      '작성일': {
        date: { start: new Date().toISOString().split('T')[0] }
      },
      'Progress': {
        select: { name: 'Open' }
      },
      '상세 내용': {
        rich_text: [{ text: { content: data.상세내용 } }]
      },
      '재현 경로': {
        rich_text: [{ text: { content: data.재현경로 } }]
      },
      '리테일 환경 특이사항': {
        checkbox: data.리테일환경특이사항
      },
      ...(data.미소버전 ? {
        '미소 버전': {
          rich_text: [{ text: { content: data.미소버전 } }]
        }
      } : {})
    }
  })
  return response
}

export async function saveConversationLog(
  sessionId: string,
  messages: { role: string; content: string }[]
) {
  // 대화 로그는 별도 DB가 있을 경우 사용, 현재는 콘솔 로그만
  console.log(`[Session ${sessionId}] Messages:`, messages.length)
}
