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
        // Rich context data for better AI suggestions (backward compatible)
        // New enhanced fields
        bodyTextExcerpt?: string
        urlSegments?: string[]
        structuredData?: any[]
        links?: {
            internal: Array<{ href: string; text: string; isNofollow: boolean }>
            external: Array<{ href: string; text: string; isNofollow: boolean }>
        }
        imageAlts?: string[]
        contentFeatures?: {
            // New numeric counts
            lists?: number
            tables?: number
            faqs?: number
            blockquotes?: number
            codeBlocks?: number
            // Legacy boolean flags
            hasLists?: boolean
            hasTables?: boolean
            hasFAQs?: boolean
            hasCode?: boolean
            hasImages?: boolean
            hasVideo?: boolean
        }
        // Legacy fields (still supported)
        structuredDataLegacy?: Array<{ type?: string; [key: string]: any }>
        fullTextExcerpt?: string
        internalLinks?: Array<{ href: string; text: string }>
        externalLinks?: Array<{ href: string; text: string }>
        imageAltTexts?: string[]
        // New framework detection fields
        framework?: string
        contentQuality?: {
            isTemplate: boolean
            qualityScore: number
            issues: string[]
        }
    }
    pageName?: string
}

function escape(s?: string): string {
    return (s || '').replace(/\s+/g, ' ').trim()
}

function detectFramework(html: string, extractedData: AIGenerateRequest['extractedData']): string {
    // Check for explicit template indicators in content
    const templateIndicators = [
        'Published with **Framer**',
        'template by',
        'template',
        'theme by',
        'designed by',
        'powered by framer',
        'built with framer'
    ];
    
    const contentToCheck = [
        extractedData.title,
        extractedData.metaDescription,
        extractedData.bodyTextExcerpt || '',
        extractedData.fullTextExcerpt || '',
        html // for footer/attribution text
    ].join(' ').toLowerCase();
    
    // Check if any template indicators are present
    const hasTemplateIndicators = templateIndicators.some(indicator => 
        contentToCheck.includes(indicator.toLowerCase())
    );
    
    // Additional check for generic template content patterns
    const genericTemplatePatterns = [
        'clean and modern',
        'responsive design',
        'premium template',
        'free template',
        'download template',
        'template for',
        'modern template'
    ];
    
    const hasGenericPatterns = genericTemplatePatterns.some(pattern =>
        contentToCheck.includes(pattern)
    );
    
    if (hasTemplateIndicators || hasGenericPatterns) {
        return 'template';
    }
    
    return 'business';
}

function analyzeContentQuality(extractedData: AIGenerateRequest['extractedData']): {
    isTemplate: boolean;
    qualityScore: number;
    issues: string[];
} {
    const issues: string[] = [];
    let qualityScore = 100;
    
    // Check title quality
    const title = extractedData.title.toLowerCase();
    if (title.includes('template')) {
        issues.push('Title contains "template"');
        qualityScore -= 30;
    }
    
    if (title.includes('clean and modern') || title.includes('responsive')) {
        issues.push('Generic template language in title');
        qualityScore -= 20;
    }
    
    // Check meta description quality
    const metaDesc = extractedData.metaDescription.toLowerCase();
    if (metaDesc.includes('template') || metaDesc.includes('theme')) {
        issues.push('Meta description mentions template/theme');
        qualityScore -= 25;
    }
    
    // Check for generic content patterns
    const contentText = [
        extractedData.bodyTextExcerpt || '',
        extractedData.fullTextExcerpt || '',
        extractedData.firstParagraph || ''
    ].join(' ').toLowerCase();
    
    const genericPatterns = [
        'lorem ipsum',
        'placeholder text',
        'sample content',
        'demo content',
        'coming soon',
        'under construction'
    ];
    
    genericPatterns.forEach(pattern => {
        if (contentText.includes(pattern)) {
            issues.push(`Contains generic content: ${pattern}`);
            qualityScore -= 15;
        }
    });
    
    // Check word count (templates often have minimal content)
    if (extractedData.wordCount < 100) {
        issues.push('Very low word count - likely template');
        qualityScore -= 20;
    }
    
    return {
        isTemplate: qualityScore < 70 || issues.length > 2,
        qualityScore,
        issues
    };
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

function buildRichContext(data: AIGenerateRequest['extractedData'], url: string): string {
    const parts: string[] = []
    
    // Content type from structured data
    const structured = (data.structuredData && data.structuredData.length > 0)
        ? data.structuredData
        : (data.structuredDataLegacy && data.structuredDataLegacy.length > 0)
            ? data.structuredDataLegacy
            : undefined
    if (structured) {
        const types = structured
            .map(sd => (sd as any).type || (sd as any)['@type'])
            .filter(Boolean)
            .join(', ')
        if (types) {
            parts.push(`Content Type: ${types}`)
        }
    }
    
    // URL hierarchy
    if (data.urlSegments && data.urlSegments.length > 0) {
        parts.push(`URL Path: /${data.urlSegments.join('/')}`)
        parts.push(`Page Depth: Level ${data.urlSegments.length}`)
    }
    
    // Content features (support both numeric counts and legacy booleans)
    if (data.contentFeatures) {
        const cf = data.contentFeatures
        const hasCounts = typeof cf.lists === 'number' || typeof cf.tables === 'number' || typeof cf.faqs === 'number' || typeof cf.blockquotes === 'number' || typeof cf.codeBlocks === 'number'
        if (hasCounts) {
            const segments: string[] = []
            if (cf.lists && cf.lists > 0) segments.push(`lists: ${cf.lists}`)
            if (cf.tables && cf.tables > 0) segments.push(`tables: ${cf.tables}`)
            if (cf.faqs && cf.faqs > 0) segments.push(`faqs: ${cf.faqs}`)
            if (cf.blockquotes && cf.blockquotes > 0) segments.push(`blockquotes: ${cf.blockquotes}`)
            if (cf.codeBlocks && cf.codeBlocks > 0) segments.push(`code blocks: ${cf.codeBlocks}`)
            if (segments.length > 0) {
                parts.push(`Content Features: ${segments.join(', ')}`)
            }
        } else {
            const features: string[] = []
            if (cf.hasLists) features.push('lists')
            if (cf.hasTables) features.push('comparison tables')
            if (cf.hasFAQs) features.push('FAQs')
            if (cf.hasCode) features.push('code examples')
            if (cf.hasImages) features.push('images')
            if (cf.hasVideo) features.push('video')
            if (features.length > 0) {
                parts.push(`Content Features: ${features.join(', ')}`)
            }
        }
    }
    
    // Text excerpt for context
    const excerptSource = data.bodyTextExcerpt || data.fullTextExcerpt || data.firstParagraph
    if (excerptSource) {
        const excerpt = escape(excerptSource)
        const truncated = excerpt.length > 500 ? excerpt.substring(0, 500) + '...' : excerpt
        parts.push(`Content Excerpt: ${truncated}`)
    }
    
    // Image alt texts for keyword context
    const imageAlts = (data.imageAlts && data.imageAlts.length > 0) ? data.imageAlts : data.imageAltTexts
    if (imageAlts && imageAlts.length > 0) {
        const alts = imageAlts.slice(0, 5).map(escape).join(' | ')
        parts.push(`Image Contexts: ${alts}`)
    }
    
    // Links for topical relationships (internal and external)
    const internalLinks = (data.links && Array.isArray(data.links.internal)) ? data.links.internal : data.internalLinks
    if (internalLinks && internalLinks.length > 0) {
        const links = internalLinks
            .slice(0, 5)
            .map((link: any) => escape(link.text))
            .filter(Boolean)
            .join(', ')
        if (links) {
            // Count nofollow if provided
            let nofollowCount = 0
            if (data.links && Array.isArray(data.links.internal)) {
                nofollowCount = data.links.internal.filter(l => (l as any).isNofollow).length
            }
            parts.push(`Related Topics: ${links}${nofollowCount ? ` (nofollow: ${nofollowCount})` : ''}`)
        }
    }

    const externalLinks = (data.links && Array.isArray(data.links.external)) ? data.links.external : data.externalLinks
    if (externalLinks && externalLinks.length > 0) {
        const links = externalLinks
            .slice(0, 3)
            .map((link: any) => escape(link.text))
            .filter(Boolean)
            .join(', ')
        if (links) {
            let nofollowCount = 0
            if (data.links && Array.isArray(data.links.external)) {
                nofollowCount = data.links.external.filter(l => (l as any).isNofollow).length
            }
            parts.push(`External References: ${links}${nofollowCount ? ` (nofollow: ${nofollowCount})` : ''}`)
        }
    }
    
    return parts.join('\n')
}

function buildPrompt(req: AIGenerateRequest): string {
    const { type, url, focusKeyword, extractedData, pageName } = req
    const brand = extractBrand(extractedData)
    const richContext = buildRichContext(extractedData, url)
    
    // Detect framework and analyze content quality
    const framework = detectFramework('', extractedData) // HTML would be passed here in real implementation
    const contentQuality = analyzeContentQuality(extractedData)
    
    const baseContext = `URL: ${url}
Page Name: ${pageName || '(n/a)'}
Brand: ${brand || '(n/a)'}
Content Type: ${framework}
Content Quality Score: ${contentQuality.qualityScore}/100
Quality Issues: ${contentQuality.issues.join(', ') || 'None'}
Focus Keyword: ${focusKeyword || '(not set)'}

== CURRENT PAGE ELEMENTS ==
Title: ${escape(extractedData.title)}
Meta Description: ${escape(extractedData.metaDescription)}
Main Headings: ${extractedData.headings.slice(0, 10).map(h => `${h.level}: ${escape(h.text)}`).join(' | ')}
Word Count: ${extractedData.wordCount}

== RICH CONTEXT ==
${richContext || 'No additional context available'}`

    if (type === 'keyword') {
        const templateGuidance = framework === 'template' 
            ? `\n== TEMPLATE CONTENT DETECTED ==
⚠️  This appears to be template/demo content. Focus on:
- Industry-specific keywords rather than generic template terms
- Business-specific value propositions and services
- Target audience-specific terminology
- AVOID template-related keywords: "template", "theme", "design", "modern", "clean", "responsive"
- AVOID generic terms: "solutions", "services", "company", "website"

Instead focus on:
- Specific business functions like "project management", "email marketing", "e-commerce"
- Target industries like "SaaS", "healthcare", "education", "finance"
- Specific use cases like "remote teams", "small business", "enterprise"`
            : '';
            
        return `You are an expert SEO keyword strategist with deep expertise in search behavior analysis, commercial intent detection, and conversion optimization. Your task is to generate 3 highly strategic, traffic-driving Main Keyword candidates.

== PAGE CONTEXT ==
${baseContext}
${templateGuidance}

== YOUR ANALYSIS PROCESS (Think Step-by-Step) ==

STEP 1: IDENTIFY PRIMARY SEARCH INTENT
Analyze the content and determine which intent dominates:
- INFORMATIONAL (60% of searches): Learning/understanding (how-to, what is, guide, tutorial, definition)
  → Users want knowledge → Content should educate → Keywords include question words
- COMMERCIAL INVESTIGATION (20%): Pre-purchase research (best, top, review, vs, comparison, alternative)
  → Users comparing options → Content should compare/evaluate → Keywords include qualifiers
- TRANSACTIONAL (15%): Ready to convert (buy, pricing, demo, signup, free trial, discount)
  → Users ready to act → Content should convert → Keywords include action verbs
- NAVIGATIONAL (5%): Brand/specific page seeking
  → Users know destination → Less relevant for keyword targeting

STEP 2: DETERMINE FUNNEL STAGE & KEYWORD STRATEGY
- TOP OF FUNNEL (Awareness): Broad informational keywords → Higher volume, lower conversion
- MIDDLE OF FUNNEL (Consideration): Comparison/solution keywords → Balanced volume & intent
- BOTTOM OF FUNNEL (Decision): Specific transactional keywords → Lower volume, high conversion

Match your keywords to where this page sits in the funnel based on its content depth and CTA presence.

STEP 3: ANALYZE COMPETITIVE LANDSCAPE
Consider:
- Keyword difficulty vs. page authority (be realistic about rankability)
- Search volume sweet spot (aim for 100-10,000 monthly searches for most pages)
- Commercial intent indicators (words like "buy", "best", "review" signal buyer intent)
- Long-tail opportunity (3-5 word phrases often have better conversion rates)

STEP 4: APPLY CONVERSION PSYCHOLOGY
Prioritize keywords that indicate:
- Problem awareness ("how to fix", "why is", "troubleshoot")
- Solution seeking ("best way to", "tools for", "platform for")
- Comparison intent ("vs", "alternative to", "compared to")
- Urgency/timing ("now", "today", "2024", "fast", "quick")
- Specificity (industry, role, use case modifiers)

== REQUIREMENTS FOR YOUR 3 KEYWORD OPTIONS ==

Generate 3 STRATEGICALLY DIFFERENT keywords:

**Option 1: PRIMARY TARGET (Balanced Volume + Intent)**
- Your best bet for ranking AND converting
- 3-6 word phrase that matches exact search intent
- Should have commercial value (even if informational)
- Include modifiers that indicate buyer stage (e.g., "for small business", "best", "how to choose")

**Option 2: LONG-TAIL VARIATION (Lower Competition, Higher Specificity)**
- 4-7 word highly specific phrase
- Addresses a particular sub-problem or use case
- Lower search volume but much higher conversion potential
- Often includes question words or specific scenarios

**Option 3: SEMANTIC/ALTERNATIVE PHRASING (Capture Different Search Behaviors)**
- Same core intent but different word choice
- How else might users phrase this search?
- Consider synonyms, abbreviations, casual vs. professional language
- Can target voice search patterns (more conversational)

== KEYWORD QUALITY CHECKLIST ==
Each keyword MUST pass ALL these tests:
✓ Matches the page's actual content (don't force irrelevant keywords)
✓ Something real humans type into Google (not awkward AI-generated phrases)
✓ Specific enough to indicate clear intent (not vague category terms)
✓ 3-60 characters in length
✓ NO brand names (unless the page is specifically about that brand)
✓ Contains commercial/conversion indicators when appropriate
✓ Reflects natural language patterns (how people actually search)

== CRITICAL AVOID LIST ==
❌ Single generic words: "software", "services", "solutions", "platform", "company"
❌ Overly broad categories with no specificity
❌ Keyword stuffing patterns: "best cheap affordable budget software"
❌ Template/design terms: "template", "theme", "modern design", "responsive"
❌ Internal jargon that users don't search for
❌ Brand-only terms (unless it's a brand comparison page)
❌ Impossible-to-rank terms without any modifiers (too competitive)

== EXAMPLES OF EXCELLENT KEYWORD THINKING ==

**Example 1: SaaS Product Page**
❌ BAD: "software", "project management", "tools"
✅ GOOD:
1. "project management software for remote teams" (Primary - balanced)
2. "how to manage distributed team projects effectively" (Long-tail - informational)
3. "asynchronous project collaboration tools" (Semantic - specific use case)

**Example 2: Blog Post/Guide**
❌ BAD: "email marketing", "how to email", "marketing tips"
✅ GOOD:
1. "email marketing automation for e-commerce" (Primary - commercial)
2. "how to reduce email unsubscribe rate" (Long-tail - specific problem)
3. "automated email sequences for abandoned cart" (Semantic - solution-focused)

**Example 3: Comparison/Review Content**
❌ BAD: "comparison", "best tools", "reviews"
✅ GOOD:
1. "mailchimp vs klaviyo for shopify stores" (Primary - direct comparison)
2. "best email marketing platform for small business 2024" (Long-tail - qualified)
3. "klaviyo alternatives with better pricing" (Semantic - alternative seeking)

== OUTPUT FORMAT ==
Return ONLY valid JSON with no markdown code blocks, no commentary, no explanation:
{"items": ["keyword 1", "keyword 2", "keyword 3"]}

Remember: These keywords should drive qualified traffic that CONVERTS, not just visits.`
    }
    
    if (type === 'title') {
        const contentTypeGuide = `
IF content has lists/numbered items → Use "X Ways/Steps/Tips to [benefit]" (numbers boost CTR by 36%)
IF content has comparison tables → Use "X vs Y: Which is Best for [use case]" or "X vs Y: Complete Comparison Guide 2024"
IF content has FAQs → Use "Everything About [topic]: Complete Guide with FAQs"
IF content is article/blog → Use problem-solution or benefit-driven format
IF content is product page → Use "[Product]: [Key Benefit] for [Target Audience]"
IF URL depth is deep (3+) → More specific, less brand focus (internal page, not homepage)`

        const templateGuidance = framework === 'template' 
            ? `\n== TEMPLATE CONTENT DETECTED ==
⚠️  This appears to be template/demo content. Focus on:
- Industry-specific titles rather than generic template terms
- Business-specific value propositions
- Target audience-specific terminology
- AVOID template-related words: "template", "theme", "design", "modern", "clean", "responsive"
- AVOID generic terms: "solutions", "services", "company", "website"

Instead focus on:
- Specific business functions like "project management", "email marketing", "e-commerce"
- Target industries like "SaaS", "healthcare", "education", "finance"
- Specific use cases like "remote teams", "small business", "enterprise"`
            : '';

        return `You are an expert SEO copywriter and conversion specialist with deep knowledge of click-through rate (CTR) optimization, search psychology, and SERP competitiveness. Your mission: create title tags that dominate search results and compel clicks.

== PAGE CONTEXT ==
${baseContext}
${templateGuidance}

== YOUR STRATEGIC PROCESS ==

STEP 1: UNDERSTAND THE SERP BATTLEFIELD
Your title competes with 10+ other results. To win clicks, you must:
- Stand out visually (use numbers, dates, brackets, power words)
- Trigger emotional response (curiosity, fear of missing out, desire for solution)
- Communicate clear value (what will they GET from clicking?)
- Match search intent precisely (give them what they're looking for)
- Build trust (specificity, credibility indicators, recency)

STEP 2: APPLY CTR PSYCHOLOGY PRINCIPLES
High-performing titles leverage:
- **Numbers** (boost CTR by 36%): "7 Ways", "2024 Guide", "10-Minute", "3-Step Process"
- **Power words**: Ultimate, Complete, Essential, Proven, Expert, Simple, Fast, Free
- **Specificity** (beats generic every time): "For E-commerce" vs "For Businesses"
- **Time indicators**: "2024", "Updated", "Latest", "New", "Today"
- **Brackets/Parentheses** (increase CTR 33%): "[2024 Update]", "(With Examples)", "[Free Template]"
- **Question titles** (for informational intent): "How Do You...?", "What Is...?", "Why Is...?"
- **Negative angles** (sometimes): "Without", "Stop Wasting", "Avoid These"

STEP 3: OPTIMIZE FOR SERP DISPLAY
- **Character sweet spot**: 50-60 characters display fully on desktop and mobile
- **Frontload keywords**: Most important words first (users scan left to right)
- **Brand placement**: Add " | BrandName" ONLY if:
  a) Title is under 50 chars (room for it)
  b) Brand adds credibility/recognition
  c) It's not obviously redundant

STEP 4: MATCH CONTENT TYPE & INTENT
${contentTypeGuide}

== CREATE 3 DISTINCT TITLE OPTIONS ==

Each title should use a DIFFERENT psychological trigger:

**Title 1: SPECIFICITY + NUMBERS (Logic-driven clicker)**
- Include specific numbers, data points, or list size
- Appeal to users who want concrete, actionable information
- Format: "[Number] [Adjective] [Topic] for [Specific Audience/Use Case]"
- Example: "7 Email Marketing Strategies for E-commerce (2024 Data)"

**Title 2: BENEFIT + URGENCY (Emotion-driven clicker)**
- Lead with the transformation/outcome
- Create mild urgency or FOMO
- Format: "[Achieve Outcome]: [How] in [Timeframe/Simplicity]"
- Example: "Double Your Conversion Rate: Simple Landing Page Changes That Work"

**Title 3: PROBLEM-SOLUTION (Pain-aware clicker)**
- Address a specific pain point directly
- Offer clear solution or path forward
- Format: "How to [Solve Problem] Without [Common Obstacle]" OR "[Problem]? Here's the Solution"
- Example: "Low Email Open Rates? 5 Subject Line Formulas That Get Clicks"

== ABSOLUTE REQUIREMENTS ==
Length constraints:
- Minimum: 30 characters (too short = looks spammy)
- Target: 50-60 characters (optimal display)
- Maximum: 90 characters (hard limit before truncation)

Content requirements:
✓ Include focus keyword ONCE, naturally integrated near the beginning
✓ Each title must be STRUCTURALLY different (not just word swaps)
✓ Clear value proposition visible at a glance
✓ Professional tone (no hype, no clickbait, no ALL CAPS)
✓ Match the actual page content (no deceptive promises)

Brand suffix rules:
- Add " | ${brand || 'BrandName'}" ONLY if:
  ✓ Total length stays under 70 characters
  ✓ Brand is recognizable and adds trust
  ✓ NOT redundant with URL domain visible in SERP

== FORBIDDEN ELEMENTS ==
❌ Clickbait words: "Amazing", "Unbelievable", "Shocking", "You Won't Believe", "Secret", "This One Trick"
❌ All-caps words, excessive punctuation (!!!), or emojis
❌ Vague promises: "Everything You Need", "All Your Questions Answered"
❌ Template-focused: "Modern Template", "Clean Design", "Responsive Theme"
❌ Duplicate structure across all 3 options (make them genuinely different)
❌ Keyword stuffing: repeating keyword variations awkwardly

== CTR-OPTIMIZED EXAMPLES WITH REASONING ==

**Example Set 1: SaaS Product Page**
✅ "Project Management for Remote Teams: Features, Pricing & Free Trial"
   → Why it works: Specific audience + clear page content + transactional keywords

✅ "Manage Distributed Teams 50% Faster with Async Collaboration"
   → Why it works: Specific metric + benefit + unique angle (async)

✅ "Remote Team Chaos? This Project Management Tool Keeps Everyone Aligned"
   → Why it works: Pain point question + solution promise + conversational

**Example Set 2: Educational Content**
✅ "Email Marketing Automation: Complete Guide for E-commerce [2024]"
   → Why it works: Clear scope + specific audience + recency + bracket CTR boost

✅ "Increase Email Revenue by 40%: Automation Strategies That Convert"
   → Why it works: Specific outcome + power word + conversion focus

✅ "How to Automate Email Marketing Without Losing Personalization"
   → Why it works: Common objection addressed + how-to format

**Example Set 3: Comparison Content**
✅ "Mailchimp vs Klaviyo: Which Email Platform for Shopify Stores?"
   → Why it works: Direct comparison + specific use case + question format

✅ "Mailchimp vs Klaviyo Comparison: Features, Pricing & Best Use Cases [2024]"
   → Why it works: Comprehensive signal + multiple decision factors + bracket

✅ "Switching from Mailchimp to Klaviyo? Here's What You Need to Know"
   → Why it works: Specific transition + helpful framing

== OUTPUT FORMAT ==
Return ONLY valid JSON with no markdown code blocks, no commentary:
{"items": ["Title 1", "Title 2", "Title 3"]}

Remember: Your goal is maximum CTR while maintaining 100% accuracy to page content.`
    }
    
    if (type === 'meta') {
        const templateGuidance = framework === 'template' 
            ? `\n== TEMPLATE CONTENT DETECTED ==
⚠️  This appears to be template/demo content. Focus on:
- Industry-specific descriptions rather than generic template terms
- Business-specific value propositions
- Target audience-specific terminology
- AVOID template-related words: "template", "theme", "design", "modern", "clean", "responsive"
- AVOID generic terms: "solutions", "services", "company", "website"

Instead focus on:
- Specific business functions like "project management", "email marketing", "e-commerce"
- Target industries like "SaaS", "healthcare", "education", "finance"
- Specific use cases like "remote teams", "small business", "enterprise"`
            : '';

        return `You are an expert SEO copywriter specializing in meta descriptions that maximize click-through rates. Your meta descriptions are the "ad copy" of organic search - they must sell the click in 155 characters or less.

== PAGE CONTEXT ==
${baseContext}
${templateGuidance}

== THE META DESCRIPTION PLAYBOOK ==

CORE PSYCHOLOGY: You have 2-3 seconds to convince someone to click YOUR result instead of the 9 others on the page. Your meta description must:
1. Hook attention immediately (first 5 words are critical)
2. Communicate specific value (what makes this worth reading?)
3. Include a call-to-action (what should they do?)
4. Build credibility (numbers, specifics, proof elements)
5. Match search intent precisely (give them what they searched for)

== PROVEN META DESCRIPTION FORMULAS ==

**Formula 1: BENEFIT + PROOF + CTA**
Structure: "[Specific Benefit/Outcome]. [Proof Element - numbers, data, testimonial]. [Clear CTA]."
Example: "Increase email open rates by 40% with subject line formulas backed by 50,000 campaigns. Get proven strategies plus templates."
→ Best for: Product pages, service pages, conversion-focused content

**Formula 2: PROBLEM + SOLUTION + FEATURE HIGHLIGHT**
Structure: "[Acknowledge Problem]? [Solution Overview]. Includes [specific features/resources]."
Example: "Struggling with low conversion rates? Discover 12 landing page optimization tactics. Includes A/B test templates and live examples."
→ Best for: Educational content, guides, how-to articles

**Formula 3: QUESTION + ANSWER + VALUE PROPOSITION**
Structure: "[User's Question]? [Brief Answer]. Learn [specific takeaways] in this [content type]."
Example: "Which project management tool for remote teams? Compare features, pricing, and integrations of 10 top platforms. Find your match."
→ Best for: Comparison content, reviews, decision-support content

**Formula 4: SOCIAL PROOF + TRANSFORMATION + CTA**
Structure: "Join [number] [audience] who [achieved outcome]. [What they'll get]. [CTA]."
Example: "Join 10,000+ marketers driving 2x more leads. Step-by-step email automation guide with workflows and templates. Start today."
→ Best for: Popular content, proven methods, community-backed solutions

== CREATE 3 DISTINCT META DESCRIPTIONS ==

Each should target a different psychological profile:

**Description 1: LOGIC-DRIVEN USER (Wants facts, numbers, comprehensive info)**
- Lead with data, statistics, or comprehensive scope
- Include specific numbers (list items, features, case studies)
- Mention tools, templates, or actionable resources
- Power words: "Complete", "Comprehensive", "Data-Driven", "Proven", "Step-by-Step"
- Example structure: "Comprehensive [topic] guide with [X features]. Backed by [data/research]. Includes [resources]."

**Description 2: ACTION-ORIENTED USER (Wants quick wins, ready to implement)**
- Start with active verbs (Discover, Learn, Get, Master, Optimize)
- Emphasize speed and ease ("in 10 minutes", "simple steps", "quick wins")
- Strong CTA at the end
- Power words: "Fast", "Simple", "Practical", "Ready-to-Use", "Actionable"
- Example structure: "[Action Verb] how to [achieve outcome] with [simple method]. [Specific benefit]. [Strong CTA]."

**Description 3: PROBLEM-AWARE USER (Experiencing pain, seeking solution)**
- Address the pain point directly (empathy first)
- Show understanding of their struggle
- Promise relief/solution
- Power words: "Struggling", "Frustrated", "Finally", "Solution", "Fix", "Overcome"
- Example structure: "[Pain point]? [Empathy + solution]. [Specific help they'll get]. [Reassuring CTA]."

== CRITICAL OPTIMIZATION RULES ==

**Character Length (Non-Negotiable):**
- Minimum: 120 characters (too short looks incomplete)
- Sweet spot: 140-155 characters (displays fully on all devices)
- Hard maximum: 160 characters (Google truncates after this)

**Content Requirements:**
✓ Focus keyword appears ONCE in first half (natural integration)
✓ At least ONE specific number or quantifiable element
✓ Clear call-to-action (Learn, Discover, Get, Compare, Try, Start, etc.)
✓ Benefit-oriented (focus on what user GETS, not what page HAS)
✓ Active voice (strong verbs, direct language)
✓ Sentence fragments OK (punchy, concise)
✓ Each description structurally DIFFERENT (not just word swaps)

**SERP-Specific Optimizations:**
- Front-load value (first 100 chars matter most - mobile preview)
- Use periods to create natural break points (easier scanning)
- Numbers and symbols stand out visually: % $ # ✓
- Punctuation creates rhythm: strategic commas, em dashes, periods

== CONTENT-TYPE SPECIFIC ENHANCEMENTS ==

Leverage the rich context data:
- **Has comparison tables?** → "Compare [X] side-by-side with feature breakdown"
- **Has FAQs?** → "Get answers to top [number] questions about [topic]"
- **Has code/examples?** → "Includes [X] code examples and live demos"
- **Has lists?** → Specify the count: "[X] strategies", "[X] techniques", "[X] tools"
- **Has templates/downloads?** → "Includes free [resource type] + templates"
- **Has data/research?** → "Backed by analysis of [X] data points" or "Research-based"

== FORBIDDEN ELEMENTS ==

❌ Clickbait phrases: "You won't believe", "Secret trick", "This one weird"
❌ Unverifiable claims: "Best in the world", "Guaranteed results", "100% success rate"
❌ Quotation marks (they break rendering in SERPs)
❌ Emojis (inconsistent display, looks unprofessional)
❌ All-caps words or excessive punctuation (!!!)
❌ Template/design terms: "modern template", "clean design", "responsive theme"
❌ Vague language: "many benefits", "various solutions", "great results"
❌ Duplicate wording across all 3 options (make them genuinely different)

== HIGH-CONVERTING EXAMPLES WITH BREAKDOWN ==

**Example Set 1: SaaS Product**
✅ "Manage remote teams 50% faster with async project management. Includes task boards, time tracking, and team chat. Start free trial."
   → 142 chars | Numbers | Features | CTA | Formula: Benefit + Features + CTA

✅ "Remote team chaos? Streamline projects with one centralized platform. See how 5,000+ teams collaborate asynchronously. Get demo."
   → 144 chars | Pain point | Social proof | CTA | Formula: Problem + Solution + Proof

✅ "Complete project management for distributed teams: Tasks, docs, chat, and time tracking in one tool. Try free for 14 days."
   → 140 chars | Comprehensive | Feature list | CTA | Formula: Scope + Features + Offer

**Example Set 2: Educational Content**
✅ "Master email marketing automation with 12 proven workflows. Backed by 50,000 campaigns. Includes templates and split-test examples."
   → 141 chars | Number | Proof | Resources | Formula: Benefit + Proof + Value-adds

✅ "Boost email revenue by 40% with smart automation. Learn trigger-based sequences, personalization tactics, and ROI tracking. Start now."
   → 145 chars | Specific outcome | Topics | CTA | Formula: Outcome + Content + CTA

✅ "Email automation frustrating? This step-by-step guide simplifies setup. Create drip campaigns, abandoned cart flows, and more. No coding."
   → 147 chars | Pain | Promise | Specifics | Reassurance | Formula: Problem + Solution + Details

**Example Set 3: Comparison**
✅ "Mailchimp vs Klaviyo: Compare features, pricing, and best use cases for e-commerce. Detailed breakdown with pros, cons, and recommendations."
   → 153 chars | Direct comparison | Decision factors | Content promise | Formula: Topic + What's compared + Depth

✅ "Choosing between Mailchimp and Klaviyo? See side-by-side feature comparison, pricing analysis, and 10 real user reviews. Make informed choice."
   → 154 chars | Question format | Multiple angles | CTA | Formula: Question + Content + Benefit

✅ "Klaviyo costs 3x more than Mailchimp—is it worth it? Analyze features, automation power, and ROI for Shopify stores. Get recommendation."
   → 148 chars | Hook with stat | Specific question | Targeted use case | CTA | Formula: Hook + Analysis + Outcome

== OUTPUT FORMAT ==
Return ONLY valid JSON with no markdown code blocks, no commentary:
{"items": ["Description 1", "Description 2", "Description 3"]}

Your mission: Write meta descriptions so compelling that users can't help but click.`
    }
    
    if (type === 'h1') {
        const templateGuidance = framework === 'template' 
            ? `\n== TEMPLATE CONTENT DETECTED ==
⚠️  This appears to be template/demo content. Focus on:
- Industry-specific headings rather than generic template terms
- Business-specific value propositions
- Target audience-specific terminology
- AVOID template-related words: "template", "theme", "design", "modern", "clean", "responsive"
- AVOID generic terms: "solutions", "services", "company", "website"

Instead focus on:
- Specific business functions like "project management", "email marketing", "e-commerce"
- Target industries like "SaaS", "healthcare", "education", "finance"
- Specific use cases like "remote teams", "small business", "enterprise"`
            : '';

        return `You are an expert UX copywriter and conversion specialist. Your H1 headings are the first thing visitors see on the page - they must instantly communicate value, build trust, and encourage deeper engagement.

== PAGE CONTEXT ==
${baseContext}
${templateGuidance}

== H1 VS TITLE TAG: CRITICAL DIFFERENCES ==

**TITLE TAG (for search engines & SERPs)**
- SEO-optimized, keyword-focused
- Designed to win clicks in search results
- Often includes brand name
- 50-60 characters ideal
- More formal, search-query aligned

**H1 HEADING (for human visitors on the page)**
- User experience focused, clarity first
- Designed to orient visitors who already clicked
- NO brand name (it's already in the logo/navigation)
- 40-80 characters (up to 100 if needed)
- More conversational, benefit-driven, engaging
- Can be MORE specific or expansive than title
- Should make sense WITHOUT seeing the title tag

**Key Insight:** Users who see your H1 have already clicked. Your job now is to:
1. Confirm they're in the right place (relevance)
2. Hook their interest to stay (engagement)
3. Guide them to take action (conversion)

== THE H1 STRATEGIC FRAMEWORK ==

**CLARITY BEATS CLEVERNESS**
- User should understand page value in 2 seconds
- No mystery, no wordplay, no "clever" vague headlines
- Be direct about what they'll get/learn/achieve

**EMOTIONAL RESONANCE**
- Speak to their goal, problem, or desire
- Use "you" language (speak TO them, not about topics)
- Create micro-commitment (if headline resonates, they'll read on)

**SCANNABILITY**
- Most users scan, don't read carefully
- Keep it short enough to parse quickly
- Most important words first (front-load value)

== CREATE 3 DISTINCT H1 OPTIONS ==

Each H1 should use a different format and psychological approach:

**H1 Option 1: DIRECT VALUE STATEMENT (Clear benefit/outcome)**
Format: "[Outcome/Transformation] for [Specific Audience]"
OR: "[Solution] That [Specific Benefit]"

Characteristics:
- Makes a bold promise or declares clear value
- Includes qualifier that shows specificity (for X, that Y)
- Active, assertive language
- Can include contrarian angle ("actually works", "without X")

Examples:
✅ "Email Marketing Automation That Actually Converts"
✅ "Project Management Built for Async Remote Teams"
✅ "Landing Page Optimization That Doubles Your Conversion Rate"

**H1 Option 2: QUESTION FORMAT (Engages reader directly)**
Format: "How Do You [Achieve Desired Outcome]?"
OR: "Looking for [Solution/Answer]?"
OR: "Why Is [Problem] Happening?"

Characteristics:
- Mirrors the question user searched with or is thinking
- Creates immediate engagement (questions trigger response)
- Should feel like you're reading their mind
- Can use "you" or general "how do" format

Examples:
✅ "How Do You Reduce Shopping Cart Abandonment by 30%?"
✅ "Looking for Email Marketing Software That Integrates with Shopify?"
✅ "Why Are Your Landing Pages Not Converting?"

**H1 Option 3: COMMAND/ACTION FORMAT (Empowering, instructional)**
Format: "[Action Verb] [Desired Outcome]"
OR: "Get [Specific Result] with [Method/Solution]"
OR: "[Number] Ways to [Achieve Goal]"

Characteristics:
- Starts with strong action verb (Get, Master, Build, Discover, Learn, Create, Stop, Start)
- Empowering tone (you CAN do this)
- Suggests transformation or achievement
- Works well for educational and how-to content

Examples:
✅ "Master Email Segmentation in 7 Days"
✅ "Build Your First Sales Funnel Without a Developer"
✅ "Stop Losing Customers at Checkout"

== CONTENT-TYPE SPECIFIC H1 GUIDANCE ==

Match your H1 to page structure:
- **Has numbered lists?** → "X Ways to [Outcome]" or "X [Topic] Strategies That [Result]"
- **Has comparison tables?** → "Choosing Between [A] and [B]? Here's Everything You Need to Know"
- **Has FAQs?** → "[Topic] Explained: Answers to Your Top Questions"
- **How-to/Tutorial?** → "How to [Achieve Goal]: Complete Step-by-Step Guide"
- **Product page?** → "[Product Category] for [Specific Use Case/Audience]"
- **Deep URL path (3+ levels)?** → Be very specific about sub-topic (not broad category)

== ABSOLUTE REQUIREMENTS ==

**Length:**
- Minimum: 30 characters (too short = unclear value)
- Ideal: 40-70 characters (optimal readability)
- Maximum: 100 characters (can go longer if needed for clarity)

**Content:**
✓ Focus keyword integrated ONCE, naturally
✓ NO brand name (brand is in logo/nav - redundant here)
✓ Can be different from title tag (often should be)
✓ Speaks directly to user or about their outcome
✓ Clear benefit or value visible immediately
✓ Professional but conversational tone
✓ Each option uses DIFFERENT format (not just wording variations)

**Readability:**
✓ Works as standalone statement (doesn't rely on context)
✓ No jargon or insider terms (unless target audience expects it)
✓ Active voice whenever possible
✓ Specific > Generic (always)

== FORBIDDEN ELEMENTS ==

❌ Brand suffixes: "Tool | BrandName", "Guide by Company"
❌ Generic welcomes: "Welcome to Our Site", "Home Page"
❌ Vague statements: "Best Solutions for Your Business", "Quality Services"
❌ Clickbait: "AMAZING Results!!!", "You Won't Believe This"
❌ All-caps, emojis, excessive punctuation
❌ Template-focused: "Modern Template for", "Clean Design Portfolio", "Responsive Theme"
❌ Exact duplication of title tag (can be similar but should add something)
❌ Keyword stuffing: unnaturally repeating variations

== EXCELLENT H1 EXAMPLES WITH REASONING ==

**Example Set 1: SaaS Product Page**
TITLE TAG: "Project Management Software for Remote Teams | BrandName"
✅ "Async Project Management for Distributed Teams"
   → Why: More specific (async vs generic), benefits-focused, no brand

✅ "Managing a Remote Team? Here's Your Central Workspace"
   → Why: Question format, speaks to user directly, promise of solution

✅ "Build High-Performing Remote Teams Without the Chaos"
   → Why: Command format, addresses pain (chaos), shows transformation

**Example Set 2: Educational Content**
TITLE TAG: "Email Marketing Guide: 12 Strategies to Increase Open Rates [2024]"
✅ "Email Marketing Strategies That Actually Get Opened"
   → Why: Direct value statement, addresses skepticism (actually), clear benefit

✅ "Why Are Your Emails Going Unopened?"
   → Why: Question format, triggers pain point, invites them to find answer

✅ "Master Email Open Rates: From 15% to 45% in 30 Days"
   → Why: Command format, specific transformation, time-bound promise

**Example Set 3: Comparison Content**
TITLE TAG: "Mailchimp vs Klaviyo: Email Platform Comparison [2024]"
✅ "Mailchimp or Klaviyo: Which Email Platform for Your E-commerce Store?"
   → Why: Question format, specific use case, direct relevance

✅ "Email Marketing Platform Comparison: Features, Pricing & Best Use Cases"
   → Why: Direct statement, clear scope, multiple decision factors

✅ "Find Your Perfect Email Marketing Platform in 5 Minutes"
   → Why: Command format, user benefit, time efficiency promise

== OUTPUT FORMAT ==
Return ONLY valid JSON with no markdown code blocks, no commentary:
{"items": ["H1 option 1", "H1 option 2", "H1 option 3"]}

Your mission: Create H1 headings that make visitors think "Yes, this is exactly what I need."`
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
        
        // Detect framework and analyze content quality
        // Note: In a real implementation, you would pass the HTML content here
        // For example: const framework = detectFramework(htmlContent, body.extractedData)
        const framework = detectFramework('', body.extractedData) // HTML would be passed here in real implementation
        const contentQuality = analyzeContentQuality(body.extractedData)
        
        // Add detection results to the request body
        body.extractedData.framework = framework
        body.extractedData.contentQuality = contentQuality
        
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
                framework: framework,
                contentQuality: contentQuality,
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
