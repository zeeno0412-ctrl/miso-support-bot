export async function callMisoManual(
  query: string,
  conversationId: string,
  user: string = 'miso-support-bot'
): Promise<{ answer: string; conversationId: string; messageId: string }> {
  const res = await fetch(`${process.env.MISO_MANUAL_API_URL}/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MISO_MANUAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      inputs: {},
      mode: 'blocking',
      conversation_id: conversationId,
      user,
    }),
    signal: AbortSignal.timeout(25000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MISO Manual API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return {
    answer: data.answer,
    conversationId: data.conversation_id,
    messageId: data.message_id,
  }
}
