import type { NextApiRequest, NextApiResponse } from 'next'

type SuccessResponse = {
  altText: string
  model: string
}

type ErrorResponse = {
  error: string
}

type ResponseData = SuccessResponse | ErrorResponse

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  const PROMPT = "Generate a concise, descriptive alt text for this image optimized for SEO and accessibility. Focus on what the image shows, not how it looks. Keep it under 125 characters. Return only the alt text, no quotes or extra text."

  try {
    const { imageUrl } = req.body

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' })
    }

    // Try Gemini first
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`
      
      let imagePart
      if (imageUrl.startsWith('data:')) {
        // Data URI
        const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/)
        if (!matches) throw new Error('Invalid data URI')
        imagePart = {
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        }
      } else {
        // HTTP URL
        imagePart = {
          fileData: { fileUri: imageUrl }
        }
      }

      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPT },
              imagePart
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 100,
          }
        }),
      })

      if (geminiRes.ok) {
        const data = await geminiRes.json()
        const altText = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (altText) {
          return res.status(200).json({
            altText: altText.trim(),
            model: 'gemini'
          })
        }
      }
      
      throw new Error('Gemini failed')
    } catch (geminiError) {
      console.warn('Gemini failed, trying OpenAI:', geminiError)
      
      // Fallback to OpenAI
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }],
          max_tokens: 100,
          temperature: 0.4,
        }),
      })

      if (!openaiRes.ok) {
        throw new Error('Both AI services failed')
      }

      const data = await openaiRes.json()
      const altText = data.choices?.[0]?.message?.content
      
      if (!altText) {
        throw new Error('No alt text generated')
      }

      return res.status(200).json({
        altText: altText.trim(),
        model: 'gpt-4o-mini'
      })
    }
  } catch (error: unknown) {
    console.error('Error:', error)
    
    if (error instanceof Error) {
      return res.status(500).json({ 
        error: error.message || 'Failed to generate alt text' 
      })
    }
    
    return res.status(500).json({ 
      error: 'Failed to generate alt text' 
    })
  }
}

