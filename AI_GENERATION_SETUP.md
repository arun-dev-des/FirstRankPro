# AI Generation Feature - Setup Guide

## Overview

This feature adds AI-powered generation for:
- **Main Keyword** - 3 intent-matched keyword suggestions
- **Page Title** - 3 SEO-optimized title options (30-90 chars)
- **Meta Description** - 3 compelling description options (40-200 chars)
- **H1 Heading** - 3 clear heading options

Uses **Claude 3.5 Sonnet** (primary) with **GPT-4o-mini** fallback.

## Setup Steps

### 1. Backend Deployment (Proxy Project)

#### Install Dependencies
In your `riseup-seo-proxy` project:

```bash
npm install @anthropic-ai/sdk openai
```

#### Add Serverless Function
Create `api/ai-generate.ts` with the code from `BACKEND_FUNCTION.md` in this repo.

#### Configure Environment Variables
In your Vercel project settings (or `.env.local` for development):

```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

Get API keys from:
- Claude: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/api-keys

#### Deploy to Vercel
```bash
vercel --prod
```

Your endpoint will be available at:
```
https://riseup-seo-proxy.vercel.app/api/ai-generate
```

### 2. Frontend Configuration (Main Project)

#### Add Environment Variable
Create `.env.local` in your main project:

```bash
VITE_AI_API_URL=https://riseup-seo-proxy.vercel.app/api/ai-generate
```

For production, add this to your Vercel project environment variables.

#### Build and Deploy
```bash
npm run build
vercel --prod
```

## Usage

### User Workflow

1. **Navigate to any page** in the SEO analysis view
2. **Click a tab**: Main Keyword, Page Title, Page Description, or H1 Heading
3. **Click "Generate" button** with the magic wand icon
4. **Wait 2-5 seconds** - the button shows "Generating..."
5. **Review 3 AI suggestions** displayed below the button
6. **Choose an option**:
   - **Main Keyword**: Click "Use" to fill input, or "Save & Analyze" to save and re-analyze
   - **Title/Meta/H1**: Click "Copy" then manually update in Framer

### How It Works

#### For Main Keyword:
- AI analyzes: current title, meta, headings, first paragraph, URL
- Generates: 3 specific, intent-matched keywords
- User can: save directly and trigger re-analysis

#### For Page Title:
- AI analyzes: current title, keyword, page content, brand
- Generates: 3 titles (30-90 chars) with keyword naturally included
- User must: copy and set in Framer Page Settings → Title

#### For Meta Description:
- AI analyzes: current meta, keyword, page content
- Generates: 3 descriptions (40-200 chars) with keyword naturally included
- User must: copy and set in Framer Page Settings → Description

#### For H1 Heading:
- AI analyzes: current H1, keyword, page content
- Generates: 3 headings with keyword naturally included
- User must: copy and update text layer in Framer with Heading 1 style

## Caching

- **Suggestions** are cached per page in Framer plugin storage (`frame-ai`)
- **Cached suggestions** are auto-loaded when you return to a page
- **Cache persists** across page refreshes and plugin reopens
- **Regenerate** anytime by clicking the Generate button again

## Error Handling

If generation fails:
- **Red error banner** appears below the Generate button
- **Error message** explains what went wrong
- **Dismiss button** clears the error
- **Common errors**:
  - API timeout (try again)
  - API key invalid (check Vercel env vars)
  - Rate limit exceeded (wait a moment)

## Cost Estimation

### Claude 3.5 Sonnet Pricing (as of 2024)
- Input: $3 per million tokens
- Output: $15 per million tokens
- **Per generation**: ~$0.001-0.003 (approx 1000-2000 input + 200-500 output tokens)

### GPT-4o-mini Pricing (fallback)
- Input: $0.15 per million tokens
- Output: $0.60 per million tokens
- **Per generation**: ~$0.0003-0.001

### Monthly Estimates
- **10 pages/day** × 4 fields × 30 days = 1,200 generations
- **Estimated cost**: $1.20-3.60/month (mostly Claude)

## Development

### Test Locally

1. **Start proxy dev server**:
```bash
cd riseup-seo-proxy
vercel dev
```

2. **Update local env**:
```bash
# .env.local
VITE_AI_API_URL=http://localhost:3000/api/ai-generate
```

3. **Start main app**:
```bash
cd riseup-seo
npm run dev
```

### Debug Tips

#### Check Browser Console
- Look for `[useAIGeneration]` log messages
- Check network tab for `/api/ai-generate` requests

#### Check Vercel Logs
```bash
vercel logs
```

#### Test Backend Directly
```bash
curl -X POST https://riseup-seo-proxy.vercel.app/api/ai-generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "keyword",
    "url": "https://example.com",
    "extractedData": {
      "title": "Test Page | Brand",
      "metaDescription": "A test page",
      "headings": [{"level": "h1", "text": "Welcome"}],
      "firstParagraph": "This is about AI tools for SEO",
      "wordCount": 250
    }
  }'
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface                          │
│  (FocusKeywordSection, TitleSection, MetaSection, H1Section)│
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ ai.generate(type)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              useAIGeneration Hook                           │
│  - State: generating, error, suggestions                    │
│  - Cache: load/save to frame-ai storage                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ AIService.generate(payload)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                 AIService (Frontend)                        │
│  - POST to /api/ai-generate                                 │
│  - Timeout: 30s                                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTPS
                 ▼
┌─────────────────────────────────────────────────────────────┐
│          Vercel Edge Function (Backend)                     │
│  - Build prompt per type                                     │
│  - Try Claude 3.5 Sonnet                                     │
│  - Fallback to GPT-4o-mini                                   │
│  - Return: { type, items: string[] }                        │
└─────────────────────────────────────────────────────────────┘
```

## Security Notes

- ✅ **API keys** stored server-side only (Vercel env vars)
- ✅ **No sensitive data** sent to AI (only public page content)
- ✅ **CORS enabled** for your domain
- ⚠️ **Rate limiting** recommended (add in backend if needed)
- ⚠️ **Cost monitoring** recommended via Anthropic/OpenAI dashboards

## Troubleshooting

### "AI API URL not configured" Error
**Fix**: Add `VITE_AI_API_URL` to your `.env.local` or Vercel env vars

### "Request timed out" Error
**Cause**: AI API took >30 seconds
**Fix**: Try again, or check backend logs for issues

### Suggestions are gibberish
**Cause**: AI parsing failed
**Fix**: Check backend logs; AI might not have returned valid JSON

### Suggestions aren't saved between sessions
**Cause**: Framer plugin storage issue
**Fix**: Check browser console for `setNodeData` errors

### No suggestions appear after clicking Generate
**Cause**: Check network tab for failed request
**Fix**: Verify `VITE_AI_API_URL` is correct and backend is deployed

## Future Enhancements

Potential improvements:
- [ ] Bulk generation for all pages
- [ ] Regenerate individual suggestions
- [ ] Custom prompt overrides
- [ ] History of past suggestions
- [ ] A/B testing different options
- [ ] Auto-apply to Framer via API (if/when available)
- [ ] Multi-language support
- [ ] Brand voice customization

## Support

For issues:
1. Check browser console for frontend errors
2. Check Vercel logs for backend errors
3. Verify all env vars are set correctly
4. Test backend endpoint directly with curl
5. Review AI model status pages (Anthropic, OpenAI)

