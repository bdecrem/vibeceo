# Image Generation with OpenAI

## GPT Image 1.5 (Latest - Dec 2025)

The latest flagship model. Better prompt following, quality, and editing support.

**Model:** `gpt-image-1.5`
**Pinned version:** `gpt-image-1.5-2025-12-16`
**Requires:** Organization verification at https://platform.openai.com/settings/organization/general

### Generate Images

**Endpoint:** `POST https://api.openai.com/v1/images/generations`

```bash
curl https://api.openai.com/v1/images/generations \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-image-1.5",
    "prompt": "A stunning sci-fi city skyline at sunset",
    "n": 3,
    "size": "1024x1024"
  }'
```

**Parameters:**

| Parameter | Values | Notes |
|-----------|--------|-------|
| `model` | `gpt-image-1.5` | Required |
| `prompt` | string | Text description |
| `n` | 1-10 | Number of images |
| `size` | `1024x1024`, `1536x1024`, `1024x1536`, `auto` | |
| `output_format` | `png`, `jpeg`, `webp` | Default: png |
| `output_compression` | 0-100 | For jpeg/webp |
| `quality` | `high`, `medium`, `low`, `auto` | |
| `background` | `transparent`, `opaque`, `auto` | |

**Response:** Base64-encoded images by default.

### Edit Images

**Endpoint:** `POST https://api.openai.com/v1/images/edits`

```bash
curl https://api.openai.com/v1/images/edits \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F "model=gpt-image-1.5" \
  -F "image=@myphoto.png" \
  -F "mask=@mask.png" \
  -F "prompt=Change the shirt color to red"
```

The optional `mask` file focuses edits on specific parts of the image.

### Python Example

```python
from openai import OpenAI
import base64

client = OpenAI()  # uses OPENAI_API_KEY env var

result = client.images.generate(
    model="gpt-image-1.5",
    prompt="Your prompt here",
    n=1,
    size="1024x1024",
    quality="high"
)

# Save (returns base64)
image_bytes = base64.b64decode(result.data[0].b64_json)
with open("output.png", "wb") as f:
    f.write(image_bytes)
```

---

## DALL-E 3 (Works Without Verification)

No org verification needed. Still very capable.

**Model:** `dall-e-3`

```python
from openai import OpenAI
import urllib.request

# Read key from env file
with open("/Users/bart/Documents/code/vibeceo/sms-bot/.env.local") as f:
    for line in f:
        if line.startswith("OPENAI_API_KEY="):
            api_key = line.strip().split("=", 1)[1]
            break

client = OpenAI(api_key=api_key)

result = client.images.generate(
    model="dall-e-3",
    prompt="Your prompt here",
    n=1,
    size="1024x1024",
    quality="hd"  # or "standard"
)

# Save (returns URL, not base64)
urllib.request.urlretrieve(result.data[0].url, "output.png")
```

**Sizes:** `1024x1024`, `1792x1024`, `1024x1792`

---

## Quick One-Liner (DALL-E 3)

```bash
cd /Users/bart/Documents/code/vibeceo/incubator/i4 && python3 << 'EOF'
from openai import OpenAI
import urllib.request

with open("/Users/bart/Documents/code/vibeceo/sms-bot/.env.local") as f:
    for line in f:
        if line.startswith("OPENAI_API_KEY="):
            api_key = line.strip().split("=", 1)[1]
            break

client = OpenAI(api_key=api_key)
result = client.images.generate(model="dall-e-3", prompt="A surreal album cover", size="1024x1024", quality="hd")
urllib.request.urlretrieve(result.data[0].url, "images/test.png")
print("Saved to images/test.png")
EOF
```

---

## Tips

- Base64 output is default for GPT Image models — decode client-side
- No streaming on image endpoints — send request, wait for completion
- Pin model version for consistent results: `gpt-image-1.5-2025-12-16`
- For text in images, spell it out clearly in the prompt
- Include style references ("surreal", "photorealistic", "watercolor")
