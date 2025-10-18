# Quick Start - AI Generation Feature

## ⚡ 5-Minute Setup

### 1. Get API Keys (2 min)
- **Claude**: https://console.anthropic.com/ → API Keys → Create Key
- **OpenAI**: https://platform.openai.com/api-keys → Create Secret Key

### 2. Backend Setup (2 min)
```bash
cd /path/to/riseup-seo-proxy
npm install @anthropic-ai/sdk openai
```

Copy `api/ai-generate.ts` from `BACKEND_FUNCTION.md`, then:
```bash
vercel env add ANTHROPIC_API_KEY
vercel env add OPENAI_API_KEY
vercel --prod
```

### 3. Frontend Setup (1 min)
```bash
cd /path/to/riseup-seo
echo 'VITE_AI_API_URL=https://riseup-seo-proxy.vercel.app/api/ai-generate' > .env.local
vercel env add VITE_AI_API_URL
vercel --prod
```

### 4. Test It
1. Open your deployed app
2. Go to any page analysis
3. Click "Generate new Main Keyword"
4. Wait ~3 seconds
5. See 3 AI suggestions!

---

## 📖 Full Documentation

- **Complete Setup**: `AI_GENERATION_SETUP.md`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`
- **Backend Code**: `BACKEND_FUNCTION.md`
- **Env Variables**: `ENV_TEMPLATE.md`

## 🎯 What It Does

Each section now has a "Generate" button with AI magic:

| Section | What It Generates | What User Does |
|---------|------------------|----------------|
| **Main Keyword** | 3 SEO keywords | Click "Save & Analyze" |
| **Page Title** | 3 titles (30-90 chars) | Copy → Set in Framer |
| **Page Description** | 3 metas (40-200 chars) | Copy → Set in Framer |
| **H1 Heading** | 3 headings | Copy → Set in Framer |

## 💡 Key Features

- ✨ Uses **Claude 3.5 Sonnet** (best quality)
- 🔄 Falls back to **GPT-4o-mini** if needed
- 💾 **Caches suggestions** per page
- 📊 Shows **character counts**
- 🎯 **SEO-optimized** with keyword placement
- 🚫 No API keys in frontend (server-only)

## 💰 Cost

~$0.001-0.003 per generation = **~$3-4/month** for typical usage

---

**Ready to go? Follow the 5-minute setup above! 🚀**

