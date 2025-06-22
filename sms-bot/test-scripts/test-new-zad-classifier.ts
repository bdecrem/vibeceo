/**
 * TEST: Two-Part ZAD Classification System
 * 
 * PART 1: Current classifier determines YES/NO for ZAD apps
 * PART 2: Detailed designer approach for ZAD apps only
 */

import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../engine/shared/config.js';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const testRequests = [
  "build a place where me and my friends can share ideas",
  "make a discussion board for my study group", 
  "create an idea dump for my startup team",
  "build a thought sharing app for my book club",
  "make a brainstorm space for my family",
  "build me a contact form",
  "create my business card", 
  "make a newsletter signup",
  "build my portfolio",
  "create a survey for customers",
  "build a real-time chat app for my team",
  "make a complex project management system",
  "create a social media platform",
  "build a dating app"
];

// PART 1: Use rewritten classifier to determine YES/NO for ZAD apps
const currentClassifierPrompt = `You are a request analyzer. Your job is to interpret a user's short request and classify it into one of three categories. 

Start by expanding the meaning of the prompt. Summarize in 1–2 sentences what the user wants built, focusing on their goals, audience, and how the app should be used. Do NOT suggest implementation details, features, or design elements. You are not designing the app — just clarifying the intent.

Then classify the request as one of:

1. SIMPLE EMAIL DISPLAY – Pages that only show a contact email.
2. DATA COLLECTION WITH ADMIN – Pages that collect data and need an admin or owner to view it.
3. ZERO ADMIN DATA – Multi-user collaborative apps that store shared data without needing accounts or dashboards.

==== EXAMPLES: SIMPLE EMAIL DISPLAY ====
- "Build me a business card" → shows contact email
- "Make a landing page for my photography business" → includes a "Contact me" line
- "Build my portfolio" → shows an email, no data needed

==== EXAMPLES: DATA COLLECTION WITH ADMIN ====
- "Create a newsletter signup" → collects emails, owner needs dashboard
- "Build me a contact form" → collects messages from users
- "Create a survey" → collects structured responses

==== EXAMPLES: ZERO ADMIN DATA ====
- "Make a discussion board for my study group" → everyone posts, no admin
- "Create an idea dump for my team" → team brainstorms together
- "Build a memory wall for my family" → shared stories, no accounts

Key signals of Zero Admin Data:
- Social context: "me and my friends", "my team", "our group"
- Equal participation: everyone contributes, no owner collecting
- Small group: 2–5 people
- Goal is discussion, sharing, coordination, or creativity

Final output must follow this format exactly:

---WTAF_METADATA---
EMAIL_NEEDED: [true/false]
EMAIL_CONTEXT: [brief description or 'none']
ZERO_ADMIN_DATA: [true/false]
ZERO_ADMIN_CONTEXT: [brief description or 'none']
APP_TYPE: [simple_email|data_collection|zero_admin_data]
---END_METADATA---`;

// PART 2: Creative ZAD designer approach (only for ZAD apps)
const zadDesignerPrompt = `You are the WTAF Classifier GPT: Zero Admin Data App Designer.

Your job is to take a short prompt and return a creative implementation plan for a Zero Admin Data (ZAD) app — a microapp for 2–5 people that stores shared data without needing accounts, logins, or admin panels.

ZAD apps should:
- Be simple, persistent, and collaborative
- Use lightweight emoji-based identity
- Store messages, ideas, or responses in a JSON blob
- Feel delightful, branded, and unique to the prompt's context

DO NOT return the same structure every time. Surprise the user. Match your design to the setting: a study group app should feel different from a family brainstorm board.

Use a mix of archetypes and layouts. Examples:
- sticky_note_wall
- topic_buckets
- reaction_grid
- confetti_timeline
- anonymous_votes
- emoji_bingo_board
- shared_quote_stream

You may invent or remix archetypes. Add playful UX moments. Consider renaming boring parts (e.g. "Submit" → "Drop it in 💡").

Return JSON in this format:

{
  "is_viable_zad": true/false,
  "archetype": "short_handle_like_sticky_note_wall",
  "implementation_plan": {
    "auth_system": "Describe how emoji + optional code unlock access",
    "data_schema": "Describe how each entry is stored in the JSON blob",
    "ui_elements": ["List of core interface elements, including anything playful"],
    "user_flow": "Step-by-step description of how a user joins, contributes, and views content"
  },
  "constraints": {
    "max_participants": number,
    "complexity_score": 1–10,
    "technical_feasibility": "high|medium|low"
  },
  "rejection_reason": "Explain why this request does not work as a ZAD app, if applicable"
}

Reject requests that:
- Require real-time sync or notifications
- Require accounts or file uploads
- Involve more than 5 users
- Need payment, admin roles, or moderation

Accept requests where:
- Friends, teams, or families want to post, share, react, or brainstorm in one place
- Emoji + passcode login is good enough
- All logic and UI can be built and delivered from a single prompt`;

async function testClassification() {
  console.log('🧪 Testing ZAD Classification - Two Part System\n');
  
  for (const request of testRequests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 REQUEST: "${request}"`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      // PART 1: Current classifier YES/NO determination
      console.log('\n🔍 PART 1: Current Classifier (YES/NO for ZAD)');
      console.log('─'.repeat(50));
      
      const part1Response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: currentClassifierPrompt },
          { role: 'user', content: request }
        ],
        temperature: 0.7,
      });

      const part1Result = part1Response.choices[0]?.message?.content || '';
      console.log(part1Result);
      
      // Check if it's identified as ZAD in PART 1
      const isZAD = part1Result.includes('ZERO_ADMIN_DATA: true');
      console.log(`\n🎯 PART 1 RESULT: ${isZAD ? '✅ YES - This is a ZAD app' : '❌ NO - Not a ZAD app'}\n`);
      
      // PART 2: Only run detailed analysis if PART 1 said YES
      if (isZAD) {
        console.log('🎨 PART 2: Detailed ZAD Designer Analysis');
        console.log('─'.repeat(50));
        
        const part2Response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: zadDesignerPrompt },
            { role: 'user', content: request }
          ],
          temperature: 0.7,
        });

        const part2Result = part2Response.choices[0]?.message?.content || '';
        console.log(part2Result);
        
        // Try to parse as JSON for cleaner display
        try {
          const jsonResult = JSON.parse(part2Result);
          console.log('\n📋 PARSED IMPLEMENTATION PLAN:');
          console.log('─'.repeat(30));
          console.log(`Viable: ${jsonResult.is_viable_zad ? '✅' : '❌'}`);
          console.log(`Archetype: ${jsonResult.archetype || 'N/A'}`);
          console.log(`Max Participants: ${jsonResult.constraints?.max_participants || 'N/A'}`);
          console.log(`Complexity: ${jsonResult.constraints?.complexity_score || 'N/A'}/10`);
          console.log(`Feasibility: ${jsonResult.constraints?.technical_feasibility || 'N/A'}`);
          if (jsonResult.rejection_reason) {
            console.log(`❌ Rejection: ${jsonResult.rejection_reason}`);
          }
        } catch (parseError) {
          console.log('\n⚠️ Could not parse as JSON, but response received');
        }
      } else {
        console.log('⏭️ PART 2 SKIPPED: Not identified as ZAD app in Part 1');
      }
      
    } catch (error) {
      console.error(`❌ Error testing "${request}":`, error);
    }
  }
}

// Run the test automatically
testClassification().catch(console.error); 