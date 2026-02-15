# Prompt Nova — 10 Asymmetric Ideas
> Generated 2026-02-15 via prompt-nova.txt world scan

---

## Signal Summary

Three things stood out that most people aren't connecting: (1) WebGPU just shipped in ALL major browsers including iOS Safari, which means GPU-accelerated AI inference in a browser tab is now a real platform — but almost nobody is building consumer products on it yet. (2) "Wikipedia as a doomscrollable feed" went viral on HN multiple times in the last 6 weeks, revealing massive demand for *content format transformation* as a product category. (3) Agentic coding crossed 80% autonomous resolution on real GitHub issues, but the only people using it are developers — the capability exists to build custom software for non-technical people and nobody has productized that for normal humans.

---

## Idea 1 — ZERO

**One-Line Pitch:** "ChatGPT but it runs entirely in your browser — no account, no server, no data ever leaves your machine."

**Core Concept:** A clean, fast AI chat interface that runs a capable LLM (Llama 3, Phi, Gemma) entirely in your browser tab using WebGPU acceleration. No API keys. No sign-up. No backend. You open a URL and start talking to AI. It works offline. It's free forever because there are zero server costs to scale.

**Why Now:** WebGPU shipped in all major browsers (including iOS Safari) in the last 3 months. WebLLM can now run 8B parameter models at 80% native speed in-browser. This was literally impossible 6 months ago on mobile.

**Why It's Asymmetric:** Every AI company is spending millions on GPU inference costs. This product has zero inference costs. The business model inverts: more users = same cost ($0). Every competitor charges $20/month for something this does for free. The moat isn't the model — it's the UX of "open a tab and it works."

**Distribution:** Launch on HN with "Show HN: I built ChatGPT with zero server costs." Post to r/privacy, r/selfhosted. The "no data leaves your machine" angle is catnip for privacy communities. The "free forever" angle spreads itself.

**30-Day Launch Path:**
- Week 1: Fork WebLLM, build a clean chat UI on top. Pick Phi-3.5 as default model (small, fast, good enough). Deploy as static site (Vercel/Cloudflare Pages — $0 hosting)
- Week 2: Add conversation history (IndexedDB, local only), model switching, dark/light mode
- Week 3: Add persona presets ("writing assistant," "code helper," "brainstorm partner"), export conversations as markdown
- Week 4: Launch. ProductHunt, HN, Reddit, Twitter

**Revenue Model:** Free core product forever. Pro tier ($8/month): larger models, RAG with local documents, voice input, multi-conversation management. The free tier IS the marketing — it costs nothing to run.

**Risk:** Model quality. In-browser 8B models are good but not Claude/GPT-level. Users may try it, find it dumber, and leave. Mitigation: position as "private AI" not "best AI" — different value prop.

---

## Idea 2 — DOOMLEARN

**One-Line Pitch:** "Turn any textbook, docs, or research paper into a TikTok-style infinite scroll feed."

**Core Concept:** Paste a URL, upload a PDF, or point it at any documentation site. The app breaks the content into bite-sized cards — each one a single concept, insight, or fact — and presents them as an infinite scroll feed with the same dopamine mechanics as social media. Swipe up = next card. Tap = dive deeper. Double-tap = save. Progress bar shows how much of the source you've absorbed.

**Why Now:** "Wikipedia as a doomscrollable social media feed" went viral on HN twice in 6 weeks (Jan and Feb 2026). "Doomscrolling Research Papers" also hit the front page. The pattern is clear: people want to learn but their attention is trained for scroll, not pages. Nobody has built the general-purpose version.

**Why It's Asymmetric:** Every edtech product fights the attention economy. This one surrenders to it and weaponizes it. The insight: don't make people focus harder — make the content match the consumption pattern they already have.

**Distribution:** "I turned the Rust Book into a TikTok feed" tweet with a screenshot. Devs share it because it's novel. Students share it because it's useful. Teachers share it because it works. Built-in virality: every feed has a "share this card" button that links back to the app.

**30-Day Launch Path:**
- Week 1: Build the content-to-cards pipeline. Use Claude API to chunk any text into self-contained insight cards (title, body, optional visual). Build the scroll UI (React, fullscreen cards, swipe gestures)
- Week 2: Add URL ingestion (fetch + parse), PDF upload, and documentation site crawler. Add "deck" concept (a scrollable feed from one source)
- Week 3: Add progress tracking, bookmarks, spaced repetition (resurface cards you saved at increasing intervals). Add social proof ("342 people learning this deck")
- Week 4: Launch with 10 pre-built decks (popular textbooks, React docs, Python tutorial, etc.)

**Revenue Model:** Free for public content. $9/month for private uploads (your company's docs, proprietary material). $29/month for teams (shared decks, progress dashboards).

**Risk:** Content chunking quality. If the AI makes bad cards, the whole experience breaks. Mitigation: let users flag bad cards, use feedback to improve prompts.

---

## Idea 3 — SHOPKEEPER

**One-Line Pitch:** "Describe your business in plain English. Get custom software in 24 hours."

**Core Concept:** A bakery owner says "I need to track daily orders, ingredient inventory, and delivery schedules." 24 hours later, they have a working web app — not a template, not Airtable, actual custom software with their business logic built in. Uses agentic coding (Claude Agent SDK / Codex) to generate, test, and deploy the app. Includes ongoing AI maintenance — "add a field for allergen warnings" and it ships an update.

**Why Now:** Claude Opus 4.6 autonomously resolves 80% of real GitHub issues. Agentic coding is reliable enough to generate and maintain small CRUD apps. Deployment is free (Vercel, Railway free tiers). The cost to build a simple app hit near-zero — but nobody has packaged this for non-developers.

**Why It's Asymmetric:** Every "no-code" tool makes non-technical people learn a new tool. This makes the tool learn the business. The user never sees code, never learns a platform, never configures anything. They describe what they need in the language they already use.

**Distribution:** Facebook groups for small business owners. "I got custom software for my flower shop for $49." The before/after is: spreadsheet chaos → clean custom dashboard. That's screenshot-worthy.

**30-Day Launch Path:**
- Week 1: Build the intake flow (conversational UI that asks about the business, what they track, what they need). Build the generation pipeline (Claude Agent SDK → Next.js app → auto-deploy to Vercel)
- Week 2: Handle 10 beta customers manually. Learn what breaks. Build templates for common patterns (inventory, scheduling, orders, CRM)
- Week 3: Add the "change request" pipeline — user describes a change in plain English, agent implements it, deploys update
- Week 4: Launch with 3 verticals: bakeries, salons, tutoring. $49 one-time for the app, $19/month for hosting + ongoing changes

**Revenue Model:** $49 to build. $19/month to host and maintain. Each customer costs ~$0.50 in AI inference to build and pennies/month for changes. Gross margin: 90%+.

**Risk:** Generated apps will have bugs. Non-technical users can't debug. Mitigation: include a "something's wrong" button that creates a support ticket with full context. Human-in-the-loop for the first 100 customers.

---

## Idea 4 — TONE CHECK

**One-Line Pitch:** "Grammarly checks your grammar. This checks how your words will make people feel."

**Core Concept:** Paste any text — email, Slack message, tweet, review, difficult conversation — and get an instant analysis of how it will be *perceived* by the recipient. Not grammar. Not style. Emotional tone. "This will read as passive-aggressive to most people." "Your sign-off feels abruptly cold after a warm message." "The phrase 'as I mentioned' implies the reader wasn't listening." Offers rewrites that preserve your meaning but adjust the tone.

**Why Now:** Remote work means the majority of professional communication is text. Text strips vocal tone, facial expressions, and body language. AI models (particularly Claude and GPT-5) are finally sophisticated enough at emotional nuance to catch subtext that even humans miss.

**Why It's Asymmetric:** Grammarly caught writing errors. Hemingway caught readability. Nobody has built a product around *emotional perception*. It's a different axis entirely — correct grammar can still be hurtful, and imperfect grammar can be warm.

**Distribution:** Chrome extension with a free tier. Every time it catches something, the user thinks "I almost sent that." That's a referral moment. Twitter demos of "I ran my breakup text through Tone Check" will spread organically.

**30-Day Launch Path:**
- Week 1: Build the core analysis engine. Claude API with a carefully tuned system prompt that evaluates emotional tone across 6 dimensions (warmth, assertiveness, respect, urgency, sincerity, clarity). Return a tone map + specific flags
- Week 2: Build a clean web UI (paste text → get analysis). Add rewrite suggestions. Add "audience context" selector (boss, friend, client, partner, stranger)
- Week 3: Build Chrome extension (right-click → check tone, or auto-analyze in Gmail/Slack compose boxes)
- Week 4: Launch free tier (5 checks/day). Pro at $7/month (unlimited + Chrome extension)

**Revenue Model:** Freemium. $7/month pro. Enterprise tier ($5/seat/month) for teams that want tone-consistent communication.

**Risk:** People may not want to know how they sound. The feedback could feel judgmental. Mitigation: frame it as "how this might land" not "what's wrong with your tone." Supportive, not corrective.

---

## Idea 5 — HALLWAY

**One-Line Pitch:** "A voice AI that argues with you, asks hard questions, and tells you when you're rationalizing."

**Core Concept:** Open the app. Start talking about a decision, idea, or problem. The AI listens — then pushes back. "What if you're wrong about the market size?" "You said this was urgent last month too. What changed?" "You keep saying 'probably.' Are you sure or aren't you?" It's not an assistant. It's a sparring partner. Designed for founders, creators, and anyone who makes decisions alone.

**Why Now:** Real-time voice AI with emotional awareness is new — Hume EVI, GPT-4o voice, Claude + voice APIs. Solo founders are the fastest-growing segment in tech. They have no co-founder to argue with, no board to challenge them. The voice modality matters: typing a debate with a chatbot feels wrong. Talking feels real.

**Why It's Asymmetric:** Every AI voice product is designed to be helpful and agreeable. This one is deliberately adversarial (within reason). The value is in the *friction*, not the agreement. Nobody is building AI products where the feature is disagreement.

**Distribution:** "I pitched my startup to an AI and it destroyed me in 4 minutes" — clip that, post it, watch it spread. Founders will share their Hallway sessions like people share therapy breakthroughs.

**30-Day Launch Path:**
- Week 1: Build the voice pipeline (Hume EVI or Deepgram + Claude API). Design the "sparring partner" system prompt — Socratic, challenging, tracks contradictions, remembers what you said earlier in the session
- Week 2: Add session recording + transcript with highlights ("moments of clarity," "unresolved contradictions," "strongest argument"). Post-session summary email
- Week 3: Add specialized modes: "pitch practice" (VC simulation), "decision audit" (devil's advocate on a specific choice), "idea stress test" (find the holes)
- Week 4: Launch with 3 free sessions, then $15/month for unlimited

**Revenue Model:** $15/month. High-value users (founders, execs) will pay more — $49/month for "executive sparring" with longer sessions and follow-up analysis.

**Risk:** Voice AI latency. If there's a 2-second delay, the conversational flow breaks. Mitigation: use streaming responses, cut interruption latency, accept imperfect-but-fast over perfect-but-slow.

---

## Idea 6 — REPLAY

**One-Line Pitch:** "Game tape for your conversations — who talked, where the energy was, what was left unsaid."

**Core Concept:** Record any meeting, sales call, or conversation. Replay doesn't just transcribe — it creates an analytics dashboard: talk-time ratio, energy graph (where voices got louder/faster), topic flow, commitment tracking ("you said you'd send the proposal by Friday"), and a "subtext report" flagging moments of tension, deflection, or enthusiasm. Sports teams review game tape. This is game tape for conversations.

**Why Now:** Meeting transcription is commoditized ($0.006/min via Deepgram). The differentiator is no longer "what was said" but "what happened." Frontier models can now do emotional and contextual analysis that was impossible a year ago.

**Why It's Asymmetric:** Otter, Fireflies, Granola — they all answer "what was said." Replay answers "what actually happened." Sales teams will use it to figure out where deals die. Managers will use it to understand team dynamics. Couples therapists will use it to show communication patterns.

**Distribution:** Free for personal use (5 recordings/month). Sales teams are the wedge — "your reps are talking 70% of the time; top performers talk 40%." That insight sells itself.

**30-Day Launch Path:**
- Week 1: Build the pipeline: audio upload → Deepgram transcription → speaker diarization → Claude analysis (talk ratios, energy detection from transcript caps/punctuation, topic segmentation, commitment extraction)
- Week 2: Build the dashboard UI. Timeline view with energy overlay. Speaker breakdown. Commitment list. "Key moments" carousel
- Week 3: Add live recording (browser-based, mobile app). Add "coaching insights" — AI-generated tips based on conversation patterns
- Week 4: Launch targeting sales teams and managers

**Revenue Model:** Free (5 recordings/month). Pro $19/month (unlimited recordings, coaching insights). Team $12/seat/month (shared analytics, cross-meeting patterns).

**Risk:** Privacy concerns — recording people is sensitive. Mitigation: require all-party consent notification built into the recording start. Position as "team improvement" not "surveillance."

---

## Idea 7 — FORKABLE

**One-Line Pitch:** "An app store where every app is a single file you can fork, customize, and deploy in 60 seconds."

**Core Concept:** A marketplace of micro-apps — each one a self-contained HTML file under 500 lines. Tip calculator for restaurant servers. Booking page for a barber. Inventory tracker for a florist. Recipe scaler for a home baker. Each app works offline, runs on any device, and can be forked with one click. Fork it, change the colors and text, deploy to your own URL. $5/month for hosting + custom domain.

**Why Now:** "Vibe coding" created millions of small apps, but they're trapped on GitHub (too technical) or app stores (too expensive). The Pixelpit model — one small game per day, single HTML file, works everywhere — proves this format works. Nobody has built the marketplace layer.

**Why It's Asymmetric:** App stores optimize for big apps. No-code tools optimize for complex apps. Nobody is serving the "I just need one tiny thing" market. A barber doesn't need Calendly — they need a single page where clients pick a time slot. That's 200 lines of HTML.

**Distribution:** Each app has a "Built on Forkable" footer link. Every deployed app is a distribution channel. Developers submit apps and earn a cut of hosting revenue. Build 50 apps yourself for launch day.

**30-Day Launch Path:**
- Week 1: Build the marketplace (browse, preview, fork). Build the deploy pipeline (fork → edit in browser → deploy to subdomain). Build 15 starter apps across 5 categories
- Week 2: Build the in-browser editor (simple: change text, colors, logo — not full code editing). Build 15 more apps. Add categories: food, services, fitness, retail, personal
- Week 3: Add developer submissions. Revenue share: developer gets 30% of hosting fees their apps generate. Add "request an app" feature
- Week 4: Launch with 50+ apps. Target small business Facebook groups, indie hacker communities, Etsy seller forums

**Revenue Model:** $5/month per deployed app (hosting + custom domain + SSL). Developer rev share. At 1,000 deployed apps = $5K MRR.

**Risk:** People might fork and self-host, bypassing payment. Mitigation: the value is the one-click deploy + custom domain + updates, not the code itself. Make it easier to pay than to DIY.

---

## Idea 8 — FIRST FRAME

**One-Line Pitch:** "One photo of your product → a professional video ad in 30 seconds."

**Core Concept:** A small business owner takes a phone photo of their product (a cake, a pair of shoes, a candle). The app generates a 15-second professional video ad — with motion, music, text overlays, and platform-specific formatting (Instagram Reels, TikTok, YouTube Shorts). Not a slideshow. Actual product motion, camera movement, and professional-feeling composition.

**Why Now:** Seedance 2.0 (ByteDance's video model) generates hyper-realistic video from a single photo — it went so viral it got 70 million views on Weibo in a week. Video generation from images just crossed the "good enough for social media" threshold. Small businesses need video content but can't afford videographers.

**Why It's Asymmetric:** Canva does image templates. CapCut does video editing. Neither does "photo → finished video ad." The workflow compression is 10x: instead of shoot → edit → add music → format, it's snap → done.

**Distribution:** The output IS the distribution. Every generated video is content the business posts on social media. Add a "Made with First Frame" watermark on the free tier. Small business owners show each other — "how did you make that video?" Word of mouth in local business communities.

**30-Day Launch Path:**
- Week 1: Build the pipeline: photo upload → image-to-video API (Seedance, Runway, or Kling) → add text overlay + music → render in platform formats. Simple web UI
- Week 2: Add template styles ("luxury," "playful," "minimalist," "bold sale"). Add text customization (headline, price, CTA). Add music library (royalty-free, mood-matched)
- Week 3: Add batch generation (upload 5 photos, get 5 videos). Add brand kit (save your colors, fonts, logo)
- Week 4: Launch. Free tier: 3 videos/month (watermarked). Pro: $19/month (unlimited, no watermark, brand kit)

**Revenue Model:** $19/month pro. $49/month business (team accounts, brand consistency, scheduling integration). Costs ~$0.10-0.30 per video to generate.

**Risk:** Video generation quality is inconsistent. Products with unusual shapes may look weird. Mitigation: offer 3 variations per generation, let user pick the best. Quality will improve monthly as models update.

---

## Idea 9 — ONBOARD

**One-Line Pitch:** "Your app loses 77% of users in 3 days. This fixes that in one line of code."

**Core Concept:** Drop a script tag into your app. Onboard watches how users behave in their first 3 days — where they click, where they stall, where they leave. Then it automatically generates and deploys contextual tooltips, walkthroughs, and nudges tailored to each user's behavior. No manual tour builder. No product manager required. The AI watches your users struggle and fixes it in real-time.

**Why Now:** The stat is brutal: apps lose 77% of users within 3 days. Existing solutions (Appcues, Userguide, Chameleon) require product managers to manually build flows. That's backwards — the product already knows where users get stuck (the data exists). AI can now watch behavior patterns and generate interventions autonomously.

**Why It's Asymmetric:** Every onboarding tool makes humans build the onboarding. This makes AI build it from observed behavior. The humans who should be building onboarding are the same ones who are too busy building features. Remove the human bottleneck entirely.

**Distribution:** "We added one script tag and our Day-3 retention went from 23% to 41%." That case study sells itself to every SaaS founder. Launch in indie hacker communities where founders wear every hat and onboarding is always deprioritized.

**30-Day Launch Path:**
- Week 1: Build the tracking script (lightweight, privacy-respecting: track clicks, page views, time-on-page, rage clicks — no PII). Build the analysis pipeline (identify where users drop off, stall, or loop)
- Week 2: Build the intervention generator (Claude API: given user behavior pattern X, generate a tooltip/nudge that addresses the confusion). Build the injection layer (script dynamically adds tooltips to the page)
- Week 3: Build the dashboard (show retention curves, intervention effectiveness, A/B test results). Beta with 5 apps
- Week 4: Launch free tier (up to 1,000 MAU). Pro $49/month (10K MAU). Growth $149/month (100K MAU)

**Revenue Model:** Usage-based SaaS. $49-$149/month. High switching cost once installed (removing it would hurt retention).

**Risk:** Dynamic interventions might be annoying or wrong. Users might hate random tooltips. Mitigation: conservative defaults (only intervene at clear drop-off points), easy dismiss, frequency caps.

---

## Idea 10 — DEAD INTERNET SCORE

**One-Line Pitch:** "Paste any URL and find out: is this real, or is it AI?"

**Core Concept:** A browser extension + web tool that scores any piece of web content on a 0-100 "authenticity" scale. Is this blog post written by a human? Is this Amazon review real? Is this news article AI-generated? Is this social media profile a bot? It doesn't just detect AI text — it cross-references posting patterns, writing consistency, source verification, and behavioral signals to give a holistic "is this real?" score.

**Why Now:** The "dead internet theory" went from conspiracy to lived experience. AI-generated content now floods search results, product reviews, social media, and news. People are losing trust in everything they read online. Google's "AI Overviews" accelerated the problem. There's a massive trust vacuum and no consumer tool to fill it.

**Why It's Asymmetric:** AI detection tools (GPTZero, Originality) target educators checking student papers. Nobody has built the *consumer* version — a tool regular people use while browsing to know what's real. The Chrome extension format means it's ambient: always on, always scoring, like an ad blocker but for bullshit.

**Distribution:** "I installed Dead Internet Score and 40% of the product reviews I read this week were AI-generated." That tweet writes itself. The shock value of the scores IS the marketing. Screenshots of low scores on popular content will go viral.

**30-Day Launch Path:**
- Week 1: Build the detection engine. Combine: AI text classifier (fine-tuned model), writing consistency analysis (does the author's style match across posts?), metadata signals (account age, posting frequency, engagement patterns)
- Week 2: Build the Chrome extension (floating score badge on any page). Build the web tool (paste URL → get score with breakdown)
- Week 3: Build the "web trust dashboard" — see aggregate scores across your browsing. "This week: 62% of content you read scored above 70 (likely real)"
- Week 4: Launch free (extension + 10 checks/day). Pro $5/month (unlimited, dashboard, API access)

**Revenue Model:** $5/month consumer. API access for platforms ($0.01/check) — review sites, news aggregators, and social platforms would pay to integrate this.

**Risk:** Arms race. AI-generated content will get harder to detect. False positives could damage trust in real creators. Mitigation: show confidence intervals, not binary verdicts. "78% likely human-written" is more honest than "REAL" or "FAKE." Update detection models monthly.

---

## Sources

- Product Hunt Leaderboard Feb 2026
- Best Show HN Feb 2026
- WebGPU in iOS 26
- WebLLM
- Anthropic Claude Opus 4.6
- Opus 4.6 vs Codex 5.3
- Seedance 2.0 viral demo
- Wikipedia doomscroll Show HN
- On-device AI state of union 2026
- Microsoft Foundry Local
- Underserved market niches 2026
- App Store statistics 2026
