# Backend Serverless Function for AI Generation

Deploy this to your `riseup-seo-proxy` Vercel project as `api/ai-generate.ts`

## Installation

In your proxy project, install the required packages:

```bash
npm install @anthropic-ai/sdk openai
```

## Environment Variables

Add these to your Vercel project environment variables:

```bash
ANTHROPIC_API_KEY=your_claude_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

## Code: `api/ai-generate.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export const config = {
    runtime: 'edge',
    maxDuration: 30,
}

// Initialize clients
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
})

interface AIGenerateRequest {
    type: 'keyword' | 'title' | 'meta' | 'h1'
    url: string
    focusKeyword?: string
    extractedData: {
        title: string
        metaDescription: string
        headings: Array<{ level: string; text: string }>
        firstParagraph: string
        wordCount: number
        openGraphData?: {
            title?: string
            description?: string
        }
    }
    pageName?: string
}

function escape(s?: string): string {
    return (s || '').replace(/\s+/g, ' ').trim()
}

function extractBrand(data: AIGenerateRequest['extractedData']): string {
    // Try to extract brand from title (usually after | or – separator)
    const titleParts = data.title.split(/\s+[\|–—]\s+/)
    if (titleParts.length > 1) {
        return titleParts[titleParts.length - 1].trim()
    }
    
    // Try OG data
    if (data.openGraphData?.title) {
        const ogParts = data.openGraphData.title.split(/\s+[\|–—]\s+/)
        if (ogParts.length > 1) {
            return ogParts[ogParts.length - 1].trim()
        }
    }
    
    return ''
}

function buildPrompt(req: AIGenerateRequest): string {
    const { type, url, focusKeyword, extractedData, pageName } = req
    const brand = extractBrand(extractedData)
    
    const context = `URL: ${url}
Page name: ${pageName || '(n/a)'}
Brand: ${brand || '(n/a)'}
Focus keyword: ${focusKeyword || '(not set)'}
Current Title: ${escape(extractedData.title)}
Current Meta Description: ${escape(extractedData.metaDescription)}
First paragraph: ${escape(extractedData.firstParagraph)}
Word count: ${extractedData.wordCount}
Headings: ${extractedData.headings.slice(0, 10).map(h => `${h.level}: ${escape(h.text)}`).join(' | ')}`

    if (type === 'keyword') {
        return `You are an SEO strategist. Task: propose 3 distinct, specific, intent-matched Main Keyword candidates for this page.

Context:
${context}

Rules:
- No generic terms (e.g., "software", "services", "blog").
- No keyword stuffing or duplicates across options.
- Align to the page's evident intent and subject.
- Include no brand suffixes.
- Each keyword should be 3-60 characters.
- Output JSON only: {"items": ["keyword 1", "keyword 2", "keyword 3"]} with no commentary.`
    }
    
    if (type === 'title') {
        return `You are an SEO copywriter. Generate 3 Page Title options.

Context:
${context}

Constraints:
- Each 30–90 characters.
- Include the focus keyword exactly once, naturally.
- Optional brand suffix (e.g., " | ${brand || 'Brand'}") if it improves clarity.
- No clickbait, no all-caps, no emojis.
- Compelling and descriptive.

Output JSON ONLY:
{"items": ["Title option 1", "Title option 2", "Title option 3"]}`
    }
    
    if (type === 'meta') {
        return `You are an SEO copywriter. Generate 3 Meta Description options.

Context:
${context}

Constraints:
- Each 40–200 characters.
- Include the focus keyword exactly once, naturally.
- Be descriptive, helpful, and clickworthy without clickbait.
- No promises you can't verify, no emojis, no quotes.
- Act as an elevator pitch for the page.

Output JSON ONLY:
{"items": ["Description 1", "Description 2", "Description 3"]}`
    }
    
    if (type === 'h1') {
        return `You are an SEO copywriter. Generate 3 H1 Heading options for this page.

Context:
${context}

Constraints:
- Concise, clear, human-readable.
- Include the focus keyword exactly once, naturally.
- No brand suffixes.
- No all-caps or emojis.
- Typically 40-80 characters.

Output JSON ONLY:
{"items": ["H1 option 1", "H1 option 2", "H1 option 3"]}`
    }
    
    return ''
}

async function generateWithClaude(prompt: string): Promise<string[]> {
    try {
        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            temperature: 0.7,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        })
        
        const text = message.content[0].type === 'text' ? message.content[0].text : ''
        
        // Parse JSON response
        try {
            const parsed = JSON.parse(text)
            if (Array.isArray(parsed.items)) {
                return parsed.items.slice(0, 3)
            }
        } catch {
            // Fallback: split by lines
            const lines = text.split('\n').map(s => s.trim()).filter(Boolean)
            return lines.slice(0, 3)
        }
        
        return []
    } catch (error) {
        console.error('Claude error:', error)
        throw error
    }
}

async function generateWithOpenAI(prompt: string): Promise<string[]> {
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 500,
        })
        
        const text = completion.choices[0]?.message?.content?.trim() || ''
        
        // Parse JSON response
        try {
            const parsed = JSON.parse(text)
            if (Array.isArray(parsed.items)) {
                return parsed.items.slice(0, 3)
            }
        } catch {
            // Fallback: split by lines
            const lines = text.split('\n').map(s => s.trim()).filter(Boolean)
            return lines.slice(0, 3)
        }
        
        return []
    } catch (error) {
        console.error('OpenAI error:', error)
        throw error
    }
}

export default async function handler(req: Request) {
    // CORS headers
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
        })
    }
    
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        })
    }
    
    try {
        const body: AIGenerateRequest = await req.json()
        
        // Validate request
        if (!body.type || !['keyword', 'title', 'meta', 'h1'].includes(body.type)) {
            return new Response(JSON.stringify({ error: 'Invalid type parameter' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            })
        }
        
        if (!body.url || !body.extractedData) {
            return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            })
        }
        
        // Build prompt
        const prompt = buildPrompt(body)
        
        // Try Claude first, fallback to OpenAI
        let items: string[] = []
        let usedModel = 'claude'
        
        try {
            items = await generateWithClaude(prompt)
        } catch (claudeError) {
            console.error('Claude failed, falling back to OpenAI:', claudeError)
            usedModel = 'gpt-4o-mini'
            items = await generateWithOpenAI(prompt)
        }
        
        // Ensure we have valid items
        if (!items || items.length === 0) {
            throw new Error('No suggestions generated')
        }
        
        return new Response(
            JSON.stringify({
                type: body.type,
                items,
                model: usedModel,
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )
    } catch (error) {
        console.error('Error in AI generation:', error)
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Failed to generate suggestions',
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )
    }
}
```

## Testing Locally

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel dev` in your proxy project
3. Test with curl:

```bash
curl -X POST http://localhost:3000/api/ai-generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "keyword",
    "url": "https://example.com",
    "extractedData": {
      "title": "Example Site",
      "metaDescription": "Test",
      "headings": [],
      "firstParagraph": "This is a test page about AI tools",
      "wordCount": 100
    }
  }'
```

## Deployment

1. Push to your GitHub repo
2. Deploy via Vercel dashboard or CLI: `vercel --prod`
3. Add environment variables in Vercel project settings

