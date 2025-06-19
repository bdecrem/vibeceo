#!/usr/bin/env python3

import os
import sys
import uuid
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

def log_message(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def generate_production_test_page():
    """Create a page using the production method but simplified"""

    log_message("🚀 Creating page using production-style approach")
    log_message("=" * 60)

    try:
        # Import Supabase client
        from supabase import create_client

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

        if not supabase_url or not supabase_key:
            log_message("❌ Missing Supabase credentials")
            return None

        supabase = create_client(supabase_url, supabase_key)

        # Generate proper color-animal-action slug like the real system
        import random
        COLORS = ["golden", "crimson", "azure", "emerald", "violet", "coral", "amber", "silver", "ruby", "sapphire", "bronze", "pearl", "turquoise", "jade", "rose"]
        ANIMALS = ["fox", "owl", "wolf", "bear", "eagle", "lion", "tiger", "deer", "rabbit", "hawk", "dolphin", "whale", "elephant", "jaguar", "falcon"]
        ACTIONS = ["dancing", "flying", "running", "jumping", "swimming", "climbing", "singing", "painting", "coding", "dreaming", "exploring", "creating", "building", "racing", "soaring"]

        def generate_fun_slug():
            color = random.choice(COLORS)
            animal = random.choice(ANIMALS)
            action = random.choice(ACTIONS)
            return f"{color}-{animal}-{action}"

        # Generate unique identifiers
        user_slug = "bart"  # Use existing user

        # Generate unique app slug
        max_attempts = 10
        attempts = 0
        app_slug = None

        while attempts < max_attempts:
            test_slug = generate_fun_slug()
            # Check if this slug already exists for this user
            try:
                result = supabase.table('wtaf_content').select('id').eq('user_slug', user_slug).eq('app_slug', test_slug).execute()
                if not result.data:  # No existing record found
                    app_slug = test_slug
                    break
            except Exception as e:
                log_message(f"⚠️ Error checking slug uniqueness: {e}")

            attempts += 1

        # Fallback if all attempts failed
        if not app_slug:
            test_id = str(uuid.uuid4())[:6]
            app_slug = f"{generate_fun_slug()}-{test_id}"

        log_message(f"🎯 Creating: {user_slug}/{app_slug}")

        # Create actual functional HTML content (this simulates what GPT would generate)
        public_url = f"https://wtaf.me/{user_slug}/{app_slug}"
        og_image_url = f"https://www.advisorsfoundry.ai/api/og-htmlcss?user={user_slug}&app={app_slug}"

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <title>WTAF – Delusional App Generator</title>
    <meta property="og:title" content="WTAF by AF" />
    <meta property="og:description" content="Vibecoded chaos, shipped via SMS." />
    <meta property="og:image" content="{og_image_url}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="675" />
    <meta property="og:url" content="{public_url}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        /* Reset and base styles */
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        html, body {{
            height: 100%;
            overflow: hidden;
        }}

        /* Full-screen background container */
        .page-container {{
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(
                135deg,
                #667eea 0%,
                #764ba2 100%
            );
            background-size: 400% 400%;
            animation: gradientShift 15s ease infinite;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            overflow: auto;
        }}

        @keyframes gradientShift {{
            0% {{ background-position: 0% 50%; }}
            50% {{ background-position: 100% 50%; }}
            100% {{ background-position: 0% 50%; }}
        }}

        .glass-card {{
            background: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 30px;
            padding: 60px 40px;
            text-align: center;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
            max-width: 700px;
            width: 100%;
            position: relative;
            z-index: 10;
        }}

        h1 {{
            font-size: clamp(2rem, 5vw, 3rem);
            font-weight: 700;
            color: rgba(255, 255, 255, 0.95);
            margin-bottom: 30px;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            letter-spacing: -1px;
        }}

        p {{
            font-size: clamp(1.1rem, 2.5vw, 1.3rem);
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.7;
            margin-bottom: 30px;
        }}

        .calculator {{
            background: rgba(255, 255, 255, 0.15);
            padding: 30px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            margin-bottom: 30px;
        }}

        .display {{
            background: rgba(0, 0, 0, 0.3);
            color: white;
            font-size: 2rem;
            padding: 20px;
            border-radius: 10px;
            text-align: right;
            margin-bottom: 20px;
            font-family: 'Courier New', monospace;
            min-height: 60px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
        }}

        .buttons {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
        }}

        .btn {{
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            font-size: 1.2rem;
            font-weight: 600;
            padding: 20px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }}

        .btn:hover {{
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }}

        .btn.operator {{
            background: rgba(255, 165, 0, 0.3);
        }}

        .btn.equals {{
            background: rgba(0, 255, 0, 0.3);
            grid-column: span 2;
        }}

        .btn.clear {{
            background: rgba(255, 0, 0, 0.3);
        }}

        .app-info {{
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 15px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.9rem;
            line-height: 1.6;
            font-family: 'Courier New', Monaco, monospace;
        }}

        /* Mobile responsiveness */
        @media (max-width: 768px) {{
            .glass-card {{
                padding: 40px 30px;
                margin: 10px;
            }}

            .page-container {{
                padding: 10px;
            }}

            .buttons {{
                gap: 10px;
            }}

            .btn {{
                padding: 15px;
                font-size: 1rem;
            }}
        }}
    </style>
</head>
<body>
    <div class="page-container">
        <div class="glass-card">
            <h1>🧮 Beautiful Calculator</h1>
            <p>A stunning glass morphism calculator created via SMS. Fully functional with modern design!</p>

            <div class="calculator">
                <div class="display" id="display">0</div>
                <div class="buttons">
                    <button class="btn clear" onclick="clearDisplay()">C</button>
                    <button class="btn" onclick="deleteLast()">←</button>
                    <button class="btn operator" onclick="appendOperator('/')">/</button>
                    <button class="btn operator" onclick="appendOperator('*')">×</button>

                    <button class="btn" onclick="appendNumber('7')">7</button>
                    <button class="btn" onclick="appendNumber('8')">8</button>
                    <button class="btn" onclick="appendNumber('9')">9</button>
                    <button class="btn operator" onclick="appendOperator('-')">-</button>

                    <button class="btn" onclick="appendNumber('4')">4</button>
                    <button class="btn" onclick="appendNumber('5')">5</button>
                    <button class="btn" onclick="appendNumber('6')">6</button>
                    <button class="btn operator" onclick="appendOperator('+')">+</button>

                    <button class="btn" onclick="appendNumber('1')">1</button>
                    <button class="btn" onclick="appendNumber('2')">2</button>
                    <button class="btn" onclick="appendNumber('3')">3</button>
                    <button class="btn" onclick="appendNumber('0')">0</button>

                    <button class="btn" onclick="appendNumber('.')">.</button>
                    <button class="btn equals" onclick="calculate()">=</button>
                </div>
            </div>

            <div class="app-info">
                App Slug: {app_slug}<br/>
                Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br/>
                Type: Production Calculator
            </div>
        </div>
    </div>

    <script>
        let display = document.getElementById('display');
        let currentInput = '0';
        let operator = null;
        let previousInput = null;
        let shouldResetDisplay = false;

        function updateDisplay() {{
            display.textContent = currentInput;
        }}

        function clearDisplay() {{
            currentInput = '0';
            operator = null;
            previousInput = null;
            shouldResetDisplay = false;
            updateDisplay();
        }}

        function deleteLast() {{
            if (currentInput.length > 1) {{
                currentInput = currentInput.slice(0, -1);
            }} else {{
                currentInput = '0';
            }}
            updateDisplay();
        }}

        function appendNumber(num) {{
            if (shouldResetDisplay) {{
                currentInput = '0';
                shouldResetDisplay = false;
            }}

            if (currentInput === '0' && num !== '.') {{
                currentInput = num;
            }} else {{
                currentInput += num;
            }}
            updateDisplay();
        }}

        function appendOperator(op) {{
            if (operator !== null && !shouldResetDisplay) {{
                calculate();
            }}

            previousInput = currentInput;
            operator = op;
            shouldResetDisplay = true;
        }}

        function calculate() {{
            if (operator === null || previousInput === null) {{
                return;
            }}

            let prev = parseFloat(previousInput);
            let current = parseFloat(currentInput);
            let result;

            switch (operator) {{
                case '+':
                    result = prev + current;
                    break;
                case '-':
                    result = prev - current;
                    break;
                case '*':
                    result = prev * current;
                    break;
                case '/':
                    result = current !== 0 ? prev / current : 'Error';
                    break;
                default:
                    return;
            }}

            currentInput = result.toString();
            operator = null;
            previousInput = null;
            shouldResetDisplay = true;
            updateDisplay();
        }}

        // Initialize
        updateDisplay();
    </script>
</body>
</html>"""

        # Find the bart user
        user_result = supabase.table('sms_subscribers').select('id').eq('slug', user_slug).execute()
        if not user_result.data:
            log_message(f"❌ Could not find user: {user_slug}")
            return None

        user_id = user_result.data[0]['id']
        log_message(f"✅ Found user: {user_id}")

        # Insert the page data (simulating the production save process)
        data = {
            'user_id': user_id,
            'user_slug': user_slug,
            'app_slug': app_slug,
            'coach': 'production',
            'sender_phone': '+1234567890',
            'original_prompt': 'CODE: Create a beautiful interactive calculator app with a glass morphism design. Make it fully functional with basic math operations and a modern gradient background.',
            'html_content': html_content,
            'status': 'published'
        }

        result = supabase.table('wtaf_content').insert(data).execute()

        if result.data:
            log_message(f"✅ Successfully created production-style page!")
            log_message(f"🌐 URL: {public_url}")

            return public_url
        else:
            log_message(f"❌ Failed to create page")
            return None

    except Exception as e:
        log_message(f"❌ Error: {e}")
        import traceback
        log_message(f"📍 Details: {traceback.format_exc()}")
        return None

if __name__ == "__main__":
    log_message(f"🚀 Starting Production-Style Page Generation")

    url = generate_production_test_page()

    if url:
        print(f"\n🎊 SUCCESS!")
        print(f"🔗 Production URL: {url}")
        print(f"📱 Ready for Discord verification!")
        print(f"\n📝 This demonstrates:")
        print(f"✅ Color-animal-action slug generation")
        print(f"✅ Beautiful styling with glass morphism")
        print(f"✅ Fully functional interactive app")
        print(f"✅ Production-style database save")
        print(f"✅ OpenGraph integration")
    else:
        print(f"\n💥 FAILED to generate page")
