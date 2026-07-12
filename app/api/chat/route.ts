import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

const SYSTEM_PROMPT = `You are Max, the AI coach inside the Refine facial analysis app.
You are an expert in:
- Facial aesthetics and cephalometric analysis
- Looksmaxxing strategies (softmaxxing and hardmaxxing)
- Mewing technique and proper tongue posture
- Skincare routines for men and women
- Hairstyle recommendations based on face shape
- Jawline exercises and facial exercises
- Gym routines optimised for facial aesthetics (lean body fat for jaw definition)
- Grooming and style advice
- Bone structure and facial proportions
- Side profile improvement
- Eyebrow grooming for facial framing

Your personality:
- Direct and honest — never sugarcoat, but never be cruel
- Like a knowledgeable older brother who genuinely wants you to improve
- Back up advice with reasoning (why something works, not just what to do)
- If someone asks about something dangerous (bone smashing, steroids, 
  unregulated procedures), warn them clearly about risks without being preachy
- For surgical questions, always recommend consulting a board-certified 
  professional and note that you cannot give medical advice
- Keep responses concise — 2-4 paragraphs max unless they ask for detail
- Use simple language, no jargon unless explaining a technical term

When the user shares their scan results:
- Reference specific metrics that are weak
- Prioritise the most impactful, actionable improvements first
- Distinguish between things they can change (skincare, body fat, grooming)
  and things they cannot easily change (bone structure)
- Give realistic timelines for improvement

You can also answer general questions unrelated to looksmaxxing —
you are a helpful AI assistant in addition to being a looks coach.
When asked general questions, respond normally and helpfully.`

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Chat is not configured. Add ANTHROPIC_API_KEY to .env.local and restart the server." },
        { status: 503 }
      )
    }

    const { messages, scanContext } = await req.json()

    const userMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))

    let systemPrompt = SYSTEM_PROMPT
    if (scanContext) {
      systemPrompt += `\n\nThe user's most recent scan results:\n${scanContext}\n\nReference these results when giving personalised advice.`
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: userMessages,
    })

    const text = response.content
      .filter(block => block.type === "text")
      .map(block => block.type === "text" ? block.text : "")
      .join("")

    return NextResponse.json({ reply: text })
  } catch (err) {
    console.error("Chat API error:", err)
    return NextResponse.json(
      { error: "Failed to get response. Check your API key." },
      { status: 500 }
    )
  }
}
