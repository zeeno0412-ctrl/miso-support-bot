import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MISO 지원 챗봇',
  description: 'MISO 장애 접수 및 활용 가이드',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
