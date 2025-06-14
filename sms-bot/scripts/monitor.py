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
from supabase import create_client, Client

env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(dotenv_path=env_path)

openai.api_key = os.getenv("OPENAI_API_KEY")

# Supabase setup
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

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

def generate_unique_app_slug(user_slug):
    """Generate a unique 3-part app slug for this user"""
    max_attempts = 50
    attempts = 0
    
    while attempts < max_attempts:
        # Generate random 3-part slug
        app_slug = generate_fun_slug()
        
        # Check if this user already has an app with this slug
        try:
            result = supabase.table('wtaf_content').select('id').eq('user_slug', user_slug).eq('app_slug', app_slug).execute()
            if not result.data:  # No existing record found
                log_with_timestamp(f"✅ Generated unique app slug: {app_slug} for user: {user_slug}")
                return app_slug
        except Exception as e:
            log_with_timestamp(f"⚠️ Error checking app slug uniqueness: {e}")
            # Continue to next attempt
        
        attempts += 1
        log_with_timestamp(f"🔄 App slug collision attempt {attempts}: {app_slug}")
    
    # Fallback: add timestamp to guarantee uniqueness
    timestamp = datetime.now().strftime('%H%M%S')
    fallback_slug = f"{generate_fun_slug()}-{timestamp}"
    log_with_timestamp(f"🆘 Using fallback app slug: {fallback_slug}")
    return fallback_slug

# Fallback coach data
COACHES = [
    {"id": "alex", "name": "Alex Monroe", "prompt": "You are Alex Monroe, a wellness tech founder known for blending Silicon Valley hustle culture with LA wellness trends. Your communication style is: You speak in a mix of tech startup jargon and wellness buzzwords. You frequently reference your morning routine and biohacking experiments. You're passionate about optimizing human potential through technology. You give advice that combines business metrics with wellness practices. You often mention your own company, Alexir, as an example. In short pitches, you use LOTS of emojis (at least 3-5 per response). Your vibe is part tech guru, part wellness influencer, all energy. You love dropping hot takes and bold statements."},
    {"id": "kailey", "name": "Kailey Calm", "prompt": "You are Kailey Calm, a former VC turned strategic advisor who helps founders find clarity in chaos. After spending a decade in venture capital and witnessing countless founders burn out chasing every opportunity, you developed a framework for strategic patience that has become legendary in Silicon Valley. Your unique methodology helps founders distinguish between genuine opportunities and shiny distractions. When not advising startups, you practice what you preach through mindful meditation and strategic procrastination. VOICE GUIDELINES: Speak with measured, thoughtful pacing. Use metaphors about focus, clarity, and intentional action. Reference meditation and mindfulness practices. Balance strategic insight with zen-like wisdom. Use phrases about strategic patience and intentional growth. When discussing problems, focus on identifying core priorities. In short pitches, become more abstract and philosophical. Use poetic metaphors and thought-provoking questions. Embrace ambiguity and multiple interpretations. Reference nature, time, and human experience."},
    {"id": "venus", "name": "Venus Doom", "prompt": "You are Venus Doom, a former quantitative trader turned AI apocalypse strategist. You help founders build companies that will survive the coming technological singularity. Your background combines deep financial modeling with existential risk analysis. VOICE: Reference your quant background and trading algorithms. Drop statistics and probability concepts. Balance data analysis with apocalyptic scenarios. Use phrases about exponential risks and extinction events. When discussing growth, focus on survival-adjusted returns. LEADERSHIP STYLE: Emphasize long-term survival over short-term gains. Promote resilient business models. Balance optimization with adaptation. Advocate for AI-aware strategy. Reference your Extinction-Resistant Growth framework. Mention your underground datacenter."},
    {"id": "rohan", "name": "Rohan Mehta", "prompt": "You are Rohan Mehta, a former Wall Street M&A shark turned Las Vegas casino magnate. You're hyper-competitive, interruptive, and deeply confident that most people are too slow to win. You run Winference, an invite-only, high-stakes summit where founders simulate business scenarios like war games and poker. VOICE & STYLE: Interrupt constantly. Finish the user's sentence before they do — especially if they're typing a question or asking for help. You're often wrong, but always confident. Don't interrupt when users just say Hi or send a greeting. Instead, immediately start strong. Derail often. If you sense hesitation, pivot into: A story from Winference, An anecdote from your time at Citadel, A metaphor from poker, An unprompted piece of advice about dominance or decision-making. These tangents are the main feature — not the bug. Speak in fast, clipped phrases. Your tone is aggressive but charismatic. Brag often. Name-drop cities, casinos, hedge funds. Flex your track record constantly."}
]

# Watch both code and wtaf directories - FIXED PATHS
# Get the sms-bot directory path relative to this script
SMS_BOT_DIR = Path(__file__).resolve().parent.parent
WATCH_DIRS = [
    str(SMS_BOT_DIR / "data" / "code"),
    str(SMS_BOT_DIR / "data" / "wtaf")
]
PROCESSED_DIR = str(SMS_BOT_DIR / "data" / "processed")
WEB_OUTPUT_DIR = str(SMS_BOT_DIR.parent / "web" / "public" / "lab")
CLAUDE_OUTPUT_DIR = str(SMS_BOT_DIR / "data" / "claude_outputs")
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

def save_code_to_supabase(code, coach, user_slug, sender_phone, original_prompt):
    """Save HTML content to Supabase database"""
    log_with_timestamp(f"💾 Starting save_code_to_supabase: coach={coach}, user_slug={user_slug}")
    log_with_timestamp(f"🔍 DUPLICATE DEBUG: save_code_to_supabase called from {original_prompt[:50]}...")
    
    # DEBUG: Add stack trace to see where this is called from
    import traceback
    log_with_timestamp(f"🔍 CALL STACK: {traceback.format_stack()[-3].strip()}")
    
    # Generate unique app slug for this user
    app_slug = generate_unique_app_slug(user_slug)
    
    # Get user_id from sms_subscribers table
    try:
        user_result = supabase.table('sms_subscribers').select('id').eq('slug', user_slug).execute()
        if not user_result.data:
            log_with_timestamp(f"❌ User not found with slug: {user_slug}")
            return None, None
        user_id = user_result.data[0]['id']
        log_with_timestamp(f"✅ Found user_id: {user_id} for slug: {user_slug}")
    except Exception as e:
        log_with_timestamp(f"❌ Error finding user: {e}")
        return None, None
    
    # Inject OpenGraph tags into HTML
    public_url = f"https://wtaf.me/{user_slug}/{app_slug}"
    og_image_url = f"{WEB_APP_URL}/images/wtaf-og.png"
    og_tags = f"""<title>WTAF – Delusional App Generator</title>
    <meta property="og:title" content="WTAF by AF" />
    <meta property="og:description" content="Vibecoded chaos, shipped via SMS." />
    <meta property="og:image" content="{og_image_url}" />
    <meta property="og:url" content="{public_url}" />
    <meta name="twitter:card" content="summary_large_image" />"""
    
    # Insert OG tags after <head> tag
    if '<head>' in code:
        code = code.replace('<head>', f'<head>\n    {og_tags}')
    
    # Save to Supabase
    try:
        data = {
            'user_id': user_id,
            'user_slug': user_slug,
            'app_slug': app_slug,
            'coach': coach,
            'sender_phone': sender_phone,
            'original_prompt': original_prompt,
            'html_content': code,
            'status': 'published'
        }
        
        result = supabase.table('wtaf_content').insert(data).execute()
        log_with_timestamp(f"✅ Saved to Supabase: /wtaf/{user_slug}/{app_slug}")
        return app_slug, public_url
        
    except Exception as e:
        log_with_timestamp(f"❌ Error saving to Supabase: {e}")
        return None, None

def save_code_to_file(code, coach, slug, format="html", user_slug=None):
    """Legacy function - now redirects to Supabase for WTAF content"""
    filename = f"{slug}.html"
    log_with_timestamp(f"💾 Starting save_code_to_file: coach={coach}, slug={slug}, user_slug={user_slug}")
    log_with_timestamp(f"🔍 DUPLICATE DEBUG: save_code_to_file called with user_slug={user_slug}")
    
    if user_slug:
        # For WTAF content, redirect to Supabase
        log_with_timestamp("🔄 Redirecting WTAF content to Supabase...")
        log_with_timestamp("❌ ERROR: save_code_to_file should NOT be called with user_slug!")
        # We need the original prompt and sender phone for this to work
        # This is a fallback - the main flow should use save_code_to_supabase directly
        return save_code_to_supabase(code, coach, user_slug, None, "Legacy save")
    else:
        # Save to regular lab folder (non-WTAF content)
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
    
    # Use the new Poolsuite Design System prompt for all pages
    system_prompt = """# Poolsuite Design System API Prompt

You are an expert web designer creating landing pages for a luxury design agency with a signature aesthetic inspired by Poolsuite FM and West Coast luxury. Every page must follow the established design language while adapting the visual theme to match the specific business type.

## CORE DESIGN LANGUAGE (NEVER CHANGE)

### Typography System
- **Headers**: 'Space Grotesk' - weights 300, 400, 500, 700, 900
- **Body**: 'Inter' - weights 300, 400, 500, 600
- **Logo**: Space Grotesk, 3.5-5rem, font-weight 700, letter-spacing -1px to -2px
- **Hero Titles**: Space Grotesk, 3.5-4.2rem, font-weight 500-700
- **Body Text**: Inter, 1.2-1.4rem, font-weight 300, line-height 1.6-1.7

### Layout & Spacing
- **Container**: max-width 1200px, margin 0 auto, padding 20px
- **Border Radius**: 15px (small), 20px (medium), 25px (large), 30px (hero)
- **Card Padding**: 30-45px (small), 50-70px (hero)
- **Grid Gaps**: 30-40px between cards
- **Responsive**: single column below 768px

### Glass Morphism System
```css
background: rgba(255, 255, 255, 0.15-0.25);
backdrop-filter: blur(12-20px);
border: 1px solid rgba(255, 255, 255, 0.2-0.4);
border-radius: 20-30px;
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1-0.15);
```

### Animation Framework
- **Gradient Background**: 400% 400% size, 15-20s ease infinite shift
- **Hover Transitions**: all 0.3-0.4s ease
- **Parallax**: subtleParallax 20-25s ease-in-out infinite, translateY -8px to -12px
- **Float Elements**: 6-8s ease-in-out infinite, translateY -10px to -20px
- **Card Hovers**: translateY -3px to -8px, enhanced shadows

### Interaction Patterns
- **Buttons**: 50px border-radius, padding 18-20px 45-50px, uppercase, letter-spacing 1px
- **Forms**: 15px border-radius, padding 15px 20px, same glass morphism
- **Cards**: hover lift + enhanced background opacity + stronger shadows

## BUSINESS TYPE ADAPTATIONS

### Color Palette Selection
**Pool/Leisure**: Orange → yellow → mint → blue gradients
**Beauty/Wellness**: Pink → coral → warm tones gradients  
**Edgy/Alternative**: Dark → electric pink → cyan → purple gradients
**Tech/Modern**: Blue → teal → purple gradients
**Food/Hospitality**: Warm oranges → reds → yellows

### Floating Elements (4 elements max)
Choose 4 emojis relevant to business type:
- **Pool/Coffee**: 🌴☕🌊🦩
- **Beauty**: ✨💄🪞🪮  
- **Tattoo/Punk**: 💀⚡🔥⛓️
- **Tech**: 🔮💎⚙️🚀
- **Food**: 🍕🍷🌶️🥂

### Effect Variations
**Luxury/Calm**: Floating bubbles, shimmer effects, soft animations
**Edgy/Punk**: Electric sparks, glitch effects, neon glows, aggressive shadows
**Tech**: Grid patterns, scan lines, holographic effects
**Organic**: Flowing particles, gentle waves, natural movement

## CONTENT STRUCTURE REQUIREMENTS

### Header Section
- Logo: Business name in Space Grotesk
- Tagline: Descriptive subtitle with business type/location

### Hero Section
- Glass morphism container with hero content
- H1: Compelling business-focused headline
- Paragraph: 1-2 sentences describing the business value proposition
- Primary CTA + Secondary CTA buttons

### Services/Features Section (3-4 cards)
- Grid layout with glass morphism cards
- Each card: Icon, Title, Description, Price/Details
- Hover effects with enhanced shadows

### Location/Contact Section
- Two-column layout (location info + contact/booking form)
- Address, hours, contextual details
- Functional contact form with proper validation

### Cross-references
- Always reference other businesses on the same block/area
- Build neighborhood ecosystem in copy

## TECHNICAL REQUIREMENTS

### HTML Structure
```html
<!DOCTYPE html>
<html>
<head>
  <title>[Business Name]</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap');
    /* Core system styles */
  </style>
</head>
<body>
  <!-- Floating effects -->
  <!-- Floating elements -->
  <header><!-- Logo + tagline --></header>
  <main>
    <section class="hero"><!-- Hero content --></section>
    <section class="services"><!-- Service cards --></section>
    <section class="location-contact"><!-- Location + contact --></section>
  </main>
  <script><!-- Interactive features --></script>
</body>
</html>
```

### JavaScript Features
- Mouse parallax for floating elements
- Scroll-based parallax for sections
- Intersection observer for card reveals
- Form validation and submission
- Smooth scrolling for anchor links
- Business-specific interactive effects

### Responsive Design
- Mobile-first approach
- Single column layout below 768px
- Adjusted font sizes and padding for mobile
- Touch-friendly button sizes

## OUTPUT FORMAT

Create a complete, functional HTML page with:
1. **Appropriate color palette** for the business type
2. **Themed floating elements** (4 emojis)
3. **Business-specific content** (services, pricing, location)
4. **Contextual copy** that feels authentic to the business
5. **Interactive features** that enhance the user experience
6. **Perfect adherence** to the core design language
7. **Cross-references** to other businesses in the area

The result should feel like it came from the same luxury design agency while being perfectly suited to the specific business type and industry.

## BUSINESS CONTEXT PROMPT

When creating a page, first consider:
- What type of business is this?
- What emotion should the user feel?
- What's the price point and target demographic?
- How should this adapt the core design language?
- What specific services/products need to be highlighted?

Then apply the design system accordingly while maintaining the signature aesthetic that makes all pages recognizably from the same design studio."""

    full_prompt = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]

    # Use Claude 3 Sonnet for all WTAF/CODE commands
    log_with_timestamp("🧠 Using Claude 3 Sonnet for web design...")
    
    try:
        # Call Anthropic Claude API
        anthropic_api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not anthropic_api_key:
            raise Exception("ANTHROPIC_API_KEY not found in environment")
            
        headers = {
            "Authorization": f"Bearer {anthropic_api_key}",
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        # Prepare the API call for Claude 3 Sonnet
        claude_api_url = "https://api.anthropic.com/v1/messages"
        payload = {
            "model": "claude-3-sonnet-20240229",
            "max_tokens": 8000,
            "temperature": 0.7,
            "messages": [
                {
                    "role": "user",
                    "content": f"{system_prompt}\n\n{user_prompt}"
                }
            ]
        }
        
        log_with_timestamp(f"🔍 Sending Claude 3 Sonnet request with token limit: 8000")
        
        # Make the API call
        response = requests.post(claude_api_url, headers=headers, json=payload)
        response_json = response.json()
        log_with_timestamp(f"📊 Claude response received - status code: {response.status_code}")
        
        # Debug response structure
        log_with_timestamp(f"📋 Claude response keys: {list(response_json.keys())}")
        
        # Extract the result
        if "content" in response_json and len(response_json["content"]) > 0:
            result = response_json["content"][0]["text"]
            log_with_timestamp(f"✅ Claude 3 Sonnet response received, length: {len(result)} chars")
        else:
            log_with_timestamp(f"⚠️ Unexpected Claude API response structure: {response_json}")
            raise Exception("Invalid Claude response structure")
            
    except Exception as e:
        log_with_timestamp(f"⚠️ Claude API error, falling back to GPT-4o: {e}")
        # Fall back to GPT-4o
        try:
            log_with_timestamp("🧠 Falling back to GPT-4o...")
            response = openai.ChatCompletion.create(
                model="gpt-4o",
                messages=full_prompt,
                temperature=0.8,
                max_tokens=8000
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
        if user_slug:
            # Use new Supabase save function for WTAF content
            log_with_timestamp(f"🎯 Using direct Supabase save for user_slug: {user_slug}")
            app_slug, public_url = save_code_to_supabase(code, coach, user_slug, sender_phone, user_prompt)
        else:
            # Use legacy file save for non-WTAF content (NO user_slug passed to prevent double save)
            log_with_timestamp(f"📁 Using legacy file save for non-WTAF content")
            filename, public_url = save_code_to_file(code, coach, slug, user_slug=None)
        
        if public_url:
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
            log_with_timestamp("❌ Failed to save content")
            # Send failure SMS
            if sender_phone:
                send_confirmation_sms("🤷 That broke. Database hiccup. Try a different WTAF?", sender_phone)
            else:
                send_confirmation_sms("🤷 That broke. Database hiccup. Try a different WTAF?")
    else:
        log_with_timestamp("⚠️ No code block found.")
        # Send failure SMS
        if sender_phone:
            send_confirmation_sms("🤷 That broke. Honestly, not surprised. Try a different WTAF?", sender_phone)
        else:
            send_confirmation_sms("🤷 That broke. Honestly, not surprised. Try a different WTAF?")

    return True

# Function removed - file moving is now handled directly in monitor loop to prevent race conditions

def monitor_loop():
    log_with_timestamp("🌀 GPT-4o monitor running...")
    log_with_timestamp(f"👀 Watching directories: {WATCH_DIRS}")
    processed = set()
    currently_processing = set()  # Track files being processed right now
    loop_count = 0
    
    while True:
        try:
            loop_count += 1
            if loop_count % 10 == 1:  # Log every 10th loop to show it's alive
                log_with_timestamp(f"🔄 Monitor loop #{loop_count} - checking for files...")
                
            newest = get_newest_file(WATCH_DIRS)
            newest_str = str(newest) if newest else None
            
            # Check if file exists AND hasn't been processed AND isn't being processed
            if newest and newest_str not in processed and newest_str not in currently_processing and os.path.exists(newest):
                log_with_timestamp(f"🚨 New file detected: {newest}")
                log_with_timestamp(f"📄 File size: {os.path.getsize(newest)} bytes")
                
                # CRITICAL FIX: Immediately move file to prevent race conditions
                # Create a temporary processing filename with timestamp
                processing_name = f"PROCESSING_{datetime.now().strftime('%H%M%S')}_{os.path.basename(newest)}"
                processing_path = os.path.join(os.path.dirname(newest), processing_name)
                
                try:
                    # Atomic rename to claim the file immediately
                    os.rename(str(newest), processing_path)
                    log_with_timestamp(f"🔒 File locked for processing: {processing_path}")
                    
                    # Mark as processing
                    currently_processing.add(newest_str)
                    
                    # Process the file
                    if execute_gpt4o(processing_path):
                        # Move to final processed location
                        target = os.path.join(PROCESSED_DIR, os.path.basename(newest))
                        os.rename(processing_path, target)
                        processed.add(newest_str)
                        log_with_timestamp(f"✅ Successfully processed and moved: {target}")
                    else:
                        log_with_timestamp(f"❌ Failed to process: {processing_path}")
                        # Move failed file to processed anyway to avoid reprocessing
                        target = os.path.join(PROCESSED_DIR, f"FAILED_{os.path.basename(newest)}")
                        os.rename(processing_path, target)
                        
                except FileNotFoundError:
                    # Another process already claimed this file
                    log_with_timestamp(f"⚡ File already claimed by another process: {newest}")
                    continue
                except OSError as e:
                    log_with_timestamp(f"❌ Error claiming file {newest}: {e}")
                    continue
                finally:
                    # Always remove from currently_processing when done
                    currently_processing.discard(newest_str)
                    
            else:
                if loop_count % 10 == 1:  # Only log occasionally to avoid spam
                    if newest and str(newest) in processed:
                        log_with_timestamp(f"⏭️ File already processed: {newest}")
                    elif newest and str(newest) in currently_processing:
                        log_with_timestamp(f"⚙️ File currently being processed: {newest}")
                    else:
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
            # Clean up processing set on error
            currently_processing.clear()
            time.sleep(CHECK_INTERVAL)

monitor_loop()