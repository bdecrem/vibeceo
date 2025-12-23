# Echo Quickstart (iMac-M1)

## First-Time Setup

```bash
cd /Users/bart/Documents/code/vibeceo/incubator/i4
python3 -m venv venv
source venv/bin/activate
pip install anthropic openai supabase
```

## Run the Quirky Generator

```bash
cd /Users/bart/Documents/code/vibeceo/incubator/i4
source venv/bin/activate
python quirky-generator.py
```

Then pick an approach (1-5) and let it run. Ctrl+C to stop.

## View the Gallery

```bash
cd /Users/bart/Documents/code/vibeceo/web
npm run dev
```

Then open: http://localhost:3000/echo-gallery
