import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  html?: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | string>
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { url } = req.query

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'URL parameter required' })
    return
  }

  try {
    console.log(`Fetching URL: ${url}`)
    
    // Validate URL
    const parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      res.status(400).json({ error: 'Invalid URL protocol' })
      return
    }

    // Fetch the content with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 seconds

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RiseupSEO/1.0; +https://riseup-seo.com)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      })

      console.log(`Response status: ${response.status}`)
      console.log(`Response headers:`, Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        res.status(response.status).json({ error: `HTTP ${response.status}: ${response.statusText}` })
        return
      }

      // Check content type
      const contentType = response.headers.get('content-type') || ''
      console.log(`Content type: ${contentType}`)
      
      if (!contentType.includes('text/html')) {
        res.status(415).json({ error: `Not an HTML page. Content-Type: ${contentType}` })
        return
      }

      const html = await response.text()
      console.log(`HTML length: ${html.length}`)
      
      if (!html) {
        res.status(500).json({ error: 'Empty response' })
        return
      }

      // Return the HTML content
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=3600')
      res.status(200).send(html)

    } finally {
      clearTimeout(timeoutId)
    }

  } catch (error: unknown) {
    console.error('Proxy error:', error)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        res.status(504).json({ error: 'Request timeout' })
      } else {
        res.status(500).json({ error: error.message })
      }
    } else {
      res.status(500).json({ error: 'Unknown error occurred' })
    }
  }
}