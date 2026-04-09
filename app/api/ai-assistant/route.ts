import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface StoredMessage {
  id: string
  content: string
  sender: 'user' | 'ai'
  createdAt: string
}

// Simple in-memory store for AI assistant messages (use DB in production)
const conversationStore = new Map<string, StoredMessage[]>()

// Real AI responses using Google Gemini API
const getAIResponse = async (userMessage: string): Promise<string> => {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY is not configured. Please set it in your environment variables.')
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: userMessage,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE',
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const aiMessage = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiMessage) {
      throw new Error('No response from Gemini API')
    }

    return aiMessage
  } catch (error) {
    console.error('[AI Assistant] Gemini API error:', error)
    throw error
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const messages = conversationStore.get(userId) || []

    return NextResponse.json(messages)
  } catch (error) {
    console.error('[AI Assistant] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const userId = session.user.id
    const conversations = conversationStore.get(userId) || []

    // Add user message
    const userMsg: StoredMessage = {
      id: `msg_${Date.now()}_user`,
      content: message,
      sender: 'user',
      createdAt: new Date().toISOString(),
    }
    conversations.push(userMsg)

    // Get AI response
    let aiResponseText: string
    try {
      aiResponseText = await getAIResponse(message)
    } catch (aiError) {
      console.error('[AI Assistant] Failed to get AI response:', aiError)
      return NextResponse.json(
        {
          error: aiError instanceof Error ? aiError.message : 'Failed to generate AI response',
          details: 'Please check your GOOGLE_GEMINI_API_KEY environment variable and ensure you have credits',
        },
        { status: 503 }
      )
    }

    const aiMsg: StoredMessage = {
      id: `msg_${Date.now()}_ai`,
      content: aiResponseText,
      sender: 'ai',
      createdAt: new Date().toISOString(),
    }
    conversations.push(aiMsg)

    conversationStore.set(userId, conversations)

    return NextResponse.json({
      userMessage: userMsg,
      aiMessage: aiMsg,
      allMessages: conversations,
    })
  } catch (error) {
    console.error('[AI Assistant] POST error:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    conversationStore.delete(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[AI Assistant] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to clear messages' }, { status: 500 })
  }
}
