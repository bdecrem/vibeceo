#!/usr/bin/env python3

import os
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont
import requests
from io import BytesIO
import textwrap  # ✅ Added for line wrapping

# Load environment variables from sms-bot/.env.local
env_path = Path(__file__).resolve().parent.parent.parent / '.env.local'
print(f'🔧 Loading .env from: {env_path}')
load_dotenv(dotenv_path=env_path)

# Verify OpenAI API key is loaded
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    print("❌ OPENAI_API_KEY not found in .env.local")
    print(f"   Expected location: {env_path}")
    print("   Please ensure OPENAI_API_KEY is set in sms-bot/.env.local")
    exit(1)

# Initialize OpenAI client with the new syntax
openai_client = OpenAI(api_key=openai_api_key)
print(f"✅ OpenAI client initialized")

def draw_meme_text(image, top_text, bottom_text):
    draw = ImageDraw.Draw(image)
    width, height = image.size

    # Use a bold font — adjust if needed for macOS
    try:
        font_path = "/System/Library/Fonts/Supplemental/Impact.ttf"
        font = ImageFont.truetype(font_path, size=int(height * 0.06))  # ✅ Slightly smaller font
    except:
        font = ImageFont.load_default()

    def draw_text(text, y_position):
        text = text.upper()
        lines = textwrap.wrap(text, width=22)  # ✅ Wrap long lines

        for i, line in enumerate(lines):
            textbbox = draw.textbbox((0, 0), line, font=font)
            text_width = textbbox[2] - textbbox[0]
            x = (width - text_width) / 2
            y = y_position + i * (textbbox[3] - textbbox[1] + 10)

            # Draw outline
            for dx in range(-2, 3):
                for dy in range(-2, 3):
                    draw.text((x + dx, y + dy), line, font=font, fill="black")
            draw.text((x, y), line, font=font, fill="white")

    draw_text(top_text, 10)
    draw_text(bottom_text, height - int(height * 0.25))  # ✅ Raised from 0.15 to fit wrapped text
    return image

def main():
    idea = input("🧠 Describe your meme idea in one sentence: ")

    print("🤖 Generating meme structure from your idea...")

    try:
        # Step 1: Get structured meme content from GPT
        chat_response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You're a meme generator. Respond only in this format:\n\nTop: <top text>\nBottom: <bottom text>\nTheme: <image theme>\n\nMake it funny and memeable."
                },
                {
                    "role": "user",
                    "content": f"My idea: {idea}"
                }
            ]
        )

        content = chat_response.choices[0].message.content
        print(f"\n📩 GPT returned:\n{content}")

        # Step 2: Parse the text
        import re
        match = re.search(r"Top:\s*(.+)\nBottom:\s*(.+)\nTheme:\s*(.+)", content)
        if not match:
            raise ValueError("Could not parse GPT response.")

        top = match.group(1).strip()
        bottom = match.group(2).strip()
        theme = match.group(3).strip()

        print(f"\n🪄 Structured Meme Setup:")
        print(f"Top: {top}")
        print(f"Bottom: {bottom}")
        print(f"Theme: {theme}")

        print("\n🎨 Generating image...")

        # Step 3: Generate DALL·E image
        response = openai_client.images.generate(
            model="dall-e-3",
            prompt=f"A funny photo background for a meme about: {theme}. Do not include any text in the image.",
            size="1024x1024",  # ✅ Square image
            quality="standard",
            n=1
        )

        image_url = response.data[0].url
        print(f"🌐 Image URL: {image_url}")

        # Step 4: Download image and add text
        img_data = requests.get(image_url).content
        img = Image.open(BytesIO(img_data))
        meme_img = draw_meme_text(img, top, bottom)

        # Step 5: Save image
        filename = "meme.png"
        meme_img.save(filename)
        print(f"✅ Meme saved as: {filename}")

    except Exception as e:
        print(f"❌ Error: {e}")

# 🧃 Call the main function
if __name__ == "__main__":
    main()