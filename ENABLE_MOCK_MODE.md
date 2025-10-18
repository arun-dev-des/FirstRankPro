# Enable Mock Mode (Test Without Backend)

## Quick Fix for "Failed to fetch" Error

Create a file `.env.local` in your project root with:

```bash
VITE_USE_MOCK_AI=true
```

Then restart your dev server:

```bash
npm run dev
```

## What This Does

- **Mock Mode**: Returns fake AI suggestions instantly (no backend needed)
- **Test UI**: Verify all buttons, suggestion cards, and interactions work
- **Develop Safely**: Continue frontend work while setting up backend

## Mock Suggestions You'll See

- **Main Keyword**: Generic SEO-related keywords
- **Page Title**: Based on your current page title
- **Meta Description**: SEO best practice descriptions
- **H1 Heading**: Professional heading options

## When to Disable Mock Mode

Once you've deployed the real backend (following `BACKEND_FUNCTION.md`):

1. **Update `.env.local`**:
```bash
# VITE_USE_MOCK_AI=true  # Comment out or remove this line
VITE_AI_API_URL=https://riseup-seo-proxy.vercel.app/api/ai-generate
```

2. **Restart dev server**:
```bash
npm run dev
```

## Next Steps

### To Set Up Real AI Backend:

1. **Go to proxy project**:
```bash
cd /path/to/riseup-seo-proxy
```

2. **Install dependencies**:
```bash
npm install @anthropic-ai/sdk openai
```

3. **Create `api/ai-generate.ts`** (copy from `BACKEND_FUNCTION.md`)

4. **Get API keys**:
   - Claude: https://console.anthropic.com/
   - OpenAI: https://platform.openai.com/api-keys

5. **Add to Vercel**:
```bash
vercel env add ANTHROPIC_API_KEY
vercel env add OPENAI_API_KEY
```

6. **Deploy**:
```bash
vercel --prod
```

7. **Update your `.env.local`** (in main project) to use real API

---

**For now, just enable mock mode and test the UI!** ✨

