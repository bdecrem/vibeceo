# Memes Generator

A simple Python script that uses OpenAI's DALL-E 3 to generate meme images.

## Setup

1. **Install Dependencies**
   ```bash
   cd sms-bot
   pip install -r requirements.txt
   ```

2. **Environment Configuration**
   
   The script automatically loads the OpenAI API key from `sms-bot/.env.local`. Make sure this file exists and contains:
   ```
   OPENAI_API_KEY=sk-your-openai-api-key-here
   ```

## Usage

1. **Test Setup** (optional but recommended)
   ```bash
   cd sms-bot/experiments/memes
   python test-memes-setup.py
   ```

2. **Generate Memes**
   ```bash
   cd sms-bot/experiments/memes
   python memes.py
   ```

3. **Follow the prompts**
   - Enter your meme idea (e.g., "debugging all day and fixing it in one line")
   - The script will generate a meme image using DALL-E 3
   - You'll get a URL to view/download the image
   - Optionally save the image locally

## Example Output

```
🔧 Loading .env from: /Users/yourname/path/to/sms-bot/.env.local
✅ OpenAI client initialized
Enter your meme idea (e.g. 'debugging all day and fixing it in one line'): when you finally fix a bug after 6 hours and it was a missing semicolon
🎨 Generating image...

✅ Meme generated! Click or copy the link below:
https://oaidalleapiprodscus.blob.core.windows.net/private/...

Download image to local folder? (y/n): y
📁 Saved to: meme.png
```

## Features

- Uses DALL-E 3 for high-quality meme generation
- Automatic classic meme layout formatting
- Option to save images locally
- Proper error handling and environment validation
- Compatible with the existing sms-bot environment setup

## Notes

- Images are generated at 1024x1024 resolution
- The script uses OpenAI's standard quality setting for cost efficiency
- Generated images have URLs that expire after some time, so download them if you want to keep them 