#!/usr/bin/env python3
"""
Amber SDK Tools for Claude Agent SDK

In-process MCP server providing Amber's capabilities:
- Web search
- Image generation (fal.ai)
- File operations (via GitHub API when on Railway, local filesystem otherwise)
- Supabase queries (amber_state)
- Git operations (via GitHub API when on Railway)
- Bash commands (restricted)
"""

import base64
import json
import os
import subprocess
import sys
import urllib.request
import urllib.parse
from typing import Any, Dict, Optional

from claude_agent_sdk import create_sdk_mcp_server, tool

# Detect if running on Railway (cloud) vs local
IS_RAILWAY = bool(os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_SERVICE_NAME"))

# Security: Restrict file operations to codebase (for local mode)
ALLOWED_CODEBASE = os.getenv("AMBER_CODEBASE_PATH", "/Users/bart/Documents/code/vibeceo")

# GitHub config (for Railway mode)
GITHUB_API_TOKEN = os.getenv("GITHUB_API_TOKEN", "")
GITHUB_REPO = os.getenv("GITHUB_REPO", "bdecrem/vibeceo")
GITHUB_BRANCH = os.getenv("GITHUB_BRANCH", "main")

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Track files written via GitHub API (for commit batching)
_github_pending_files: Dict[str, str] = {}  # path -> content


def is_safe_path(path: str) -> bool:
    """Ensure path is within allowed codebase."""
    if not path:
        return True
    if path.startswith("/"):
        abs_path = os.path.abspath(path)
    else:
        abs_path = os.path.abspath(os.path.join(ALLOWED_CODEBASE, path))
    return abs_path.startswith(ALLOWED_CODEBASE)


def make_result(text: str, is_error: bool = False) -> Dict[str, Any]:
    """Create MCP tool result in correct format."""
    result = {"content": [{"type": "text", "text": text}]}
    if is_error:
        result["isError"] = True
    return result


# =============================================================================
# GITHUB API HELPERS (for Railway mode)
# =============================================================================

def github_api_request(
    method: str,
    endpoint: str,
    data: Optional[dict] = None
) -> Dict[str, Any]:
    """Make a request to GitHub API."""
    if not GITHUB_API_TOKEN:
        return {"error": "GITHUB_API_TOKEN not configured"}

    url = f"https://api.github.com/repos/{GITHUB_REPO}/{endpoint}"
    headers = {
        "Authorization": f"Bearer {GITHUB_API_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    try:
        if data:
            payload = json.dumps(data).encode()
            req = urllib.request.Request(url, data=payload, method=method, headers=headers)
        else:
            req = urllib.request.Request(url, method=method, headers=headers)

        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else str(e)
        return {"error": f"GitHub API error {e.code}: {error_body}"}
    except Exception as e:
        return {"error": str(e)}


def github_get_file_sha(path: str) -> Optional[str]:
    """Get the SHA of an existing file (needed for updates)."""
    result = github_api_request("GET", f"contents/{path}?ref={GITHUB_BRANCH}")
    if "sha" in result:
        return result["sha"]
    return None


def github_create_or_update_file(path: str, content: str, message: str) -> Dict[str, Any]:
    """Create or update a file via GitHub API."""
    # Encode content as base64
    content_b64 = base64.b64encode(content.encode()).decode()

    data = {
        "message": message,
        "content": content_b64,
        "branch": GITHUB_BRANCH,
    }

    # Check if file exists (need SHA for update)
    existing_sha = github_get_file_sha(path)
    if existing_sha:
        data["sha"] = existing_sha

    return github_api_request("PUT", f"contents/{path}", data)


def github_commit_multiple_files(files: Dict[str, str], message: str) -> Dict[str, Any]:
    """
    Commit multiple files in a single commit using Git Data API.
    files: dict of {path: content}
    """
    if not files:
        return {"error": "No files to commit"}

    try:
        # 1. Get the current commit SHA for the branch
        ref_result = github_api_request("GET", f"git/ref/heads/{GITHUB_BRANCH}")
        if "error" in ref_result:
            return ref_result
        current_commit_sha = ref_result["object"]["sha"]

        # 2. Get the tree SHA from the current commit
        commit_result = github_api_request("GET", f"git/commits/{current_commit_sha}")
        if "error" in commit_result:
            return commit_result
        base_tree_sha = commit_result["tree"]["sha"]

        # 3. Create blobs for each file
        tree_items = []
        for path, content in files.items():
            # Handle binary files (images) that were stored with BASE64: prefix
            if content.startswith("BASE64:"):
                blob_content = content[7:]  # Strip "BASE64:" prefix
                blob_encoding = "base64"
            else:
                blob_content = content
                blob_encoding = "utf-8"

            blob_result = github_api_request("POST", "git/blobs", {
                "content": blob_content,
                "encoding": blob_encoding
            })
            if "error" in blob_result:
                return blob_result

            tree_items.append({
                "path": path,
                "mode": "100644",
                "type": "blob",
                "sha": blob_result["sha"]
            })

        # 4. Create a new tree
        tree_result = github_api_request("POST", "git/trees", {
            "base_tree": base_tree_sha,
            "tree": tree_items
        })
        if "error" in tree_result:
            return tree_result

        # 5. Create a new commit
        new_commit_result = github_api_request("POST", "git/commits", {
            "message": message,
            "tree": tree_result["sha"],
            "parents": [current_commit_sha]
        })
        if "error" in new_commit_result:
            return new_commit_result

        # 6. Update the branch reference
        update_ref_result = github_api_request("PATCH", f"git/refs/heads/{GITHUB_BRANCH}", {
            "sha": new_commit_result["sha"]
        })
        if "error" in update_ref_result:
            return update_ref_result

        return {
            "success": True,
            "commit_sha": new_commit_result["sha"],
            "files_committed": list(files.keys())
        }

    except Exception as e:
        return {"error": f"GitHub commit failed: {str(e)}"}


# =============================================================================
# WEB SEARCH
# =============================================================================

@tool(
    "web_search",
    "Search the web using Brave Search API. Returns relevant results for a query.",
    {"query": str, "count": int}
)
async def web_search_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    query = args.get("query", "")
    count = min(args.get("count", 5), 10)

    if not query:
        return make_result(json.dumps({"error": "Query required"}), is_error=True)

    brave_key = os.getenv("BRAVE_API_KEY")
    if not brave_key:
        return make_result(json.dumps({"error": "BRAVE_API_KEY not configured"}), is_error=True)

    try:
        url = f"https://api.search.brave.com/res/v1/web/search?q={urllib.parse.quote(query)}&count={count}"
        req = urllib.request.Request(url, headers={
            "Accept": "application/json",
            "X-Subscription-Token": brave_key
        })

        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())

        results = []
        for item in data.get("web", {}).get("results", [])[:count]:
            results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "description": item.get("description", "")
            })

        return make_result(json.dumps(results, indent=2))
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# IMAGE GENERATION (OpenAI - Amber's preferred style)
# =============================================================================

@tool(
    "generate_amber_image",
    "Generate standalone art (NOT for OG images). For OG images of HTML creations, use screenshot_page_as_og instead. This is for conceptual art, drawer pieces, non-web content.",
    {"prompt": str, "save_path": str}
)
async def generate_amber_image_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate an image using OpenAI's gpt-image-1.5 model.
    This is Amber's preferred image generation - matches her drawer art style.

    The prompt should evoke:
    - Amber/gold tones with teal and violet accents
    - Berlin × ASCII × Future aesthetic
    - Conceptual, transformative themes
    - Dark backgrounds, subtle grids
    """
    prompt = args.get("prompt", "")
    save_path = args.get("save_path", "")  # Optional: relative path in codebase to save

    if not prompt:
        return make_result(json.dumps({"error": "Prompt required"}), is_error=True)

    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        return make_result(json.dumps({"error": "OPENAI_API_KEY not configured"}), is_error=True)

    # Enhance prompt with Amber's visual language if not already present
    amber_style_hint = """Style: Dark background (#0D0D0D), amber/gold tones (#D4A574, #FFD700),
    with subtle teal (#2D9596) accents. Conceptual, minimal, slightly industrial.
    Berlin techno aesthetic meets generative art."""

    if "amber" not in prompt.lower() and "#D4A574" not in prompt:
        enhanced_prompt = f"{prompt}\n\n{amber_style_hint}"
    else:
        enhanced_prompt = prompt

    try:
        url = "https://api.openai.com/v1/images/generations"
        payload = json.dumps({
            "model": "gpt-image-1",
            "prompt": enhanced_prompt,
            "n": 1,
            "size": "1024x1024",
            "quality": "high",
            "response_format": "b64_json"
        }).encode()

        req = urllib.request.Request(url, data=payload, headers={
            "Authorization": f"Bearer {openai_key}",
            "Content-Type": "application/json"
        })

        with urllib.request.urlopen(req, timeout=120) as response:
            data = json.loads(response.read().decode())

        if not data.get("data") or not data["data"][0].get("b64_json"):
            return make_result(json.dumps({"error": "No image generated"}), is_error=True)

        b64_image = data["data"][0]["b64_json"]

        # If save_path provided, save the image
        if save_path:
            if IS_RAILWAY:
                # On Railway, stage for GitHub commit
                import base64 as b64_module
                image_bytes = b64_module.b64decode(b64_image)
                # Store as binary - will need special handling
                _github_pending_files[save_path] = f"BASE64:{b64_image}"
                return make_result(json.dumps({
                    "success": True,
                    "saved_to": save_path,
                    "message": f"Image generated and staged for commit at {save_path}",
                    "size_bytes": len(image_bytes)
                }))
            else:
                # Local: save directly
                import base64 as b64_module
                full_path = os.path.join(ALLOWED_CODEBASE, save_path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, "wb") as f:
                    f.write(b64_module.b64decode(b64_image))
                return make_result(json.dumps({
                    "success": True,
                    "saved_to": save_path,
                    "full_path": full_path,
                    "message": f"Image saved to {save_path}"
                }))

        # No save path - just return the base64 (truncated for display)
        return make_result(json.dumps({
            "success": True,
            "b64_preview": b64_image[:100] + "...",
            "message": "Image generated. Use save_path parameter to save it."
        }))

    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# IMAGE GENERATION (fal.ai - fast alternative)
# =============================================================================

@tool(
    "generate_image",
    "Generate an image using fal.ai's FLUX model (fast). Returns the image URL.",
    {"prompt": str, "aspect_ratio": str}
)
async def generate_image_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    prompt = args.get("prompt", "")
    aspect_ratio = args.get("aspect_ratio", "square")  # square, landscape, portrait

    if not prompt:
        return make_result(json.dumps({"error": "Prompt required"}), is_error=True)

    fal_key = os.getenv("FAL_KEY")
    if not fal_key:
        return make_result(json.dumps({"error": "FAL_KEY not configured"}), is_error=True)

    # Map aspect ratio to dimensions
    size_map = {
        "square": {"width": 1024, "height": 1024},
        "landscape": {"width": 1024, "height": 768},
        "portrait": {"width": 768, "height": 1024},
    }
    size = size_map.get(aspect_ratio, size_map["square"])

    try:
        import urllib.request

        url = "https://queue.fal.run/fal-ai/flux/schnell"
        payload = json.dumps({
            "prompt": prompt,
            "image_size": size,
            "num_images": 1,
        }).encode()

        req = urllib.request.Request(url, data=payload, headers={
            "Authorization": f"Key {fal_key}",
            "Content-Type": "application/json"
        })

        with urllib.request.urlopen(req, timeout=60) as response:
            data = json.loads(response.read().decode())

        # fal.ai returns request_id for queue - poll for result
        request_id = data.get("request_id")
        if request_id:
            # Poll for completion
            status_url = f"https://queue.fal.run/fal-ai/flux/schnell/requests/{request_id}/status"
            for _ in range(30):  # Max 30 seconds
                status_req = urllib.request.Request(status_url, headers={
                    "Authorization": f"Key {fal_key}"
                })
                with urllib.request.urlopen(status_req, timeout=10) as status_response:
                    status_data = json.loads(status_response.read().decode())

                if status_data.get("status") == "COMPLETED":
                    # Get result
                    result_url = f"https://queue.fal.run/fal-ai/flux/schnell/requests/{request_id}"
                    result_req = urllib.request.Request(result_url, headers={
                        "Authorization": f"Key {fal_key}"
                    })
                    with urllib.request.urlopen(result_req, timeout=10) as result_response:
                        result_data = json.loads(result_response.read().decode())

                    images = result_data.get("images", [])
                    if images:
                        return make_result(json.dumps({
                            "url": images[0].get("url"),
                            "prompt": prompt
                        }))
                    break

                import time
                time.sleep(1)

            return make_result(json.dumps({"error": "Image generation timeout"}), is_error=True)

        # Direct response (not queued)
        images = data.get("images", [])
        if images:
            return make_result(json.dumps({
                "url": images[0].get("url"),
                "prompt": prompt
            }))

        return make_result(json.dumps({"error": "No image generated"}), is_error=True)
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# OPENGRAPH IMAGE GENERATION
# =============================================================================

@tool(
    "generate_og_image",
    "Generate an OG image for social sharing using pre-designed backgrounds. Pass the creation type (music, toy, invention, pulse, ascii, hdart, reflection) to get a matching background.",
    {"title": str, "save_path": str, "type": str}
)
async def generate_og_image_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a branded OG image using pre-designed backgrounds.

    Loads a random background from the manifest for the given type,
    then composites the title text on top using the palette's fg color.

    Args:
        title: The creation title to display
        save_path: Where to save the OG image (e.g., "web/public/amber/thing-og.png")
        type: Creation type - one of: music, toy, invention, pulse, ascii, hdart, reflection, generic
    """
    title = args.get("title", "")
    save_path = args.get("save_path", "")
    creation_type = args.get("type", "generic")

    if not title:
        return make_result(json.dumps({"error": "Title required"}), is_error=True)

    if not save_path:
        return make_result(json.dumps({"error": "save_path required"}), is_error=True)

    # Valid types from amber-social SlotType (+ reflection for pulse slot, + generic fallback)
    VALID_TYPES = ["music", "toy", "invention", "pulse", "ascii", "hdart", "reflection", "generic"]
    if creation_type not in VALID_TYPES:
        print(f"[generate_og_image] Unknown type '{creation_type}', falling back to generic", file=sys.stderr)
        creation_type = "generic"

    # Map slot types to background types (pulse uses reflection backgrounds)
    TYPE_TO_BG_TYPE = {
        "pulse": "reflection",  # pulse slot uses reflection backgrounds
    }
    bg_type = TYPE_TO_BG_TYPE.get(creation_type, creation_type)

    try:
        from PIL import Image, ImageDraw, ImageFont
        import io
        import random

        # ==========================================================================
        # Load manifest - from public URL on Railway, local filesystem otherwise
        # ==========================================================================
        PUBLIC_BASE_URL = "https://intheamber.com/amber/og-backgrounds"
        manifest = None
        bg_image_data = None

        if IS_RAILWAY:
            # On Railway: fetch manifest from public URL
            try:
                manifest_url = f"{PUBLIC_BASE_URL}/manifest.json"
                req = urllib.request.Request(manifest_url, headers={"User-Agent": "Amber-OG-Generator/1.0"})
                with urllib.request.urlopen(req, timeout=10) as response:
                    manifest = json.loads(response.read().decode())
                print(f"[generate_og_image] Loaded manifest from {manifest_url}", file=sys.stderr)
            except Exception as e:
                return make_result(json.dumps({
                    "error": f"Failed to load manifest from {PUBLIC_BASE_URL}: {e}"
                }), is_error=True)
        else:
            # Local: read from filesystem
            manifest_path = os.path.join(ALLOWED_CODEBASE, "web/public/amber/og-backgrounds/manifest.json")
            try:
                with open(manifest_path, 'r') as f:
                    manifest = json.load(f)
            except Exception as e:
                return make_result(json.dumps({
                    "error": f"Failed to load manifest: {e}"
                }), is_error=True)

        # Filter backgrounds by type
        backgrounds = [b for b in manifest.get("backgrounds", []) if b.get("type") == bg_type]

        if not backgrounds:
            # Fallback to generic if no backgrounds for this type
            backgrounds = [b for b in manifest.get("backgrounds", []) if b.get("type") == "generic"]
            if not backgrounds:
                return make_result(json.dumps({
                    "error": f"No backgrounds found for type '{bg_type}' or generic"
                }), is_error=True)

        # Pick random background
        bg_entry = random.choice(backgrounds)
        bg_file = bg_entry.get("file", "")
        fg_color = bg_entry.get("fg", "#FFD700")  # Default to gold if not specified

        # Load background image
        if IS_RAILWAY:
            # On Railway: fetch from public URL
            try:
                bg_url = f"{PUBLIC_BASE_URL}/{bg_file}"
                req = urllib.request.Request(bg_url, headers={"User-Agent": "Amber-OG-Generator/1.0"})
                with urllib.request.urlopen(req, timeout=30) as response:
                    bg_image_data = response.read()
                img = Image.open(io.BytesIO(bg_image_data)).convert("RGBA")
                print(f"[generate_og_image] Loaded background from {bg_url}", file=sys.stderr)
            except Exception as e:
                return make_result(json.dumps({
                    "error": f"Failed to load background {bg_file} from URL: {e}"
                }), is_error=True)
        else:
            # Local: read from filesystem
            bg_dir = os.path.join(ALLOWED_CODEBASE, "web/public/amber/og-backgrounds")
            bg_path = os.path.join(bg_dir, bg_file)
            try:
                img = Image.open(bg_path).convert("RGBA")
            except Exception as e:
                return make_result(json.dumps({
                    "error": f"Failed to load background {bg_file}: {e}"
                }), is_error=True)

        # Ensure correct dimensions (should be 1200x630)
        width, height = img.size
        if width != 1200 or height != 630:
            img = img.resize((1200, 630), Image.Resampling.LANCZOS)
            width, height = 1200, 630

        draw = ImageDraw.Draw(img)

        # ==========================================================================
        # Load fonts
        # ==========================================================================
        title_font = None
        small_font = None
        font_name = None

        try:
            font_size = 64
            for fn in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                       '/System/Library/Fonts/Helvetica.ttc',
                       '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf']:
                try:
                    title_font = ImageFont.truetype(fn, font_size)
                    font_name = fn
                    break
                except:
                    continue
            if title_font is None:
                title_font = ImageFont.load_default()
        except:
            title_font = ImageFont.load_default()

        try:
            if font_name:
                small_font = ImageFont.truetype(font_name, 28)
            else:
                small_font = ImageFont.load_default()
        except:
            small_font = ImageFont.load_default()

        # ==========================================================================
        # Word wrap title
        # ==========================================================================
        words = title.upper().split()  # Uppercase for impact
        lines = []
        current_line = []
        for word in words:
            test_line = ' '.join(current_line + [word])
            bbox = draw.textbbox((0, 0), test_line, font=title_font)
            if bbox[2] - bbox[0] > width - 160:  # 80px padding each side
                if current_line:
                    lines.append(' '.join(current_line))
                    current_line = [word]
                else:
                    lines.append(word)
            else:
                current_line.append(word)
        if current_line:
            lines.append(' '.join(current_line))

        # ==========================================================================
        # Calculate text positioning (centered)
        # ==========================================================================
        line_height = 80
        by_amber_height = 50
        total_text_height = len(lines) * line_height + by_amber_height
        start_y = (height - total_text_height) // 2

        # ==========================================================================
        # Draw title with shadow for readability
        # ==========================================================================
        for i, line in enumerate(lines):
            bbox = draw.textbbox((0, 0), line, font=title_font)
            text_width = bbox[2] - bbox[0]
            x = (width - text_width) // 2
            y = start_y + i * line_height

            # Shadow for readability
            draw.text((x + 2, y + 2), line, font=title_font, fill=(0, 0, 0, 180))
            draw.text((x, y), line, font=title_font, fill=fg_color)

        # ==========================================================================
        # Draw "by Amber" attribution
        # ==========================================================================
        by_amber = "by Amber"
        bbox = draw.textbbox((0, 0), by_amber, font=small_font)
        text_width = bbox[2] - bbox[0]
        x = (width - text_width) // 2
        y = start_y + len(lines) * line_height + 15

        draw.text((x, y), by_amber, font=small_font, fill=fg_color)

        # ==========================================================================
        # Save the composited image
        # ==========================================================================
        # Convert to RGB for PNG saving (drop alpha)
        img_rgb = Image.new("RGB", img.size, (13, 13, 13))  # Dark background
        img_rgb.paste(img, mask=img.split()[3] if img.mode == 'RGBA' else None)

        img_bytes = io.BytesIO()
        img_rgb.save(img_bytes, format='PNG', optimize=True)
        img_bytes.seek(0)
        img_data = img_bytes.getvalue()

        if IS_RAILWAY:
            # On Railway, stage for GitHub commit
            b64_image = base64.b64encode(img_data).decode('utf-8')
            _github_pending_files[save_path] = f"BASE64:{b64_image}"
            return make_result(json.dumps({
                "success": True,
                "saved_to": save_path,
                "background": bg_file,
                "type": creation_type,
                "bg_type": bg_type,
                "fg_color": fg_color,
                "palette": bg_entry.get("palette", "unknown"),
                "message": f"OG image generated using {bg_file} (type={creation_type}, bg_type={bg_type}) and staged for commit"
            }))
        else:
            # Local: save directly
            full_path = os.path.join(ALLOWED_CODEBASE, save_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, 'wb') as f:
                f.write(img_data)
            return make_result(json.dumps({
                "success": True,
                "saved_to": full_path,
                "background": bg_file,
                "type": creation_type,
                "bg_type": bg_type,
                "fg_color": fg_color,
                "palette": bg_entry.get("palette", "unknown"),
                "message": f"OG image generated using {bg_file} (type={creation_type}, bg_type={bg_type})"
            }))

    except ImportError:
        return make_result(json.dumps({
            "error": "PIL/Pillow not installed. Run: pip install Pillow"
        }), is_error=True)
    except Exception as e:
        import traceback
        return make_result(json.dumps({
            "error": str(e),
            "traceback": traceback.format_exc()
        }), is_error=True)


# =============================================================================
# PAGE SCREENSHOT AS OG IMAGE (for amber-social)
# =============================================================================

@tool(
    "screenshot_page_as_og",
    "REQUIRED for amber-social: Capture your HTML creation as its OG image. Call this IMMEDIATELY after write_file for any HTML in web/public/amber/. Screenshots the actual page at 1200x630 - your creation IS the preview.",
    {"html_path": str, "save_path": str}
)
async def screenshot_page_as_og_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Screenshot an HTML file as an OG image using HTMLCSStoImage API.

    This captures the actual page at 1200x630 - what you built IS the preview.
    Much better than generic text cards.

    Args:
        html_path: Path to the HTML file (e.g., "web/public/amber/thing.html")
        save_path: Where to save the OG image (e.g., "web/public/amber/thing-og.png")
    """
    html_path = args.get("html_path", "")
    save_path = args.get("save_path", "")

    if not html_path:
        return make_result(json.dumps({"error": "html_path required"}), is_error=True)
    if not save_path:
        return make_result(json.dumps({"error": "save_path required"}), is_error=True)

    # Get HTMLCSStoImage credentials
    htmlcss_user_id = os.getenv("HTMLCSS_USER_ID")
    htmlcss_api_key = os.getenv("HTMLCSS_API_KEY")

    if not htmlcss_user_id or not htmlcss_api_key:
        return make_result(json.dumps({
            "error": "HTMLCSS_USER_ID and HTMLCSS_API_KEY not configured"
        }), is_error=True)

    # Read the HTML content
    html_content = None

    # First check pending files (just written, not yet committed)
    if html_path in _github_pending_files:
        html_content = _github_pending_files[html_path]
        print(f"[screenshot_page_as_og] Reading from pending files: {html_path}", file=sys.stderr)
    elif IS_RAILWAY:
        # On Railway, fetch from GitHub
        result = github_api_request("GET", f"contents/{html_path}?ref={GITHUB_BRANCH}")
        if "error" not in result and result.get("content"):
            try:
                html_content = base64.b64decode(result["content"]).decode("utf-8")
            except Exception as e:
                return make_result(json.dumps({"error": f"Failed to decode HTML: {e}"}), is_error=True)
    else:
        # Local mode: read from filesystem
        full_path = os.path.join(ALLOWED_CODEBASE, html_path)
        if os.path.exists(full_path):
            with open(full_path, "r", encoding="utf-8") as f:
                html_content = f.read()

    if not html_content:
        return make_result(json.dumps({
            "error": f"Could not read HTML file: {html_path}"
        }), is_error=True)

    # Call HTMLCSStoImage API
    try:
        auth = base64.b64encode(f"{htmlcss_user_id}:{htmlcss_api_key}".encode()).decode()

        payload = json.dumps({
            "html": html_content,
            "viewport_width": 1200,
            "viewport_height": 630,
            "device_scale_factor": 1
        }).encode()

        req = urllib.request.Request(
            "https://hcti.io/v1/image",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Basic {auth}"
            }
        )

        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode())

        if not result.get("url"):
            return make_result(json.dumps({"error": "No image URL in response"}), is_error=True)

        image_url = result["url"]
        print(f"[screenshot_page_as_og] Generated: {image_url}", file=sys.stderr)

        # Download the image
        img_req = urllib.request.Request(image_url)
        with urllib.request.urlopen(img_req, timeout=30) as img_response:
            img_data = img_response.read()

        # Save the image
        if IS_RAILWAY:
            # Stage for GitHub commit
            b64_image = base64.b64encode(img_data).decode()
            _github_pending_files[save_path] = f"BASE64:{b64_image}"
            return make_result(json.dumps({
                "success": True,
                "saved_to": save_path,
                "source": html_path,
                "message": f"Screenshot captured and staged for commit at {save_path}"
            }))
        else:
            # Local: save directly
            full_save_path = os.path.join(ALLOWED_CODEBASE, save_path)
            os.makedirs(os.path.dirname(full_save_path), exist_ok=True)
            with open(full_save_path, "wb") as f:
                f.write(img_data)
            return make_result(json.dumps({
                "success": True,
                "saved_to": full_save_path,
                "source": html_path,
                "message": f"Screenshot captured and saved to {full_save_path}"
            }))

    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else str(e)
        return make_result(json.dumps({
            "error": f"HTMLCSStoImage API error {e.code}: {error_body}"
        }), is_error=True)
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# FILE OPERATIONS
# =============================================================================

@tool(
    "read_file",
    "Read the contents of a file. Path relative to codebase root.",
    {"path": str}
)
async def read_file_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path", "")

    # On Railway, fetch from GitHub API
    if IS_RAILWAY:
        if not path:
            return make_result(json.dumps({"error": "Path required"}), is_error=True)

        if not GITHUB_API_TOKEN:
            return make_result(json.dumps({"error": "GITHUB_API_TOKEN not configured"}), is_error=True)

        # Check if file is in pending (not yet committed)
        if path in _github_pending_files:
            content = _github_pending_files[path]
            if len(content) > 50000:
                content = content[:50000] + "\n\n... [truncated at 50000 chars]"
            return make_result(f"[From pending changes]\n{content}")

        # Fetch from GitHub
        result = github_api_request("GET", f"contents/{path}?ref={GITHUB_BRANCH}")
        if "error" in result:
            return make_result(json.dumps({"error": result["error"]}), is_error=True)

        if result.get("type") == "dir":
            return make_result(json.dumps({"error": f"{path} is a directory, not a file"}), is_error=True)

        # Decode base64 content
        try:
            content = base64.b64decode(result.get("content", "")).decode("utf-8", errors="replace")
            if len(content) > 50000:
                content = content[:50000] + "\n\n... [truncated at 50000 chars]"
            return make_result(content)
        except Exception as e:
            return make_result(json.dumps({"error": f"Failed to decode: {e}"}), is_error=True)

    # Local mode: read from filesystem
    if not is_safe_path(path):
        return make_result(json.dumps({"error": "Path not allowed"}), is_error=True)

    full_path = os.path.join(ALLOWED_CODEBASE, path) if path else ALLOWED_CODEBASE

    try:
        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        if len(content) > 50000:
            content = content[:50000] + "\n\n... [truncated at 50000 chars]"

        return make_result(content)
    except FileNotFoundError:
        return make_result(json.dumps({"error": f"File not found: {path}"}), is_error=True)
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "write_file",
    "Write content to a file. Creates file if it doesn't exist. On Railway, stages file for commit.",
    {"path": str, "content": str}
)
async def write_file_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path", "")
    content = args.get("content", "")

    if not path:
        return make_result(json.dumps({"error": "Path required"}), is_error=True)

    # On Railway, stage file for GitHub commit
    if IS_RAILWAY:
        if not GITHUB_API_TOKEN:
            return make_result(json.dumps({"error": "GITHUB_API_TOKEN not configured for Railway mode"}), is_error=True)

        # Store in pending files (will be committed with git_commit)
        _github_pending_files[path] = content
        return make_result(f"Staged {len(content)} bytes to {path} (will commit with git_commit)")

    # Local mode: write directly to filesystem
    if not is_safe_path(path):
        return make_result(json.dumps({"error": "Path not allowed"}), is_error=True)

    full_path = os.path.join(ALLOWED_CODEBASE, path)

    try:
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
        return make_result(f"Wrote {len(content)} bytes to {path}")
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "list_directory",
    "List files in a directory.",
    {"path": str, "recursive": bool}
)
async def list_directory_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path", ".")
    recursive = args.get("recursive", False)

    # On Railway, use GitHub API
    if IS_RAILWAY:
        if not GITHUB_API_TOKEN:
            return make_result(json.dumps({"error": "GITHUB_API_TOKEN not configured"}), is_error=True)

        # Normalize path
        api_path = "" if path in [".", "", "/"] else path.strip("/")
        endpoint = f"contents/{api_path}?ref={GITHUB_BRANCH}" if api_path else f"contents?ref={GITHUB_BRANCH}"

        result = github_api_request("GET", endpoint)
        if "error" in result:
            return make_result(json.dumps({"error": result["error"]}), is_error=True)

        # GitHub returns array for directories
        if isinstance(result, list):
            items = [item["name"] for item in result]
            return make_result(json.dumps(sorted(items)))
        else:
            return make_result(json.dumps({"error": f"{path} is not a directory"}), is_error=True)

    # Local mode: use filesystem
    if not is_safe_path(path):
        return make_result(json.dumps({"error": "Path not allowed"}), is_error=True)

    full_path = os.path.join(ALLOWED_CODEBASE, path) if path and path != "." else ALLOWED_CODEBASE

    try:
        if recursive:
            items = []
            skip_dirs = {'.git', 'node_modules', '.next', 'dist', '__pycache__', '.venv', 'venv'}
            for root, dirs, files in os.walk(full_path):
                dirs[:] = [d for d in dirs if d not in skip_dirs]
                rel_root = os.path.relpath(root, ALLOWED_CODEBASE)
                for f in files:
                    items.append(os.path.join(rel_root, f))
                if len(items) >= 500:
                    break
            return make_result(json.dumps(items[:500]))
        else:
            items = os.listdir(full_path)
            return make_result(json.dumps(sorted(items)))
    except FileNotFoundError:
        return make_result(json.dumps({"error": f"Directory not found: {path}"}), is_error=True)
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "search_code",
    "Search for a pattern in codebase using ripgrep.",
    {"pattern": str, "file_pattern": str, "max_results": int}
)
async def search_code_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    pattern = args.get("pattern", "")
    file_pattern = args.get("file_pattern", "")
    max_results = args.get("max_results", 50)

    if not pattern:
        return make_result(json.dumps({"error": "Pattern required"}), is_error=True)

    cmd = ["rg", "--json", "-m", str(max_results), pattern, ALLOWED_CODEBASE]
    if file_pattern:
        cmd.extend(["--glob", file_pattern])
    cmd.extend(["--glob", "!node_modules", "--glob", "!.git", "--glob", "!dist"])

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        matches = []
        for line in result.stdout.strip().split("\n"):
            if not line:
                continue
            try:
                data = json.loads(line)
                if data.get("type") == "match":
                    match_data = data.get("data", {})
                    file_path = match_data.get("path", {}).get("text", "")
                    rel_path = file_path.replace(ALLOWED_CODEBASE + "/", "")
                    matches.append({
                        "file": rel_path,
                        "line": match_data.get("line_number"),
                        "content": match_data.get("lines", {}).get("text", "").strip()
                    })
            except json.JSONDecodeError:
                continue
        return make_result(json.dumps(matches[:max_results], indent=2))
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# SUPABASE (Amber's Memory)
# =============================================================================

@tool(
    "read_amber_state",
    "Read Amber's state from Supabase. Types: persona, memory, log_entry, blog_post, voice_session, creation. Returns content and metadata (including 'tweeted' flag for creations).",
    {"type": str, "limit": int}
)
async def read_amber_state_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    state_type = args.get("type", "memory")
    limit = min(args.get("limit", 5), 20)

    if not SUPABASE_URL or not SUPABASE_KEY:
        return make_result(json.dumps({"error": "Supabase not configured"}), is_error=True)

    try:
        url = f"{SUPABASE_URL}/rest/v1/amber_state?type=eq.{state_type}&order=created_at.desc&limit={limit}"
        req = urllib.request.Request(url, headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        })

        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())

        results = []
        for row in data:
            results.append({
                "content": row.get("content", "")[:2000],
                "created_at": row.get("created_at"),
                "metadata": row.get("metadata"),
            })

        return make_result(json.dumps(results, indent=2))
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "write_amber_state",
    "Write to Amber's state in Supabase.",
    {"type": str, "content": str, "metadata": dict}
)
async def write_amber_state_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    state_type = args.get("type", "log_entry")
    content = args.get("content", "")
    metadata = args.get("metadata", {})

    if not content:
        return make_result(json.dumps({"error": "Content required"}), is_error=True)

    if not SUPABASE_URL or not SUPABASE_KEY:
        return make_result(json.dumps({"error": "Supabase not configured"}), is_error=True)

    try:
        url = f"{SUPABASE_URL}/rest/v1/amber_state"
        payload = json.dumps({
            "type": state_type,
            "content": content,
            "source": "amber_email_agent",
            "metadata": metadata,
        }).encode()

        req = urllib.request.Request(url, data=payload, method="POST", headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        })

        with urllib.request.urlopen(req, timeout=10) as response:
            pass  # 201 Created

        return make_result(f"Stored {state_type} entry ({len(content)} chars)")
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# GIT OPERATIONS
# =============================================================================

@tool("git_status", "Show git status of the repository.", {})
async def git_status_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    # On Railway, report pending files instead of using git subprocess
    if IS_RAILWAY:
        if _github_pending_files:
            files_list = "\n".join(f"  staged: {path}" for path in _github_pending_files.keys())
            return make_result(f"## main...origin/main\n{len(_github_pending_files)} files staged for commit:\n{files_list}")
        else:
            return make_result("## main...origin/main\nNo files staged (working tree clean)")

    # Local mode: use git subprocess
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain", "-b"],
            cwd=ALLOWED_CODEBASE,
            capture_output=True,
            text=True,
            timeout=10
        )
        output = result.stdout.strip()
        return make_result(output if output else "Working tree clean, on main branch")
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "git_log",
    "Show recent git commits.",
    {"count": int}
)
async def git_log_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    count = min(args.get("count", 10), 50)

    try:
        result = subprocess.run(
            ["git", "log", f"-{count}", "--oneline", "--no-decorate"],
            cwd=ALLOWED_CODEBASE,
            capture_output=True,
            text=True,
            timeout=10
        )
        return make_result(result.stdout.strip() or "No commits found")
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "git_commit",
    "Stage all changes and create a commit. On Railway, commits pending files via GitHub API.",
    {"message": str}
)
async def git_commit_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    global _github_pending_files
    message = args.get("message", "")

    if not message:
        return make_result(json.dumps({"error": "Commit message required"}), is_error=True)

    # On Railway, commit pending files via GitHub API
    if IS_RAILWAY:
        if not GITHUB_API_TOKEN:
            return make_result(json.dumps({"error": "GITHUB_API_TOKEN not configured"}), is_error=True)

        if not _github_pending_files:
            return make_result("Nothing to commit (no files staged)")

        # Commit all pending files in a single commit
        result = github_commit_multiple_files(_github_pending_files, message)

        if "error" in result:
            return make_result(json.dumps({"error": result["error"]}), is_error=True)

        # Clear pending files after successful commit
        files_committed = list(_github_pending_files.keys())
        _github_pending_files = {}

        return make_result(f"Committed {len(files_committed)} files via GitHub API:\n" +
                          "\n".join(f"  - {f}" for f in files_committed) +
                          f"\nCommit SHA: {result.get('commit_sha', 'unknown')}")

    # Local mode: use git subprocess
    try:
        # Stage all changes
        subprocess.run(["git", "add", "-A"], cwd=ALLOWED_CODEBASE, timeout=10)

        # Commit
        result = subprocess.run(
            ["git", "commit", "-m", message],
            cwd=ALLOWED_CODEBASE,
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            return make_result(json.dumps({"error": result.stderr.strip()}), is_error=True)

        return make_result(result.stdout.strip())
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "git_push",
    "Push commits to remote. On Railway, this is automatic (GitHub API commits push immediately).",
    {}
)
async def git_push_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    # On Railway, GitHub API commits already push (they update branch ref directly)
    if IS_RAILWAY:
        return make_result("Push complete (GitHub API commits are pushed automatically)")

    # Local mode: use git subprocess
    try:
        result = subprocess.run(
            ["git", "push"],
            cwd=ALLOWED_CODEBASE,
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode != 0:
            return make_result(json.dumps({"error": result.stderr.strip()}), is_error=True)

        return make_result("Pushed to remote")
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# BASH (Restricted)
# =============================================================================

ALLOWED_COMMANDS = [
    "ls", "pwd", "date", "echo", "cat", "head", "tail", "wc",
    "npm", "npx", "node", "python", "python3", "pip",
    "curl", "wget",
]

@tool(
    "run_command",
    "Run a shell command. Only certain commands are allowed.",
    {"command": str}
)
async def run_command_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    command = args.get("command", "")

    if not command:
        return make_result(json.dumps({"error": "Command required"}), is_error=True)

    # Check if command starts with an allowed binary
    first_word = command.split()[0] if command.split() else ""
    if first_word not in ALLOWED_COMMANDS:
        return make_result(json.dumps({
            "error": f"Command '{first_word}' not allowed. Allowed: {', '.join(ALLOWED_COMMANDS)}"
        }), is_error=True)

    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=ALLOWED_CODEBASE,
            capture_output=True,
            text=True,
            timeout=60
        )

        output = result.stdout.strip()
        if result.stderr:
            output += f"\n\nSTDERR:\n{result.stderr.strip()}"

        if len(output) > 10000:
            output = output[:10000] + "\n\n... [truncated]"

        return make_result(output if output else "(no output)")
    except subprocess.TimeoutExpired:
        return make_result(json.dumps({"error": "Command timeout"}), is_error=True)
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# TWITTER (Social posting)
# =============================================================================

@tool(
    "post_tweet",
    "Post a tweet to Twitter/X from Amber's @intheamber account. Max 280 chars.",
    {"text": str, "reply_to": str}
)
async def post_tweet_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    text = args.get("text", "")
    reply_to = args.get("reply_to", "")  # Optional tweet ID to reply to

    if not text:
        return make_result(json.dumps({"error": "Tweet text required"}), is_error=True)

    if len(text) > 280:
        return make_result(json.dumps({
            "error": f"Tweet too long: {len(text)} chars (max 280)"
        }), is_error=True)

    # Build command to call post-tweet.mjs
    script_dir = os.path.dirname(os.path.abspath(__file__))
    script_path = os.path.join(script_dir, "post-tweet.mjs")
    # Calculate sms-bot root from script location (agents/amber-email -> sms-bot)
    sms_bot_root = os.path.dirname(os.path.dirname(script_dir))

    cmd = ["node", script_path]
    if reply_to:
        cmd.extend(["--reply-to", reply_to])
    cmd.append(text)

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
            cwd=sms_bot_root,  # Run from sms-bot root for proper imports
        )

        # Parse JSON output
        try:
            data = json.loads(result.stdout.strip())
            if data.get("success"):
                return make_result(json.dumps({
                    "success": True,
                    "tweet_id": data.get("tweetId"),
                    "tweet_url": data.get("tweetUrl"),
                    "message": f"Tweet posted successfully! {data.get('tweetUrl', '')}"
                }))
            else:
                return make_result(json.dumps({
                    "error": data.get("error", "Unknown error")
                }), is_error=True)
        except json.JSONDecodeError:
            return make_result(json.dumps({
                "error": f"Failed to parse response: {result.stdout[:200]}"
            }), is_error=True)

    except subprocess.TimeoutExpired:
        return make_result(json.dumps({"error": "Tweet posting timed out"}), is_error=True)
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# CREATE MCP SERVER
# =============================================================================

amber_server = create_sdk_mcp_server(
    name="amber",
    version="1.0.0",
    tools=[
        # Web
        web_search_tool,
        # Images
        generate_amber_image_tool,  # OpenAI - Amber's preferred style
        generate_image_tool,  # fal.ai - fast alternative
        generate_og_image_tool,  # Branded OG images for social sharing
        screenshot_page_as_og_tool,  # Screenshot HTML page as OG image (amber-social)
        # Files
        read_file_tool,
        write_file_tool,
        list_directory_tool,
        search_code_tool,
        # Supabase (memory)
        read_amber_state_tool,
        write_amber_state_tool,
        # Git
        git_status_tool,
        git_log_tool,
        git_commit_tool,
        git_push_tool,
        # Twitter
        post_tweet_tool,
        # Bash
        run_command_tool,
    ]
)
