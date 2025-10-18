# Environment Variables Setup

## Main Project (riseup-seo)

Create `.env.local` in the project root:

```bash
# AI Generation API Endpoint
VITE_AI_API_URL=https://riseup-seo-proxy.vercel.app/api/ai-generate
```

**For Production**: Add the same variable to your Vercel project:
```bash
vercel env add VITE_AI_API_URL
# Enter: https://riseup-seo-proxy.vercel.app/api/ai-generate
```

---

## Proxy Project (riseup-seo-proxy)

Create `.env.local` in your proxy project root:

```bash
# Claude API Key (Primary)
ANTHROPIC_API_KEY=sk-ant-api03-...

# OpenAI API Key (Fallback)
OPENAI_API_KEY=sk-...
```

**For Production**: Add to Vercel project environment variables:

### Via Vercel Dashboard:
1. Go to your proxy project settings
2. Navigate to "Environment Variables"
3. Add:
   - `ANTHROPIC_API_KEY` = `sk-ant-api03-...`
   - `OPENAI_API_KEY` = `sk-...`

### Via Vercel CLI:
```bash
cd riseup-seo-proxy
vercel env add ANTHROPIC_API_KEY
# Paste your Claude key

vercel env add OPENAI_API_KEY
# Paste your OpenAI key
```

---

## Getting API Keys

### Anthropic Claude
1. Go to: https://console.anthropic.com/
2. Sign up/login
3. Navigate to "API Keys"
4. Create a new key
5. Copy key starting with `sk-ant-api03-`

### OpenAI
1. Go to: https://platform.openai.com/api-keys
2. Sign up/login
3. Click "Create new secret key"
4. Copy key starting with `sk-`

---

## Verification

### Check Main Project
```bash
cd riseup-seo
npm run dev
```

Open browser console, navigate to any page analysis, and check:
```javascript
console.log(import.meta.env.VITE_AI_API_URL)
// Should output: https://riseup-seo-proxy.vercel.app/api/ai-generate
```

### Check Proxy Project (Local)
```bash
cd riseup-seo-proxy
vercel dev
```

Test endpoint:
```bash
curl http://localhost:3000/api/ai-generate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"type":"keyword","url":"https://test.com","extractedData":{"title":"Test","metaDescription":"","headings":[],"firstParagraph":"AI tools","wordCount":100}}'
```

Should return JSON with suggestions.

### Check Proxy Project (Production)
After deploying:
```bash
curl https://riseup-seo-proxy.vercel.app/api/ai-generate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"type":"keyword","url":"https://test.com","extractedData":{"title":"Test","metaDescription":"","headings":[],"firstParagraph":"AI tools","wordCount":100}}'
```

---

## Security Checklist

- ✅ Never commit `.env.local` files (already in `.gitignore`)
- ✅ Never share API keys publicly
- ✅ Set environment variables in Vercel dashboard, not in code
- ✅ Rotate keys if accidentally exposed
- ✅ Monitor API usage in Anthropic/OpenAI dashboards
- ✅ Set up billing alerts in both platforms

