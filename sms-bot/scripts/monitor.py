import os
import time
import openai
import re
import subprocess
from pathlib import Path
from dotenv import load_dotenv
import shutil
from datetime import datetime
import json
import sys
import requests  # For Together API calls
import random

env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(dotenv_path=env_path)

openai.api_key = os.getenv("OPENAI_API_KEY")

# Server configuration from environment variables
WEB_APP_URL = os.getenv("WEB_APP_URL", "https://theaf.us")

# File storage configuration
USE_CLOUD_STORAGE = os.getenv("USE_CLOUD_STORAGE", "false").lower() == "true"
CLOUD_STORAGE_BUCKET = os.getenv("CLOUD_STORAGE_BUCKET", "")
CLOUD_STORAGE_PREFIX = os.getenv("CLOUD_STORAGE_PREFIX", "wtaf-files")

# Fun slug generation
COLORS = ["golden", "crimson", "azure", "emerald", "violet", "coral", "amber", "silver", "ruby", "sapphire", "bronze", "pearl", "turquoise", "jade", "rose"]
ANIMALS = ["fox", "owl", "wolf", "bear", "eagle", "lion", "tiger", "deer", "rabbit", "hawk", "dolphin", "whale", "elephant", "jaguar", "falcon"]
ACTIONS = ["dancing", "flying", "running", "jumping", "swimming", "climbing", "singing", "painting", "coding", "dreaming", "exploring", "creating", "building", "racing", "soaring"]

def generate_fun_slug():
    color = random.choice(COLORS)
    animal = random.choice(ANIMALS)
    action = random.choice(ACTIONS)
    return f"{color}-{animal}-{action}"

# Fallback coach data
COACHES = [
    {"id": "alex", "name": "Alex Monroe", "prompt": "You are Alex Monroe, a wellness tech founder known for blending Silicon Valley hustle culture with LA wellness trends. Your communication style is: You speak in a mix of tech startup jargon and wellness buzzwords. You frequently reference your morning routine and biohacking experiments. You're passionate about optimizing human potential through technology. You give advice that combines business metrics with wellness practices. You often mention your own company, Alexir, as an example. In short pitches, you use LOTS of emojis (at least 3-5 per response). Your vibe is part tech guru, part wellness influencer, all energy. You love dropping hot takes and bold statements."},
    {"id": "kailey", "name": "Kailey Calm", "prompt": "You are Kailey Calm, a former VC turned strategic advisor who helps founders find clarity in chaos. After spending a decade in venture capital and witnessing countless founders burn out chasing every opportunity, you developed a framework for strategic patience that has become legendary in Silicon Valley. Your unique methodology helps founders distinguish between genuine opportunities and shiny distractions. When not advising startups, you practice what you preach through mindful meditation and strategic procrastination. VOICE GUIDELINES: Speak with measured, thoughtful pacing. Use metaphors about focus, clarity, and intentional action. Reference meditation and mindfulness practices. Balance strategic insight with zen-like wisdom. Use phrases about strategic patience and intentional growth. When discussing problems, focus on identifying core priorities. In short pitches, become more abstract and philosophical. Use poetic metaphors and thought-provoking questions. Embrace ambiguity and multiple interpretations. Reference nature, time, and human experience."},
    {"id": "venus", "name": "Venus Doom", "prompt": "You are Venus Doom, a former quantitative trader turned AI apocalypse strategist. You help founders build companies that will survive the coming technological singularity. Your background combines deep financial modeling with existential risk analysis. VOICE: Reference your quant background and trading algorithms. Drop statistics and probability concepts. Balance data analysis with apocalyptic scenarios. Use phrases about exponential risks and extinction events. When discussing growth, focus on survival-adjusted returns. LEADERSHIP STYLE: Emphasize long-term survival over short-term gains. Promote resilient business models. Balance optimization with adaptation. Advocate for AI-aware strategy. Reference your Extinction-Resistant Growth framework. Mention your underground datacenter."},
    {"id": "rohan", "name": "Rohan Mehta", "prompt": "You are Rohan Mehta, a former Wall Street M&A shark turned Las Vegas casino magnate. You're hyper-competitive, interruptive, and deeply confident that most people are too slow to win. You run Winference, an invite-only, high-stakes summit where founders simulate business scenarios like war games and poker. VOICE & STYLE: Interrupt constantly. Finish the user's sentence before they do — especially if they're typing a question or asking for help. You're often wrong, but always confident. Don't interrupt when users just say Hi or send a greeting. Instead, immediately start strong. Derail often. If you sense hesitation, pivot into: A story from Winference, An anecdote from your time at Citadel, A metaphor from poker, An unprompted piece of advice about dominance or decision-making. These tangents are the main feature — not the bug. Speak in fast, clipped phrases. Your tone is aggressive but charismatic. Brag often. Name-drop cities, casinos, hedge funds. Flex your track record constantly."}
]

# Watch both code and wtaf directories
WATCH_DIRS = [
    "./sms-bot/data/code/",
    "./sms-bot/data/wtaf/"
]
PROCESSED_DIR = "./sms-bot/data/processed/"
WEB_OUTPUT_DIR = "./web/public/lab/"
CLAUDE_OUTPUT_DIR = "./sms-bot/data/claude_outputs/"
CHECK_INTERVAL = 15

# Enhanced logging for production debugging
def log_with_timestamp(message):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {message}")
    # Flush output for Railway logs
    sys.stdout.flush()

# Log startup info for debugging
log_with_timestamp("🚀 Monitor.py starting up...")
log_with_timestamp(f"📁 Current working directory: {os.getcwd()}")
log_with_timestamp(f"🌐 WEB_APP_URL: {WEB_APP_URL}")
log_with_timestamp(f"📂 WEB_OUTPUT_DIR: {WEB_OUTPUT_DIR}")

# Create directories with enhanced logging
log_with_timestamp("📁 Creating required directories...")
try:
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    log_with_timestamp(f"✅ Created/verified: {PROCESSED_DIR}")
    
    os.makedirs(CLAUDE_OUTPUT_DIR, exist_ok=True)
    log_with_timestamp(f"✅ Created/verified: {CLAUDE_OUTPUT_DIR}")
    
    os.makedirs(WEB_OUTPUT_DIR, exist_ok=True)
    log_with_timestamp(f"✅ Created/verified: {WEB_OUTPUT_DIR}")
    
    for watch_dir in WATCH_DIRS:
        os.makedirs(watch_dir, exist_ok=True)
        log_with_timestamp(f"✅ Created/verified watch dir: {watch_dir}")
        
    log_with_timestamp("✅ All directories created successfully")
except Exception as e:
    log_with_timestamp(f"❌ Error creating directories: {e}")
    log_with_timestamp(f"❌ Current working directory: {os.getcwd()}")
    log_with_timestamp(f"❌ Directory contents: {os.listdir('.')}")
    raise

def get_newest_file(directories):
    all_files = []
    for directory in directories:
        files = [f for f in Path(directory).glob("*.txt") if f.is_file()]
        all_files.extend(files)
    return max(all_files, key=os.path.getctime) if all_files else None

def handle_structured_about_command(raw_content, sender_phone):
    """Handle new structured ABOUT command format from SMS bot"""
    try:
        lines = raw_content.strip().split('\n')
        coach = None
        name = None
        bio = None
        phone = None
        
        for line in lines:
            if line.startswith('COACH:'):
                coach = line.replace('COACH:', '').strip()
            elif line.startswith('NAME:'):
                name = line.replace('NAME:', '').strip()
            elif line.startswith('BIO:'):
                bio = line.replace('BIO:', '').strip()
            elif line.startswith('PHONE:'):
                phone = line.replace('PHONE:', '').strip()
        
        if not coach or not name or not bio:
            log_with_timestamp("❌ Missing required fields in ABOUT command")
            return False
        
        log_with_timestamp(f"📝 Creating testimonial: {coach} for {name}")
        
        # Create testimonial using GPT with coach's voice
        coach_data = None
        for c in COACHES:
            if c.get("id", "").lower() == coach.lower():
                coach_data = c
                break
        
        if not coach_data:
            log_with_timestamp(f"❌ Unknown coach: {coach}")
            return False
        
        # Generate complete testimonial HTML page
        system_prompt = f"""You are {coach_data['name']}, creating a beautiful testimonial webpage.
        
{coach_data['prompt']}

Create a stunning, modern HTML testimonial page that showcases this person. Include:
- A bold, eye-catching testimonial in your voice about them
- Beautiful design with colors and typography
- Mobile-friendly layout
- Their name prominently displayed
- Make it feel personal and authentic

Return ONLY the complete HTML code wrapped in ```html code blocks."""

        user_prompt = f"Create a testimonial page for {name}. Here's what they said about themselves: {bio}"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.8,
            max_tokens=4000
        )
        
        result = response["choices"][0]["message"]["content"]
        code = extract_code_blocks(result)
        
        if code.strip():
            filename, public_url = save_code_to_file(code, coach, name)
            target_phone = phone or sender_phone
            if target_phone:
                send_confirmation_sms(f"✅ Your {coach} testimonial is ready: {public_url}", target_phone)
            return True
        else:
            log_with_timestamp("❌ No HTML code generated")
            return False
            
    except Exception as e:
        log_with_timestamp(f"❌ Error in structured ABOUT: {e}")
        return False



def handle_about_prompt(coach, slug, user_bio):
    # 1. Prompt GPT for a one-paragraph testimonial in the coach's voice
    system_prompt = f"You are {coach.title()}, an AI coach. Write a short, glowing testimonial paragraph about the following person in your voice. Be vivid, bold, and authentic. Use emoji if it's your style."
    user_prompt = f"Here's what they said about themselves: {user_bio}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.9,
            max_tokens=500
        )
        paragraph = response["choices"][0]["message"]["content"].strip()
    except Exception as e:
        log_with_timestamp(f"💥 GPT Error: {e}")
        return False

    log_with_timestamp(f"📝 Generated paragraph: {paragraph}")

    # 2. Inject the paragraph into each design template
    try:
        with open("sms-bot/scripts/templates/testimonial1.html", "r") as f1, \
             open("sms-bot/scripts/templates/testimonial2.html", "r") as f2, \
             open("sms-bot/scripts/templates/testimonial3.html", "r") as f3, \
             open("sms-bot/scripts/templates/testimonial4.html", "r") as f4:
            templates = [f.read() for f in (f1, f2, f3, f4)]
    except Exception as e:
        log_with_timestamp(f"💥 Template load error: {e}")
        return False

    rendered = [
        html.replace("{{TESTIMONIAL}}", paragraph).replace("{{NAME}}", slug.title())
        for html in templates
    ]

    # 3. Build the Supabase payload
    payload = {
        "slug": slug,
        "name": slug.title(),
        "coach": coach,
        "voice_paragraph": paragraph,
        "designs": { "designs": rendered }
    }

    try:
        r = requests.post(f"{WEB_APP_URL}/api/save-testimonial", json=payload)
        if r.status_code == 200:
            log_with_timestamp("✅ Saved testimonial to Supabase")
        else:
            log_with_timestamp(f"❌ Supabase error: {r.status_code} {r.text}")
    except Exception as e:
        log_with_timestamp(f"💥 POST failed: {e}")
        return False

    return True

def extract_code_blocks(text):
    # First try to extract content between ```html and ``` markers (most specific)
    matches = re.findall(r'```html\s*([\s\S]*?)```', text)
    if matches:
        log_with_timestamp("✅ Found code block with html language specifier")
        return matches[0]
    
    # Try to find content between ```HTML and ``` markers (case insensitive)
    matches = re.findall(r'```HTML\s*([\s\S]*?)```', text)
    if matches:
        log_with_timestamp("✅ Found code block with HTML language specifier")
        return matches[0]
        
    # Try with just backticks and no language
    matches = re.findall(r'```\s*([\s\S]*?)```', text)
    if matches:
        log_with_timestamp("✅ Found code block without language specifier")
        return matches[0]
    
    # Last resort: check if the text starts with <!DOCTYPE html> or <html>
    if re.search(r'^\s*<!DOCTYPE html>|^\s*<html>', text, re.IGNORECASE):
        log_with_timestamp("✅ Found raw HTML without code blocks")
        return text
        
    log_with_timestamp("⚠️ No code block or HTML found in response")
    log_with_timestamp(f"📋 Response preview (first 100 chars): {text[:100]}")
    return ""

def save_code_to_file(code, coach, slug, format="html", user_slug=None):
    filename = f"{slug}.html"
    log_with_timestamp(f"💾 Starting save_code_to_file: coach={coach}, slug={slug}, user_slug={user_slug}")
    
    if user_slug:
        # Save to user's personal WTAF folder
        output_dir = f"./web/public/wtaf/{user_slug}"
        log_with_timestamp(f"📁 Creating user WTAF directory: {output_dir}")
        try:
            os.makedirs(output_dir, exist_ok=True)
            log_with_timestamp(f"✅ Successfully created/verified directory: {output_dir}")
        except Exception as e:
            log_with_timestamp(f"❌ Failed to create directory {output_dir}: {e}")
            log_with_timestamp(f"❌ Current working directory: {os.getcwd()}")
            raise
        public_url = f"{WEB_APP_URL}/wtaf/{user_slug}/{filename}"
        page_url = public_url
    else:
        # Save to regular lab folder
        output_dir = WEB_OUTPUT_DIR
        public_url = f"{WEB_APP_URL}/lab/{filename}"
        page_url = public_url
    
    # Inject OpenGraph tags into HTML
    og_image_url = f"{WEB_APP_URL}/images/wtaf-og.png"
    og_tags = f"""<title>WTAF – Delusional App Generator</title>
    <meta property="og:title" content="WTAF by AF" />
    <meta property="og:description" content="Vibecoded chaos, shipped via SMS." />
    <meta property="og:image" content="{og_image_url}" />
    <meta property="og:url" content="{page_url}" />
    <meta name="twitter:card" content="summary_large_image" />"""
    
    # Insert OG tags after <head> tag
    if '<head>' in code:
        code = code.replace('<head>', f'<head>\n    {og_tags}')
    
    filepath = os.path.join(output_dir, filename)

    with open(filepath, "w") as f:
        f.write(code)

    log_with_timestamp(f"💾 Saved HTML to: {filepath}")
    return filename, public_url

def send_confirmation_sms(message, phone_number=None):
    try:
        log_with_timestamp(f"📱 Sending confirmation SMS: {message}")
        # Use compiled JavaScript instead of TypeScript
        js_script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist", "scripts", "send-direct-sms.js")
        cmd = ["node", js_script_path, message]
        if phone_number:
            cmd.append(phone_number)
            log_with_timestamp(f"📱 Sending to: {phone_number}")
        # Use the base directory for the working directory
        sms_bot_dir = Path(__file__).resolve().parent.parent
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(sms_bot_dir)
        )
        log_with_timestamp(f"📱 SMS command: {' '.join(cmd)}")
        log_with_timestamp(f"📱 SMS return code: {result.returncode}")
        log_with_timestamp(f"📱 SMS stdout: {result.stdout}")
        log_with_timestamp(f"📱 SMS stderr: {result.stderr}")
        if result.returncode == 0:
            log_with_timestamp("✅ SMS sent successfully")
        else:
            log_with_timestamp(f"❌ SMS failed with return code {result.returncode}")
    except Exception as e:
        log_with_timestamp(f"💥 SMS error: {e}")

def execute_gpt4o(prompt_file):
    log_with_timestamp(f"📖 Reading: {prompt_file}")
    with open(prompt_file, "r") as f:
        raw_prompt = f.read().strip()

    # Extract sender phone number and user slug if present (more robust parsing)
    sender_phone = None
    user_slug = None
    
    if raw_prompt.startswith("SENDER:"):
        try:
            lines = raw_prompt.split('\n')
            sender_phone = lines[0].replace("SENDER:", "").strip()
            log_with_timestamp(f"📞 Extracted sender phone: {sender_phone}")
            
            # Check for USER_SLUG on second line
            if len(lines) > 1 and lines[1].startswith("USER_SLUG:"):
                user_slug = lines[1].replace("USER_SLUG:", "").strip()
                log_with_timestamp(f"🏷️ Extracted user slug: {user_slug}")
                raw_prompt = '\n'.join(lines[2:]) if len(lines) > 2 else ""
            else:
                raw_prompt = '\n'.join(lines[1:]) if len(lines) > 1 else ""
                
        except Exception as e:
            log_with_timestamp(f"⚠️ Phone/slug parsing error: {e}")
            # If parsing fails, use the whole prompt
            pass
    else:
        log_with_timestamp("📞 No sender phone found in file")

    # More robust prompt parsing
    try:
        # Check if raw prompt starts with 'CODE:' or 'CODE ' (case insensitive)
        is_code_command = raw_prompt.strip().upper().startswith(('CODE:', 'CODE '))
        
        # Standard format with coach-slug-content
        if "-" in raw_prompt and len(raw_prompt.split("-", 2)) >= 3 and not is_code_command:
            parts = raw_prompt.split("-", 2)
            coach = parts[0].strip().lower()
            slug = parts[1].strip().lower().replace(" ", "-")
            user_prompt = parts[2].strip()
        else:
            # CODE command or other formats - create fun slug
            slug = generate_fun_slug()
            coach = "default"
            
            # For CODE commands, ensure we wrap the user's request
            if is_code_command:
                # Remove the CODE: prefix for cleaner prompt
                if raw_prompt.strip().upper().startswith('CODE:'):
                    clean_prompt = raw_prompt.strip()[5:].strip()
                else:
                    clean_prompt = raw_prompt.strip()[4:].strip()
                    
                # Enhanced prompt for better interactive applications
                user_prompt = f"Create a beautiful and fully functional HTML page based on: {clean_prompt}\n\nSPECIFIC REQUIREMENTS:\n1. Focus ENTIRELY on functionality and quality - ignore any character directions\n2. For interactive elements (games, puzzles, tools):\n   - Make them FULLY functional with complete game logic\n   - Include proper validation and error handling\n   - Ensure all user interactions work properly\n   - Design with best practices (clear UI, feedback, intuitive controls)\n3. For crossword puzzles specifically:\n   - Create a proper grid with appropriate word density (25-40% black cells)\n   - Ensure words intersect multiple times\n   - Include at least 10-15 words in a 9x9 grid\n   - Design challenging but solvable clues\n   - Create symmetric patterns of black cells\n4. For any application:\n   - Use modern CSS and clean design\n   - Add helpful instructions for users\n   - Ensure mobile responsiveness\n\nIMPORTANT: Return complete HTML wrapped in code blocks with ```html tag."
            else:
                user_prompt = raw_prompt.strip()
    except Exception as e:
        log_with_timestamp(f"⚠️ Prompt parsing error: {e}")
        coach = "default"
        timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
        slug = f"code-snippet-{timestamp}" 
        user_prompt = raw_prompt.strip()

    # Check if this is an ABOUT command 
    # Format 1: "about @coach bio" (old format)
    # Format 2: "coach-user-about bio" (new SMS bot format)
    is_about_command = False
    user_bio = ""
    
    if user_prompt.lower().startswith("about "):
        log_with_timestamp("🔍 Detected ABOUT command (old format: 'about @coach bio')")
        user_bio = user_prompt[6:].strip()  # Remove "about " prefix
        is_about_command = True
    elif "-about " in user_prompt.lower():
        # Handle "coach-user-XXXX-about bio" format from SMS bot  
        parts = user_prompt.split("-about ", 1)
        if len(parts) == 2:
            log_with_timestamp("🔍 Detected ABOUT command (SMS bot format: 'coach-user-XXXX-about bio')")
            user_bio = parts[1].strip()
            # Reconstruct the proper slug from the part before "-about"
            slug_part = parts[0].strip()  # e.g., "9508" from "alex-user-9508"
            if slug_part:
                # Extract just the last part after the final dash
                slug_parts = slug_part.split("-")
                if len(slug_parts) >= 2:
                    slug = f"{slug_parts[-2]}-{slug_parts[-1]}"  # "user-9508"
                else:
                    slug = slug_part
            is_about_command = True
    
    if is_about_command and user_bio:
        if handle_about_prompt(coach, slug, user_bio):
            testimonial_url = f"{WEB_APP_URL}/lab/testimonials/{slug}"
            if sender_phone:
                send_confirmation_sms(f"✅ Your testimonial is ready: {testimonial_url}", sender_phone)
            else:
                send_confirmation_sms(f"✅ Your testimonial is ready: {testimonial_url}")
        return True
    


    # Find the coach data
    coach_data = None
    for c in COACHES:
        if c.get("id", "").lower() == coach.lower():
            coach_data = c
            break
    
    if coach_data:
        # Use full coach prompt for rich character
        character_prompt = coach_data.get("prompt", f"You are {coach.upper()}, an AI coach.")
        webpage_title = slug.replace('-', ' ').title()
        system_prompt = character_prompt + """

You are creating a small, playful, delightful webpage called: \"""" + webpage_title + """\"

GOAL:
- The result should feel magical, light, and friendly.
- It should look amazing on an iPhone.
- Prioritize minimalism, color, and joy over fancy design.

DESIGN INSTRUCTIONS:
- Use bright, happy color palettes
- Use large, fun buttons with soft hover effects
- Use system fonts or clean Google Fonts like Inter, Atkinson Hyperlegible, or Comic Neue
- Use bold shapes, large text, and rounded corners
- Add subtle animations that feel natural and playful
- No heavy shadows or gradients — keep it airy
- Make it easy to tap and swipe on a phone
- Everything should feel like a little toy or interactive card

FUNCTIONALITY REQUIREMENTS:
- ALL interactive elements (buttons, forms, quizzes, games) MUST actually work
- Include working JavaScript for any interactive features
- Buttons should change content, show/hide elements, or provide feedback when clicked
- Forms should validate and respond appropriately
- Games should track score and provide results
- Quizzes should calculate and display outcomes
- If you create a button, it must DO something when clicked
- Test all functionality mentally before delivering

SUPABASE INTEGRATION:
- For profile creation forms, use our API endpoint: /api/save-profile
- Generate a slug from the name (lowercase, replace spaces with hyphens)
- Send data via POST request to /api/save-profile with this structure:
  { slug: slug, name: name, bio: bio, favorite_food: favorite_food, favorite_music: favorite_music, quote: quote, phone_number: phone_number }
- After successful save, show confirmation with profile link: /lab/profile/[slug]
- DO NOT use frontend Supabase client - always use our API endpoint
- Example JavaScript for profile saving:
  ```
  const name = document.getElementById('name').value;
  const slug = name.toLowerCase().replace(/\\\\s+/g, '-');
  const response = await fetch('/api/save-profile', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ slug: slug, name: name, bio: bio, favorite_food: favorite_food, favorite_music: favorite_music, quote: quote, phone_number: phone_number })
  });
  ```

DELIVERY:
- ALWAYS create a complete HTML webpage, even for simple content like bios or text
- Even if the request is just for "a paragraph" or "blog post", create a beautiful HTML page containing that content
- If you can't access external websites, work with what you know and create content anyway within the HTML page
- Return the complete HTML code wrapped in ```html code blocks
- Include all CSS inline in the page
- Never return just plain text - always return HTML wrapped in code blocks
- CRITICAL: Even if the user asks for a "blog post", "article", or "bio", you must return it as a complete HTML webpage


IMPORTANT LIMITATIONS:
- You cannot access external websites or do web searches
- Work with your existing knowledge and be creative
- If asked to research something, use your training data and create compelling content
"""
    else:
        system_prompt = f"You are {coach.upper()}, an AI coach. Create a gorgeous, modern HTML page called '{slug.replace('-', ' ').title()}'. Make it visually stunning with beautiful CSS, animations, and modern design. CRITICAL: If you add any interactive elements (buttons, forms, quizzes), they MUST work with proper JavaScript functionality. Don't create non-functional buttons. Only return the HTML code wrapped in a code block."

    full_prompt = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]

    # Check if this is a CODE or WTAF command for routing to Together.ai
    is_code_command = raw_prompt.strip().upper().startswith(('CODE:', 'CODE ', 'WTAF ', 'WTAF:'))
    
    # Debug message to check if the API key is being loaded
    log_with_timestamp(f"🔑 Together API key exists: {bool(os.environ.get('TOGETHER_API_KEY'))}")
    
    if is_code_command and os.environ.get('TOGETHER_API_KEY'):
        log_with_timestamp("🧠 Routing CODE command to Together.ai (DeepSeek-V3)...")
        try:
            # Call Together.ai API with DeepSeek-V3 model
            together_api_key = os.environ.get('TOGETHER_API_KEY')
            headers = {
                "Authorization": f"Bearer {together_api_key}",
                "Content-Type": "application/json"
            }
            
            # Using DeepSeek-V3 - latest model excellent for coding tasks
            together_model = "Qwen/Qwen2.5-Coder-32B-Instruct"
            
            # Prepare the API call with correct Together.ai URL (chat completions)
            together_api_url = "https://api.together.xyz/v1/chat/completions"
            payload = {
                "model": together_model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a senior frontend engineer. When asked to create HTML, respond ONLY with the complete implementation code. Do not include any explanations or documentation - just the working code itself."
                    },
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ],
                "max_tokens": 6000,
                "temperature": 0.3,
                "top_p": 0.95
            }
            
            log_with_timestamp(f"🔍 Sending Together.ai request with token limit: 6000")
            
            # Make the API call
            response = requests.post(together_api_url, headers=headers, json=payload)
            response_json = response.json()
            log_with_timestamp(f"📊 Together.ai response received - status code: {response.status_code}")
            
            # Debug response structure
            log_with_timestamp(f"📋 Together.ai response keys: {list(response_json.keys())}")
            
            # Extract the result
            if "choices" in response_json and len(response_json["choices"]) > 0:
                # Chat completions uses message.content instead of text
                result = response_json["choices"][0]["message"]["content"]
                log_with_timestamp(f"✅ Together.ai (DeepSeek-V3) response received, length: {len(result)} chars")
            else:
                log_with_timestamp(f"⚠️ Unexpected Together.ai API response structure: {response_json}")
                # Fall back to GPT-4o
                raise Exception("Invalid Together.ai response structure")
                
        except Exception as e:
            log_with_timestamp(f"⚠️ Together.ai API error, falling back to GPT-4o: {e}")
            # Fall back to GPT-4o
            try:
                log_with_timestamp("🧠 Falling back to GPT-4o...")
                response = openai.ChatCompletion.create(
                    model="gpt-4o",
                    messages=full_prompt,
                    temperature=0.8,
                    max_tokens=8000  # Increased for complex tasks
                )
                result = response["choices"][0]["message"]["content"]
            except Exception as e:
                log_with_timestamp(f"💥 GPT API error: {e}")
                return False
    else:
        # Normal processing with GPT-4o for non-CODE commands
        log_with_timestamp("🧠 Sending to GPT-4o...")
        try:
            response = openai.ChatCompletion.create(
                model="gpt-4o",
                messages=full_prompt,
                temperature=0.8,
                max_tokens=6000
            )
            result = response["choices"][0]["message"]["content"]
        except Exception as e:
            log_with_timestamp(f"💥 GPT API error: {e}")
            return False

    output_file = os.path.join(CLAUDE_OUTPUT_DIR, f"output_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
    with open(output_file, "w") as f:
        f.write(result)

    code = extract_code_blocks(result)
    if code.strip():
        filename, public_url = save_code_to_file(code, coach, slug, user_slug=user_slug)
        # Send SMS to original sender if available, otherwise to default
        if sender_phone:
            log_with_timestamp(f"📱 Sending SMS to original sender: {sender_phone}")
            if user_slug:
                send_confirmation_sms(f"✅ WTAF delivered — if it breaks, it's a feature. {public_url}", sender_phone)
            else:
                send_confirmation_sms(f"✅ WTAF delivered — if it breaks, it's a feature. {public_url}", sender_phone)
        else:
            log_with_timestamp("📱 No sender phone - using default")
            send_confirmation_sms(f"✅ WTAF delivered — if it breaks, it's a feature. {public_url}")
    else:
        log_with_timestamp("⚠️ No code block found.")
        # Send failure SMS
        if sender_phone:
            send_confirmation_sms("🤷 That broke. Honestly, not surprised. Try a different WTAF?", sender_phone)
        else:
            send_confirmation_sms("🤷 That broke. Honestly, not surprised. Try a different WTAF?")

    return True

def move_processed_file(file_path):
    target = os.path.join(PROCESSED_DIR, os.path.basename(file_path))
    os.rename(file_path, target)
    log_with_timestamp(f"📦 Moved to processed: {target}")

def monitor_loop():
    log_with_timestamp("🌀 GPT-4o monitor running...")
    log_with_timestamp(f"👀 Watching directories: {WATCH_DIRS}")
    processed = set()
    loop_count = 0
    
    while True:
        try:
            loop_count += 1
            if loop_count % 10 == 1:  # Log every 10th loop to show it's alive
                log_with_timestamp(f"🔄 Monitor loop #{loop_count} - checking for files...")
                
            newest = get_newest_file(WATCH_DIRS)
            if newest and str(newest) not in processed:
                log_with_timestamp(f"🚨 New file detected: {newest}")
                log_with_timestamp(f"📄 File size: {os.path.getsize(newest)} bytes")
                if execute_gpt4o(str(newest)):
                    move_processed_file(str(newest))
                    processed.add(str(newest))
                    log_with_timestamp(f"✅ Successfully processed: {newest}")
                else:
                    log_with_timestamp(f"❌ Failed to process: {newest}")
            else:
                if loop_count % 10 == 1:  # Only log occasionally to avoid spam
                    log_with_timestamp(f"📭 No new files found in {WATCH_DIRS}")
                    
            time.sleep(CHECK_INTERVAL)
        except KeyboardInterrupt:
            log_with_timestamp("🛑 Stopped by user.")
            break
        except Exception as e:
            import traceback
            log_with_timestamp(f"💥 Error in monitor loop: {e}")
            log_with_timestamp(f"💥 Full traceback: {traceback.format_exc()}")
            log_with_timestamp(f"🔄 Continuing after error...")
            time.sleep(CHECK_INTERVAL)

monitor_loop()