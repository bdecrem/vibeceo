#!/usr/bin/env python3
"""
Refresh popularity metrics for synth_library_catalog.

Fetches:
- GitHub: stars, forks, open issues, last commit
- npm: weekly downloads
- PyPI: monthly downloads

Usage:
    python scripts/refresh-synth-catalog-metrics.py

Requires:
    GITHUB_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY
"""

import os
import re
import json
import time
import urllib.request
import urllib.error
from datetime import datetime

# Config
GITHUB_TOKEN = os.getenv("GITHUB_API_TOKEN", "")
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

def github_request(endpoint: str) -> dict:
    """Make authenticated GitHub API request."""
    url = f"https://api.github.com/{endpoint}"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "synth-catalog-metrics",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {"error": "not_found"}
        print(f"  GitHub error {e.code}: {e.reason}")
        return {"error": str(e)}
    except Exception as e:
        print(f"  GitHub error: {e}")
        return {"error": str(e)}

def npm_downloads(package: str) -> int | None:
    """Fetch weekly downloads from npm."""
    url = f"https://api.npmjs.org/downloads/point/last-week/{package}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "synth-catalog-metrics"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            return data.get("downloads")
    except Exception as e:
        print(f"  npm error for {package}: {e}")
        return None

def pypi_downloads(package: str) -> int | None:
    """Fetch monthly downloads from PyPI Stats."""
    url = f"https://pypistats.org/api/packages/{package}/recent"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "synth-catalog-metrics"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            # Get last_month downloads
            return data.get("data", {}).get("last_month")
    except Exception as e:
        print(f"  PyPI error for {package}: {e}")
        return None

def extract_github_repo(url: str) -> tuple[str, str] | None:
    """Extract owner/repo from GitHub URL."""
    match = re.search(r"github\.com/([^/]+)/([^/]+)", url)
    if match:
        owner, repo = match.groups()
        # Clean repo name (remove .git, trailing slashes, etc)
        repo = repo.replace(".git", "").rstrip("/")
        return owner, repo
    return None

def supabase_query(query: str) -> list:
    """Execute Supabase SQL query."""
    url = f"{SUPABASE_URL}/rest/v1/rpc/sql"
    # Use the REST API directly for SELECT
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    # For SELECT, use the table endpoint
    if query.strip().upper().startswith("SELECT"):
        url = f"{SUPABASE_URL}/rest/v1/synth_library_catalog?select=id,name,url,npm_package,pypi_package"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())

    return []

def supabase_update(id: str, updates: dict) -> bool:
    """Update a row in synth_library_catalog."""
    url = f"{SUPABASE_URL}/rest/v1/synth_library_catalog?id=eq.{id}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    try:
        data = json.dumps(updates).encode()
        req = urllib.request.Request(url, data=data, headers=headers, method="PATCH")
        with urllib.request.urlopen(req, timeout=10) as resp:
            return True
    except Exception as e:
        print(f"  Update error: {e}")
        return False

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required")
        return

    print("Fetching catalog entries...")
    entries = supabase_query("SELECT")
    print(f"Found {len(entries)} entries\n")

    stats = {"github": 0, "npm": 0, "pypi": 0, "errors": 0}

    for i, entry in enumerate(entries):
        name = entry["name"]
        url = entry.get("url", "")
        npm_pkg = entry.get("npm_package")
        pypi_pkg = entry.get("pypi_package")

        print(f"[{i+1}/{len(entries)}] {name}")

        updates = {"metrics_updated_at": datetime.utcnow().isoformat()}

        # GitHub metrics
        repo_info = extract_github_repo(url)
        if repo_info:
            owner, repo = repo_info
            data = github_request(f"repos/{owner}/{repo}")

            if "error" not in data:
                updates["github_stars"] = data.get("stargazers_count")
                updates["github_forks"] = data.get("forks_count")
                updates["github_open_issues"] = data.get("open_issues_count")

                # Parse last commit date
                pushed_at = data.get("pushed_at")
                if pushed_at:
                    updates["last_commit"] = pushed_at[:10]  # YYYY-MM-DD

                print(f"  GitHub: ⭐{updates.get('github_stars', 0)} 🍴{updates.get('github_forks', 0)}")
                stats["github"] += 1
            else:
                stats["errors"] += 1

            time.sleep(0.1)  # Be nice to GitHub

        # npm metrics
        if npm_pkg:
            downloads = npm_downloads(npm_pkg)
            if downloads is not None:
                updates["npm_weekly_downloads"] = downloads
                print(f"  npm: {downloads:,}/week")
                stats["npm"] += 1
            time.sleep(0.05)

        # PyPI metrics
        if pypi_pkg:
            downloads = pypi_downloads(pypi_pkg)
            if downloads is not None:
                updates["pypi_monthly_downloads"] = downloads
                print(f"  PyPI: {downloads:,}/month")
                stats["pypi"] += 1
            time.sleep(0.05)

        # Update the row
        if len(updates) > 1:  # More than just metrics_updated_at
            supabase_update(entry["id"], updates)

    print(f"\n✅ Done!")
    print(f"   GitHub: {stats['github']} repos updated")
    print(f"   npm: {stats['npm']} packages updated")
    print(f"   PyPI: {stats['pypi']} packages updated")
    print(f"   Errors: {stats['errors']}")

if __name__ == "__main__":
    main()
