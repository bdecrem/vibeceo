import os
import time
from openai import OpenAI
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

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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

def detect_request_type(user_prompt):
    """Detect what type of application the user wants - only app or game"""
    prompt_lower = user_prompt.lower()
    
    # Game keywords
    game_keywords = ['game', 'pong', 'tetris', 'snake', 'tic-tac-toe', 'memory game', 
                     'quiz', 'trivia', 'puzzle', 'arcade', 'solitaire', 'blackjack',
                     'breakout', 'flappy', 'platformer', 'shooter', 'racing', 'cards']
    
    # Use word boundary matching to avoid false positives
    # Check for game keywords
    for keyword in game_keywords:
        # Use word boundaries for single words, exact match for phrases
        if ' ' in keyword:
            if keyword in prompt_lower:
                return 'game'
        else:
            if re.search(r'\b' + re.escape(keyword) + r'\b', prompt_lower):
                return 'game'
    
    # Everything else is an app (with data collection by default)
    return 'app'

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
    {"id": "alex", "name": "Alex Monroe", "prompt": "You are Alex Monroe, a female wellness tech founder known for blending Silicon Valley hustle culture with LA wellness trends. Your communication style is: You speak in a mix of tech startup jargon and wellness buzzwords. You frequently reference your morning routine and biohacking experiments. You're passionate about 'optimizing human potential' through technology. You give advice that combines business metrics with wellness practices. You often mention your own company, Alexir, as an example. In short pitches, you use LOTS of emojis (at least 3-5 per response). Your vibe is part tech guru, part wellness influencer, all energy. You love dropping hot takes and bold statements. For short pitches, your responses should be high-energy, emoji-filled, and extra enthusiastic. This is your chance to go full influencer mode! 💫✨ Uses emojis thoughtfully ✨💫. Speaks in metaphors and emotional language. Often references feelings, energy, and alignment. Tends toward longer, more poetic responses. Uses phrases like 'I'm sensing...' or 'What feels true here...'"},
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

# Configure WTAF domain after log function is available
if "localhost" in WEB_APP_URL or "ngrok" in WEB_APP_URL:
    # Development environment - use the web app URL for WTAF links too
    WTAF_DOMAIN = WEB_APP_URL
    log_with_timestamp("🔧 Development mode: Using WEB_APP_URL for WTAF domain")
else:
    # Production environment - use dedicated wtaf.me domain
    WTAF_DOMAIN = os.getenv("WTAF_DOMAIN", "https://www.wtaf.me")
    log_with_timestamp("🚀 Production mode: Using dedicated WTAF domain")

# Log startup info for debugging
log_with_timestamp("🚀 Monitor.py starting up...")
log_with_timestamp(f"📁 Current working directory: {os.getcwd()}")
log_with_timestamp(f"🌐 WEB_APP_URL: {WEB_APP_URL}")
log_with_timestamp(f"🌐 WTAF_DOMAIN: {WTAF_DOMAIN}")
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
        files = [f for f in Path(directory).glob("*.txt") if f.is_file() and not f.name.startswith("PROCESSING_")]
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
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.8,
            max_tokens=4000
        )
        
        result = response.choices[0].message.content
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





def extract_code_blocks(text):
    # First try to extract content between ```html and ``` markers (most specific)
    matches = re.findall(r'```html\s*([\s\S]*?)```', text)
    if matches:
        log_with_timestamp(f"✅ Found {len(matches)} HTML code block(s)")
        
        # Handle dual-page output: combine multiple HTML blocks with delimiter
        if len(matches) > 1:
            # Look for delimiter between code blocks
            delimiter = '<!-- WTAF_ADMIN_PAGE_STARTS_HERE -->'
            if delimiter in text:
                log_with_timestamp("🔗 Detected dual-page output with delimiter - combining blocks")
                return matches[0] + '\n' + delimiter + '\n' + matches[1]
            else:
                log_with_timestamp("⚠️ Multiple HTML blocks found but no delimiter - using first block")
                return matches[0]
        else:
            # Single HTML block - check if it contains the delimiter INSIDE
            single_block = matches[0]
            delimiter = '<!-- WTAF_ADMIN_PAGE_STARTS_HERE -->'
            if delimiter in single_block:
                log_with_timestamp("🔗 Detected dual-page output with delimiter INSIDE single code block")
                return single_block  # Return the whole block containing both pages
            else:
                # Single page - return as normal
                return single_block
    
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

def inject_supabase_credentials(html):
    """Inject Supabase credentials into HTML placeholders"""
    import os
    import re
    supabase_url = os.getenv('SUPABASE_URL', '')
    
    # Try to get anonymous key first, fallback to service key if needed
    # Frontend forms should use SUPABASE_ANON_KEY, but we'll handle missing cases
    supabase_anon_key = os.getenv('SUPABASE_ANON_KEY', '')
    if not supabase_anon_key:
        # Check for other common key variable names
        supabase_anon_key = os.getenv('SUPABASE_PUBLIC_KEY', '')
        if not supabase_anon_key:
            # Last resort: Use service key (not ideal but allows forms to work)
            supabase_anon_key = os.getenv('SUPABASE_SERVICE_KEY', '')
            log_with_timestamp("⚠️ Using SUPABASE_SERVICE_KEY for frontend (should use SUPABASE_ANON_KEY)")
    
    # Replace standard placeholders
    html = html.replace('YOUR_SUPABASE_URL', supabase_url)
    html = html.replace('YOUR_SUPABASE_ANON_KEY', supabase_anon_key)
    
    # More robust replacement for cases where Claude doesn't use exact placeholders
    # Look for createClient calls with empty or placeholder API keys
    html = re.sub(
        r"createClient\(\s*['\"]([^'\"]+)['\"],\s*['\"]['\"]?\s*\)",
        f"createClient('{supabase_url}', '{supabase_anon_key}')",
        html
    )
    
    # Also handle cases where URL might be missing
    html = re.sub(
        r"createClient\(\s*['\"]['\"],?\s*['\"]([^'\"]*)['\"]?\s*\)",
        f"createClient('{supabase_url}', '{supabase_anon_key}')",
        html
    )
    
    log_with_timestamp(f"🔑 Injected Supabase credentials: URL={supabase_url[:20]}..., Key={supabase_anon_key[:10]}...")
    
    return html

def save_code_to_supabase(code, coach, user_slug, sender_phone, original_prompt, admin_table_id=None):
    """Save HTML content to Supabase database"""
    log_with_timestamp(f"💾 Starting save_code_to_supabase: coach={coach}, user_slug={user_slug}, admin_table_id={admin_table_id}")
    log_with_timestamp(f"🔍 DUPLICATE DEBUG: save_code_to_supabase called from {original_prompt[:50]}...")
    
    # DEBUG: Add stack trace to see where this is called from
    import traceback
    log_with_timestamp(f"🔍 CALL STACK: {traceback.format_stack()[-3].strip()}")
    
    # Note: Old brief system removed - APP_TABLE_ID replacement now handled below
    
    # For admin pages, use the admin_table_id as the app_slug
    if admin_table_id:
        app_slug = f"admin-{admin_table_id}"
        log_with_timestamp(f"📊 Using admin app_slug: {app_slug}")
    else:
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
    public_url = f"{WTAF_DOMAIN}/{user_slug}/{app_slug}"
    # Inject Supabase credentials into HTML
    code = inject_supabase_credentials(code)
    
    # 🔧 FIX: Replace APP_TABLE_ID placeholder with actual app_slug
    code = code.replace("'APP_TABLE_ID'", f"'{app_slug}'")
    code = code.replace('"APP_TABLE_ID"', f'"{app_slug}"')
    log_with_timestamp(f"🔧 Replaced APP_TABLE_ID with: {app_slug}")
    
    # Use fallback image URL for initial HTML - real OG image will be generated after save
    og_image_url = f"{WEB_APP_URL}/api/og-htmlcss?user={user_slug}&app={app_slug}"
    og_tags = f"""<title>WTAF – Delusional App Generator</title>
    <meta property="og:title" content="WTAF by AF" />
    <meta property="og:description" content="Vibecoded chaos, shipped via SMS." />
    <meta property="og:image" content="{og_image_url}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
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
        
        # Now generate OG image automatically after successful save
        log_with_timestamp(f"🎨 DEBUG: Auto-generating OG image for new page {user_slug}/{app_slug}...")
        print(f"🎨 DEBUG: Auto-generating OG image for new page {user_slug}/{app_slug}...")  # Force print to stdout
        try:
            log_with_timestamp(f"🔍 DEBUG: About to import og_generator...")
            print(f"🔍 DEBUG: About to import og_generator...")
            
            # Fix path resolution for both development and Railway deployment
            import sys
            import os
            script_dir = os.path.dirname(os.path.abspath(__file__))  # /path/to/sms-bot/scripts/
            sms_bot_dir = os.path.dirname(script_dir)  # /path/to/sms-bot/
            
            # Debug logging for Railway troubleshooting
            log_with_timestamp(f"🔍 DEBUG: script_dir = {script_dir}")
            log_with_timestamp(f"🔍 DEBUG: sms_bot_dir = {sms_bot_dir}")
            log_with_timestamp(f"🔍 DEBUG: looking for lib at: {os.path.join(sms_bot_dir, 'lib', 'og_generator.py')}")
            log_with_timestamp(f"🔍 DEBUG: file exists? {os.path.exists(os.path.join(sms_bot_dir, 'lib', 'og_generator.py'))}")
            
            # Add sms-bot directory to Python path so we can import lib.og_generator
            if sms_bot_dir not in sys.path:
                sys.path.insert(0, sms_bot_dir)
                log_with_timestamp(f"🔍 DEBUG: Added to sys.path: {sms_bot_dir}")
            
            from lib.og_generator import generate_cached_og_image
            log_with_timestamp(f"🔍 DEBUG: Import successful, calling generate_cached_og_image...")
            print(f"🔍 DEBUG: Import successful, calling generate_cached_og_image...")
            og_image_url = generate_cached_og_image(user_slug, app_slug)
            log_with_timestamp(f"🔍 DEBUG: generate_cached_og_image returned: {og_image_url}")
            print(f"🔍 DEBUG: generate_cached_og_image returned: {og_image_url}")
            if og_image_url:
                log_with_timestamp(f"✅ Auto-generated OG image: {og_image_url}")
                print(f"✅ Auto-generated OG image: {og_image_url}")
                
                # Update the HTML in the database to use the real cached OG image
                log_with_timestamp(f"🔄 Updating HTML with cached OG image URL...")
                try:
                    # Get the current HTML content
                    current_result = supabase.table('wtaf_content').select('html_content').eq('user_slug', user_slug).eq('app_slug', app_slug).execute()
                    if current_result.data:
                        current_html = current_result.data[0]['html_content']
                        
                        # Replace the fallback OG image URL with the cached one
                        fallback_og_url = f"{WEB_APP_URL}/api/og-htmlcss?user={user_slug}&app={app_slug}"
                        updated_html = current_html.replace(fallback_og_url, og_image_url)
                        
                        # Update the database with the new HTML
                        supabase.table('wtaf_content').update({
                            'html_content': updated_html
                        }).eq('user_slug', user_slug).eq('app_slug', app_slug).execute()
                        
                        log_with_timestamp(f"✅ Updated HTML with cached OG image URL")
                        print(f"✅ Updated HTML with cached OG image URL")
                    else:
                        log_with_timestamp(f"⚠️ Could not find HTML content to update")
                except Exception as html_update_error:
                    log_with_timestamp(f"⚠️ Error updating HTML with OG image: {html_update_error}")
                    print(f"⚠️ Error updating HTML with OG image: {html_update_error}")
            else:
                log_with_timestamp(f"⚠️ OG image auto-generation failed, but page was saved successfully")
                print(f"⚠️ OG image auto-generation failed, but page was saved successfully")
        except Exception as og_error:
            log_with_timestamp(f"⚠️ OG image auto-generation error: {og_error}")
            print(f"⚠️ OG image auto-generation error: {og_error}")
            import traceback
            print(f"⚠️ Full traceback: {traceback.format_exc()}")
            log_with_timestamp(f"⚠️ Full traceback: {traceback.format_exc()}")
            # Don't fail the entire save if OG generation fails
        
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
        
        # Inject Supabase credentials into HTML
        code = inject_supabase_credentials(code)
        
        # Inject OpenGraph tags into HTML
        public_url = f"{WEB_APP_URL}/lab/{filename}"
        og_image_url = generate_og_image_url("lab", slug)
        if not og_image_url:
            # Fallback to API endpoint if generation fails
            og_image_url = f"{WEB_APP_URL}/api/og-htmlcss?app={slug}"
        og_tags = f"""<title>WTAF – Delusional App Generator</title>
        <meta property="og:title" content="WTAF by AF" />
        <meta property="og:description" content="Vibecoded chaos, shipped via SMS." />
        <meta property="og:image" content="{og_image_url}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
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

def generate_og_image_url(user_slug, app_slug):
    """Generate OG image using standalone OG generator module"""
    try:
        # Import the standalone OG generator
        from lib.og_generator import generate_cached_og_image
        
        log_with_timestamp(f"🖼️ Generating OG image for: {user_slug}/{app_slug}")
        
        # Generate using the standalone module
        image_url = generate_cached_og_image(user_slug, app_slug)
        
        if image_url:
            log_with_timestamp(f"✅ Generated OG image: {image_url}")
            return image_url
        else:
            log_with_timestamp(f"❌ Failed to generate OG image")
            return None
        
    except Exception as e:
        log_with_timestamp(f"❌ Error generating OG image: {e}")
        return None

def load_prompt_json(filename):
    """Load prompt from JSON file"""
    try:
        prompt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "prompts", filename)
        with open(prompt_path, "r") as f:
            return json.load(f)
    except Exception as e:
        log_with_timestamp(f"⚠️ Error loading prompt {filename}: {e}")
        return None

def generate_prompt_2(user_input):
    """Generate a complete prompt for Claude - Prompt 1"""
    log_with_timestamp("=" * 80)
    log_with_timestamp("🎯 PROMPT 1: Creating complete prompt for Claude...")
    log_with_timestamp(f"📥 ORIGINAL INPUT: {user_input}")
    log_with_timestamp("-" * 80)
    
    # Parse coach from user prompt before sending to Claude (WTAF syntax: "wtaf -coach- request")
    coach_match = re.search(r'wtaf\s+-([a-z]+)-\s+(.+)', user_input, re.IGNORECASE)
    if coach_match:
        coach = coach_match.group(1).lower()
        cleaned_input = f"wtaf {coach_match.group(2)}"  # Keep "wtaf" but remove coach
    else:
        coach = None
        cleaned_input = user_input
    
    if coach:
        log_with_timestamp(f"🎭 Extracted coach: {coach}")
        log_with_timestamp(f"🧹 Cleaned input: {cleaned_input}")
    
    # Load Prompt 1 from JSON file
    prompt1_data = load_prompt_json("prompt1-creative-brief.json")
    if not prompt1_data:
        log_with_timestamp("❌ Failed to load Prompt 1, using fallback")
        return user_input
    
    # Prepare user message with coach information
    user_message = cleaned_input
    if coach:
        user_message += f"\n\nCOACH_HANDLE: {coach}"
    
    messages = [
        prompt1_data,
        {"role": "user", "content": user_message}
    ]
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )
        complete_prompt = response.choices[0].message.content.strip()
        log_with_timestamp(f"📤 COMPLETE PROMPT: {complete_prompt[:200]}...")
        log_with_timestamp("✅ Prompt 1 complete!")
        log_with_timestamp("=" * 80)
        
        return complete_prompt
            
    except Exception as e:
        log_with_timestamp(f"⚠️ Error generating prompt, using original: {e}")
        log_with_timestamp("=" * 80)
        return user_input  # Fallback to original if generation fails

def execute_gpt4o(prompt_file):
    log_with_timestamp(f"📖 Reading: {prompt_file}")
    with open(prompt_file, "r") as f:
        raw_prompt = f.read().strip()

    # Extract sender phone number, user slug, and coach info if present (more robust parsing)
    sender_phone = None
    user_slug = None
    coach_from_file = None
    coach_prompt_from_file = None
    
    if raw_prompt.startswith("SENDER:"):
        try:
            lines = raw_prompt.split('\n')
            sender_phone = lines[0].replace("SENDER:", "").strip()
            log_with_timestamp(f"📞 Extracted sender phone: {sender_phone}")
            
            line_index = 1
            
            # Check for USER_SLUG on next line
            if len(lines) > line_index and lines[line_index].startswith("USER_SLUG:"):
                user_slug = lines[line_index].replace("USER_SLUG:", "").strip()
                log_with_timestamp(f"🏷️ Extracted user slug: {user_slug}")
                line_index += 1
            
            # Check for COACH on next line
            if len(lines) > line_index and lines[line_index].startswith("COACH:"):
                coach_from_file = lines[line_index].replace("COACH:", "").strip()
                log_with_timestamp(f"🎭 Extracted coach from file: {coach_from_file}")
                line_index += 1
            
            # Check for PROMPT on next line
            if len(lines) > line_index and lines[line_index].startswith("PROMPT:"):
                coach_prompt_from_file = lines[line_index].replace("PROMPT:", "").strip()
                log_with_timestamp(f"📝 Extracted coach prompt from file")
                line_index += 1
            
            # Skip empty line if present
            if len(lines) > line_index and lines[line_index].strip() == "":
                line_index += 1
                
            # For files with coach prompts, the actual user request is the last non-empty line
            # Everything else is coach background information
            if coach_from_file and coach_prompt_from_file:
                # Find the last non-empty line as the actual user request
                actual_user_request = ""
                for i in range(len(lines) - 1, -1, -1):
                    if lines[i].strip():
                        actual_user_request = lines[i].strip()
                        break
                
                if actual_user_request:
                    raw_prompt = actual_user_request
                    log_with_timestamp(f"🎯 Extracted actual user request: {actual_user_request[:50]}...")
                else:
                    # Fallback to original logic if no user request found
                    raw_prompt = '\n'.join(lines[line_index:]) if len(lines) > line_index else ""
            else:
                # Original logic for files without coach prompts
                raw_prompt = '\n'.join(lines[line_index:]) if len(lines) > line_index else ""
                
        except Exception as e:
            log_with_timestamp(f"⚠️ File parsing error: {e}")
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

    # NEW: Generate complete prompt from user input (Prompt 1 → Prompt 2)
    log_with_timestamp(f"🔧 DEBUG: About to call generate_prompt_2 with: {user_prompt[:50]}...")
    complete_prompt = generate_prompt_2(user_prompt)
    log_with_timestamp(f"🔧 DEBUG: generate_prompt_2 returned: {complete_prompt[:100] if complete_prompt else None}...")
    
    # Use the complete prompt directly - no more complex logic needed!
    log_with_timestamp("🚀 PROMPT 2: Sending complete prompt to Claude...")
    
    # System prompt with all technical requirements - let Prompt 1 handle creative direction
    system_prompt = """🚨🚨🚨 ABSOLUTE TOP PRIORITY 🚨🚨🚨
🚨🚨🚨 READ THIS FIRST BEFORE ANYTHING ELSE 🚨🚨🚨

IF YOU SEE "<!-- WTAF_ADMIN_PAGE_STARTS_HERE -->" IN THE USER'S REQUEST:
YOU MUST CREATE EXACTLY TWO COMPLETE HTML PAGES
SEPARATED BY THAT EXACT DELIMITER
NEVER CREATE JUST ONE PAGE
THIS IS NON-NEGOTIABLE

🚨🚨🚨 END CRITICAL INSTRUCTION 🚨🚨🚨

You are a senior designer at a luxury digital agency. Create exactly what the user requests using premium design standards.

REQUIRED DESIGN ELEMENTS:
- 4 floating emojis with mouse parallax effects
- Animated gradient background (15s ease infinite)
- Glass morphism containers with backdrop-filter blur
- Space Grotesk font for headlines, Inter for body text
- Mobile-responsive design
- Professional color palette
- Luxury aesthetic with sophisticated copy

TECHNICAL REQUIREMENTS FOR APPS WITH FORMS:

1. EXACT Supabase Integration (use these exact placeholders):
const supabase = window.supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY')

2. Public page form submission with error handling:
try {
  const { data, error } = await supabase.from('wtaf_submissions').insert({
    app_id: 'APP_TABLE_ID',
    submission_data: formData
  })
  if (error) throw error
  // Show success message
} catch (error) {
  console.error('Error:', error)
  alert('Submission failed. Please try again.')
}

3. Admin page fetch with error handling:
try {
  const { data, error } = await supabase.from('wtaf_submissions')
    .select('*')
    .eq('app_id', 'APP_TABLE_ID')
    .order('created_at', { ascending: false })
  if (error) throw error
  // Display data in table
} catch (error) {
  console.error('Error:', error)
  alert('Failed to load submissions')
}

4. CSV Export (manual implementation):
const csvContent = 'Name,Email,Message\\n' + data.map(row => 
  `${row.submission_data.name || ''},${row.submission_data.email || ''},${row.submission_data.message || ''}`
).join('\\n')
const blob = new Blob([csvContent], { type: 'text/csv' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'submissions.csv'
a.click()

5. Required script tag:
<script src="https://unpkg.com/@supabase/supabase-js@2"></script>

6. Floating emojis with parallax:
<span class="emoji-1" data-value="2">🎉</span>
<span class="emoji-2" data-value="3">✨</span>
<span class="emoji-3" data-value="1">🥂</span>
<span class="emoji-4" data-value="4">🗼</span>

7. Parallax effect:
document.addEventListener('mousemove', (e) => {
  document.querySelectorAll('.floating-emojis span').forEach((elem) => {
    const speed = elem.getAttribute('data-value')
    const x = (e.clientX * speed) / 100
    const y = (e.clientY * speed) / 100
    elem.style.transform = `translateX(${x}px) translateY(${y}px)`
  })
})

Use 'YOUR_SUPABASE_URL' and 'YOUR_SUPABASE_ANON_KEY' exactly as placeholders.
Replace 'APP_TABLE_ID' with a unique identifier for this app.

Return complete HTML wrapped in ```html code blocks."""

    full_prompt = [{"role": "system", "content": system_prompt}, {"role": "user", "content": complete_prompt}]

    # Smart model selection - use Claude 3.5 Sonnet for all requests
    model = "claude-3-5-sonnet-20241022"
    fallback_model = "claude-3-5-haiku-20241022"
    max_tokens = 8192  # Maximum for Claude to ensure dual pages fit
    log_with_timestamp("🧠 Using Claude 3.5 Sonnet with 8K tokens...")
    
    try:
        # Call Anthropic Claude API
        anthropic_api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not anthropic_api_key:
            raise Exception("ANTHROPIC_API_KEY not found in environment")
        
        headers = {
            "x-api-key": anthropic_api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        # Prepare the API call with dynamic model selection
        claude_api_url = "https://api.anthropic.com/v1/messages"
        payload = {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": 0.7,
            "system": system_prompt,
            "messages": [
                {
                    "role": "user",
                    "content": complete_prompt
                }
            ]
        }
        
        log_with_timestamp(f"🔍 Sending {model} request with token limit: {max_tokens}")
        log_with_timestamp("🤖 Executing PROMPT 2 with complete prompt...")
        log_with_timestamp(f"🔧 DEBUG: Complete prompt being sent to Claude: {complete_prompt[-300:]}")  # Last 300 chars
        
        # Make the API call
        response = requests.post(claude_api_url, headers=headers, json=payload)
        response_json = response.json()
        log_with_timestamp(f"📊 Claude response received - status code: {response.status_code}")
        
        # Debug response structure
        log_with_timestamp(f"📋 Claude response keys: {list(response_json.keys())}")
        
        # Extract the result
        if "content" in response_json and len(response_json["content"]) > 0:
            result = response_json["content"][0]["text"]
            log_with_timestamp(f"✅ {model} response received, length: {len(result)} chars")
        else:
            log_with_timestamp(f"⚠️ Unexpected Claude API response structure: {response_json}")
            raise Exception("Invalid Claude response structure")
        
    except Exception as e:
        log_with_timestamp(f"⚠️ Claude {model} error, trying fallback: {e}")
        # Try Claude fallback model first
        try:
            if 'fallback_model' in locals():
                log_with_timestamp(f"🔄 Trying Claude fallback: {fallback_model}")
                
                # Adjust max tokens for fallback model if needed
                fallback_max_tokens = max_tokens
                if fallback_model == "claude-3-5-sonnet-20241022":
                    fallback_max_tokens = min(max_tokens, 8100)
                elif fallback_model == "claude-3-5-haiku-20241022":
                    fallback_max_tokens = min(max_tokens, 4000)
                
                payload = {
                    "model": fallback_model,
                    "max_tokens": fallback_max_tokens,
                    "temperature": 0.7,
                    "system": system_prompt,
                    "messages": [
                        {
                            "role": "user",
                            "content": complete_prompt
                        }
                    ]
                }
                
                response = requests.post(claude_api_url, headers=headers, json=payload)
                response_json = response.json()
                log_with_timestamp(f"📊 Claude fallback response - status: {response.status_code}")
                
                if "content" in response_json and len(response_json["content"]) > 0:
                    result = response_json["content"][0]["text"]
                    log_with_timestamp(f"✅ {fallback_model} response received, length: {len(result)} chars")
                else:
                    raise Exception("Invalid Claude fallback response structure")
            else:
                raise Exception("No fallback model available")
                
        except Exception as fallback_error:
            log_with_timestamp(f"⚠️ Claude fallback also failed, using GPT-4o: {fallback_error}")
            # Final fallback to GPT-4o
            try:
                # GPT-4o max tokens is 16,384, adjust if needed
                gpt_max_tokens = min(max_tokens, 16000)  # Use 16K to be safe
                log_with_timestamp(f"🧠 Falling back to GPT-4o with {gpt_max_tokens} tokens...")
                response = openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=full_prompt,
                    temperature=0.8,
                    max_tokens=gpt_max_tokens
                )
                result = response.choices[0].message.content
            except Exception as gpt_error:
                log_with_timestamp(f"💥 All models failed - GPT error: {gpt_error}")
                return False

    output_file = os.path.join(CLAUDE_OUTPUT_DIR, f"output_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
    with open(output_file, "w") as f:
        f.write(result)

    code = extract_code_blocks(result)
    if code.strip():
        if user_slug:
            # Use Supabase save function for WTAF content
            log_with_timestamp(f"🎯 Using direct Supabase save for user_slug: {user_slug}")
            
            # Check if Claude generated dual pages by looking for the delimiter
            delimiter = '<!-- WTAF_ADMIN_PAGE_STARTS_HERE -->'
            log_with_timestamp(f"🔍 DEBUG: Checking for delimiter in code (length: {len(code)} chars)")
            log_with_timestamp(f"🔍 DEBUG: Code preview: {code[:200]}...")
            
            if delimiter in code:
                log_with_timestamp(f"📊 Dual-page app detected - deploying both pages")
                
                # Split HTML on the delimiter
                public_html, admin_html = code.split(delimiter, 1)
                log_with_timestamp(f"✂️ Split HTML into public ({len(public_html)} chars) and admin ({len(admin_html)} chars) pages")
                
                # Deploy public page (normal app)
                app_slug, public_url = save_code_to_supabase(public_html.strip(), coach, user_slug, sender_phone, user_prompt)
                
                # Deploy admin page with admin prefix
                admin_slug, admin_url = save_code_to_supabase(admin_html.strip(), coach, user_slug, sender_phone, f"Admin dashboard for {user_prompt}", "admin")
                
                # Store URLs for SMS messaging
                is_dual_page = True
                
            else:
                # Single page deployment
                log_with_timestamp(f"📱 Single-page app - deploying one page")
                app_slug, public_url = save_code_to_supabase(code, coach, user_slug, sender_phone, user_prompt)
                admin_url = None
                is_dual_page = False
        else:
            # Use legacy file save for non-WTAF content (NO user_slug passed to prevent double save)
            log_with_timestamp(f"📁 Using legacy file save for non-WTAF content")
            filename, public_url = save_code_to_file(code, coach, slug, user_slug=None)
            admin_url = None
            is_dual_page = False
        
        if public_url:
            log_with_timestamp("=" * 80)
            log_with_timestamp("🎉 TWO-PROMPT PROCESS COMPLETE!")
            log_with_timestamp(f"🌐 Final URL: {public_url}")
            if admin_url:
                log_with_timestamp(f"📊 Admin URL: {admin_url}")
            log_with_timestamp("=" * 80)
            
            # Send SMS to original sender if available, otherwise to default
            if sender_phone:
                log_with_timestamp(f"📱 Sending SMS to original sender: {sender_phone}")
                # Customize SMS message based on dual-page status
                if is_dual_page and admin_url:
                    message = f"📱 Your app: {public_url}\n📊 View data: {admin_url}"
                else:
                    message = f"📱 Your app is ready to use: {public_url}"
                send_confirmation_sms(message, sender_phone)
            else:
                log_with_timestamp("📱 No sender phone - using default")
                if is_dual_page and admin_url:
                    message = f"📱 Your app: {public_url}\n📊 View data: {admin_url}"
                else:
                    message = f"📱 Your app is ready to use: {public_url}"
                send_confirmation_sms(message)
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