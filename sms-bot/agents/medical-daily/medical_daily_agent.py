"""
Medical Daily Agent - Demo Script
Fetches medical research, generates summaries, and creates audio podcasts
"""

import os
import json
import random
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import xml.etree.ElementTree as ET
from pathlib import Path
import shutil
import html
import re

TTS_CHAR_LIMIT = 4096
TTS_SAFE_LIMIT = 3800  # leave room for metadata

# === PubMed recency defaults ===
# Adjust these constants to change the default recency filter without touching the class.
# - PUBMED_DEFAULT_MAX_AGE_DAYS: 0 keeps only today's articles, N keeps the last N days,
#   negative numbers remove the age limit entirely.
# - PUBMED_DEFAULT_SEARCH_WINDOW_DAYS: controls the PubMed `reldate` window scanned for
#   candidates; keep this positive to ensure results.
PUBMED_DEFAULT_MAX_AGE_DAYS = 0
PUBMED_DEFAULT_SEARCH_WINDOW_DAYS = 2

# === Headline topic hints ===
# Maps common medical keywords to gentle, listener-friendly topic labels.
HEADLINE_TOPIC_HINTS = [
    ("Cancer breakthroughs", {"oncology", "cancer", "tumor", "carcinoma", "melanoma", "leukemia"}),
    ("Heart health", {"cardio", "heart", "cardiac", "cholesterol", "hypertension"}),
    ("Brain and nerves", {"neuro", "brain", "parkinson", "alzheimer", "stroke", "psychi"}),
    ("Metabolic health", {"diabetes", "metabolic", "obesity", "glp-1", "insulin"}),
    ("Immune therapies", {"immun", "vaccine", "antibody", "immune", "autoimmune"}),
    ("Gene and cell therapy", {"gene", "cell", "crispr", "genome", "rna", "stem"}),
    ("Aging and longevity", {"aging", "longevity", "senolytic", "anti-aging", "lifespan"}),
    ("Digital medicine", {"digital", "ai ", "machine learning", "wearable", "app", "telemed"}),
    ("Rare diseases", {"rare", "orphan", "ultra-rare"}),
    ("Clinical trial results", {"phase", "trial", "study", "randomized"}),
]

# === Breakthrough scoring knobs ===
# Boost terms tied to pivotal results and fresh approvals. Each entry is (keyword, weight).
PUBMED_BREAKTHROUGH_KEYWORDS = [
    ('first-in-human', 4.0),
    ('first in human', 4.0),
    ('fda approval', 4.0),
    ('approved', 2.0),
    ('authorization', 1.5),
    ('phase iii', 3.5),
    ('phase 3', 3.5),
    ('phase ii', 2.5),
    ('phase 2', 2.5),
    ('phase i', 1.5),
    ('randomized', 2.0),
    ('double-blind', 2.0),
    ('placebo-controlled', 2.0),
    ('superiority', 1.5),
    ('statistically significant', 2.0),
    ('significant improvement', 2.0),
    ('meets primary endpoint', 3.0),
    ('novel', 1.0),
    ('breakthrough', 2.5),
    ('gene therapy', 2.0),
    ('cell therapy', 1.8),
    ('crispr', 2.5),
    ('mrna', 1.5),
    ('device', 0.6),
    ('biomarker', 0.6),
]

PUBMED_PRIORITY_JOURNALS = {
    'the new england journal of medicine',
    'nejm',
    'lancet',
    'jama',
    'nature',
    'science',
    'cell',
    'bmj',
    'circulation',
    'journal of clinical oncology',
    'nature medicine',
    'nature biotechnology',
}

PUBMED_SIGNIFICANT_PUBLICATION_TYPES = {
    'clinical trial',
    'clinical trial, phase i',
    'clinical trial, phase ii',
    'clinical trial, phase iii',
    'clinical trial, phase iv',
    'controlled clinical trial',
    'randomized controlled trial',
    'comparative study',
    'evaluation study',
    'multicenter study',
    'validation study',
    'meta-analysis',
}

PUBMED_DE_PRIORITIZED_TYPES = {
    'review',
    'systematic review',
    'editorial',
    'letter',
    'news',
    'comment',
}

PUBMED_IMPORTANCE_SCORE_THRESHOLD = 3.0
PUBMED_COLLECTION_MULTIPLIER = 4

# === Podcast length knobs ===
PODCAST_TARGET_SECONDS_MIN = 45
PODCAST_TARGET_SECONDS_MAX = 90
WORDS_PER_SECOND = 2.7  # conversational pace


PUBMED_TOPIC_QUERIES = [
    # Neuro & devices
    '(Alzheimer OR Parkinson OR "neurodegenerative")',
    '("brain-computer interface" OR BCI OR neuroprosthetic)',
    
    # Oncology
    '(oncology OR "cancer immunotherapy" OR "liquid biopsy")',
    
    # Gene & cell therapy
    '(CRISPR OR "gene editing" OR "base editing" OR "prime editing" OR AAV OR "gene therapy" OR "CAR-T")',
    
    # Cardiometabolic blockbusters
    '("GLP-1" OR semaglutide OR tirzepatide OR "obesity drug")',
    '(lipid OR cholesterol OR atherosclerosis) AND (therapy OR treatment)',
    
    # Infectious disease & AMR
    '(vaccine OR mRNA OR adjuvant) AND (clinical OR trial)',
    '("antimicrobial resistance" OR AMR OR antibiotic) AND (novel OR new OR first-in-human)',
    
    # Regenerative & rare
    '("regenerative medicine" OR "stem cell") AND (clinical OR trial)',
    '("rare disease" OR "orphan disease") AND (therapy OR treatment OR gene)',
    
    # Repro & womenâ€™s health
    '(IVF OR "reproductive health" OR endometriosis OR PCOS) AND (therapy OR outcome)',
    
    # Microbiome therapeutics
    '("microbiome" OR FMT OR "live biotherapeutic") AND (trial OR clinical)',
    
    # AI with clinical validation (not toy models)
    '("AI" OR "machine learning") AND (diagnostic OR triage OR prognostic) AND (prospective OR external validation OR multicenter)',
    
    # Pharmacogenomics / precision
    '(pharmacogenomics OR "precision medicine") AND (trial OR clinical)',
    
    # Protein structure â†’ translational
    '("AlphaFold" OR "structure prediction") AND (drug OR inhibitor OR binder OR design)',


]

class PublicAudioUploader:

    """Publishes generated audio files to a public location.

    On this demo rig we simply copy the MP3 into a `public_audio` folder and
    construct a public URL using an environment-provided base (e.g., a Supabase
    bucket or CDN domain). During production you can swap the copy operation for
    an API upload call.
    """

    def __init__(self, base_url: str | None, target_dir: str):
        self.base_url = (base_url or '').rstrip('/') or None
        self.target_dir = Path(target_dir).expanduser().resolve()
        self.target_dir.mkdir(parents=True, exist_ok=True)

    def publish(self, local_path: Path) -> str | None:
        if not local_path.exists():
            return None
        destination = self.target_dir / local_path.name
        try:
            shutil.copy2(local_path, destination)
        except Exception:
            return None
        if not self.base_url:
            return destination.as_uri()
        return f"{self.base_url}/{local_path.name}"


class SupabaseAudioUploader:
    """Uploads audio files to Supabase Storage and returns a public URL."""

    def __init__(self, url: str, key: str, bucket: str, folder: str = 'podcasts', public: bool = True):
        self.url = url.rstrip('/')
        self.key = key
        self.bucket = bucket
        self.folder = folder.strip('/')
        self.public = public

    def publish(self, local_path: Path) -> str | None:
        if not local_path.exists():
            return None
        path_segments = [segment for segment in (self.folder, local_path.name) if segment]
        object_path = '/'.join(path_segments)
        endpoint = f"{self.url}/storage/v1/object/{self.bucket}/{object_path}"
        content_type = 'application/octet-stream'
        suffix = local_path.suffix.lower()
        if suffix == '.mp3':
            content_type = 'audio/mpeg'
        elif suffix in {'.html', '.htm'}:
            content_type = 'text/html; charset=utf-8'

        headers = {
            'Authorization': f'Bearer {self.key}',
            'apikey': self.key,
            'Content-Type': content_type,
            'x-upsert': 'true',
        }
        try:
            with local_path.open('rb') as fh:
                resp = requests.post(endpoint, headers=headers, data=fh.read())
            resp.raise_for_status()
        except Exception:
            return None
        if self.public:
            public_path = f"{self.url}/storage/v1/object/public/{self.bucket}/{object_path}"
            return public_path
        return endpoint

class MedicalDailyAgent:
    # === Podcast prompt builders ===
    def _words_for_seconds(self, target_seconds_min=45, target_seconds_max=90, wps=WORDS_PER_SECOND):
        import random
        low = int(target_seconds_min * wps)
        high = int(target_seconds_max * wps)
        return random.randint(low, high)

    FEW_SHOT_GUIDE = (
        "Example segue patterns:\n"
        "- If that's precision from the inside, here's precision you can see-on a scan.\n"
        "- Zoom out from the cell's trash service to the clinic waiting room... \n"
        "- Meanwhile, on the other end of the microscope... \n"
        "Avoid numbered headers; keep the flow like a conversation, not a table of contents."
    )

    def _build_podcast_prompt(self, articles, host_name="your host", tmin=PODCAST_TARGET_SECONDS_MIN, tmax=PODCAST_TARGET_SECONDS_MAX):
        words_target = self._words_for_seconds(tmin, tmax, WORDS_PER_SECOND)
        notes = []
        for a in articles:
            notes.append({
                "title": a.get("title", ""),
                "source": a.get("journal", "Unknown"),
                "date": a.get("date", "Recent"),
                "summary": (a.get("summary") or a.get("abstract") or a.get("description") or "").replace(
                    "\n", " "
                ).strip()
            })

        if not notes:
            return (
                "You are writing a short, conversational script for Medical Daily. "
                "Deliver a 45 second update explaining there were no qualifying studies today, "
                "offer a hopeful note about ongoing research, and reassure listeners that more news is coming soon."
            )

        segment_count = len(notes)
        segment_label = "segment" if segment_count == 1 else "segments"

        return f"""You are writing a short, conversational podcast script for "Medical Daily".

Goals:
- {segment_count} {segment_label} total; aim for about {words_target} words per segment (~{tmin}-{tmax}s each).
- Natural, radio-host cadence. Vary sentence length. No numbered headings.
- Use smooth segues between segments (callbacks, contrasts, " meanwhile...  ", " zooming in/out " ).
- Avoid jargon unless quickly explained with a clean analogy.
- Keep claims faithful to the provided notes; do not invent findings.
- Close with a tight outro and a line like " links in the show notes. "

Constraints:
- Do NOT add " Story 1/2/3 " headings.
- Do NOT dump references inline; refer to " notes " instead.

Segments (use these notes; paraphrase, don't quote):
{notes}

Write:
1) A one-sentence cold open that piques curiosity.
2) Cover all {segment_count} {segment_label}, averaging {words_target} words each and flowing one to the next with organic transitions.
3) A brief outro and reminder that this is not medical advice.

Use a friendly, curious tone-think science NPR, not marketing.
Host: {host_name}.

{self.FEW_SHOT_GUIDE}"""

    def _chunk_for_tts(self, text, max_len=3500):
        import re as _re
        sents = _re.split(r'(?<=[.!?])\s+', text.strip())
        chunks, cur = [], ""
        for s in sents:
            if len(cur) + len(s) + 1 <= max_len:
                cur = f"{cur} {s}".strip()
            else:
                if cur:
                    chunks.append(cur)
                cur = s
        if cur:
            chunks.append(cur)
        return chunks

    def _ensure_tts_safe_length(self, script: str, articles: list | None = None) -> str:
        """Ensure the script fits within the TTS input limit.
        If too long, regenerate a compact fallback or truncate cleanly."""

        if script is None:
            return ""

        # Normalize whitespace

        compact = " ".join(script.split())

        if len(compact) <= TTS_SAFE_LIMIT:

            return compact

        # Prefer deterministic fallback that is well under the limit

        try:

            if hasattr(self, "create_fallback_script") and articles:

                fb = self.create_fallback_script(articles)

                fb_compact = " ".join(fb.split())

                if len(fb_compact) <= TTS_SAFE_LIMIT:

                    return fb_compact

                # Final guard: hard trim to limit with sentence boundary if needed

                safe = fb_compact[:TTS_SAFE_LIMIT]

                return (safe.rsplit('.', 1)[0] + ".") if "." in safe else safe

        except Exception:

            pass

        # If fallback isn't available, trim current script at a sentence boundary

        trimmed = compact[:TTS_SAFE_LIMIT]

        if "." in trimmed:

            trimmed = trimmed.rsplit('.', 1)[0] + "."

        else:

            trimmed = trimmed[:TTS_SAFE_LIMIT-3] + "..."

        trimmed += "\n\n[Note: Audio version shortened. Send 'text' for full script.]"

        return trimmed


    def __init__(self, openai_api_key: str = None, model: str = "gpt-4o", pubmed_max_age_days: int | None = None, pubmed_search_window_days: int | None = None):
        """
        Initialize Medical Daily Agent

        Args:
            openai_api_key: OpenAI API key (or set OPENAI_API_KEY env var)
            model: LLM model to use.
            pubmed_max_age_days: Maximum age (in days) for PubMed articles. Use 0 for same-day coverage; negative disables the filter entirely.
            pubmed_search_window_days: Override for the PubMed reldate search window (in days).
        """
        self.openai_api_key = openai_api_key or os.getenv('OPENAI_API_KEY')
        self.model = model
        self.articles = []
        self.podcast_script = ""
        self.audio_file = None
        self.audio_url = None
        self.audio_page_url = None
        self.cache_dir = Path("medical_daily_cache")
        self.cache_dir.mkdir(exist_ok=True)
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = (
            os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            or os.getenv('SUPABASE_SERVICE_KEY')
            or os.getenv('SUPABASE_ANON_KEY')
        )
        supabase_bucket = os.getenv('SUPABASE_AUDIO_BUCKET', 'audio')
        supabase_folder = os.getenv('SUPABASE_AUDIO_FOLDER', 'topics/medical-daily/episodes')
        if supabase_url and supabase_key and supabase_bucket:
            self.audio_uploader = SupabaseAudioUploader(
                url=supabase_url,
                key=supabase_key,
                bucket=supabase_bucket,
                folder=supabase_folder,
                public=True
            )
        else:
            self.audio_uploader = PublicAudioUploader(
                base_url=os.getenv('PUBLIC_AUDIO_BASE_URL'),
                target_dir=os.getenv('PUBLIC_AUDIO_TARGET_DIR', 'public_audio')
            )

        self.elevenlabs_api_key = (
            os.getenv('MEDICAL_DAILY_ELEVENLABS_API_KEY')
            or os.getenv('ELEVENLABS_API_KEY')
        )
        self.elevenlabs_voice_id = (
            os.getenv('MEDICAL_DAILY_ELEVENLABS_VOICE_ID')
            or os.getenv('ELEVENLABS_VOICE_ID')
            or 'MF3mGyEYCl7XYWbV9V6O'
        )
        self.elevenlabs_model_id = (
            os.getenv('MEDICAL_DAILY_ELEVENLABS_MODEL_ID')
            or os.getenv('ELEVENLABS_MODEL_ID')
            or 'eleven_turbo_v2'
        )
        self.elevenlabs_base_url = (
            os.getenv('MEDICAL_DAILY_ELEVENLABS_BASE_URL')
            or os.getenv('ELEVENLABS_BASE_URL')
            or 'https://api.elevenlabs.io'
        )
        self.elevenlabs_output_format = (
            os.getenv('MEDICAL_DAILY_ELEVENLABS_OUTPUT_FORMAT')
            or os.getenv('ELEVENLABS_OUTPUT_FORMAT')
            or 'mp3_44100_128'
        )
        self.elevenlabs_latency = self._parse_int_env(
            ['MEDICAL_DAILY_ELEVENLABS_STREAMING_LATENCY', 'ELEVENLABS_STREAMING_LATENCY'],
            None,
        )
        self.elevenlabs_stability = self._parse_float_env(
            ['MEDICAL_DAILY_ELEVENLABS_STABILITY', 'ELEVENLABS_STABILITY'],
            0.5,
        )
        self.elevenlabs_similarity = self._parse_float_env(
            ['MEDICAL_DAILY_ELEVENLABS_SIMILARITY', 'ELEVENLABS_SIMILARITY'],
            0.5,
        )
        self.elevenlabs_style = self._parse_float_env(
            ['MEDICAL_DAILY_ELEVENLABS_STYLE', 'ELEVENLABS_STYLE'],
            0.0,
        )
        self.elevenlabs_speaker_boost = self._parse_bool_env(
            ['MEDICAL_DAILY_ELEVENLABS_SPEAKER_BOOST', 'ELEVENLABS_SPEAKER_BOOST'],
            True,
        )

        lookback_days = self._parse_int_env(
            ['MEDICAL_DAILY_PREPRINT_LOOKBACK_DAYS', 'MEDICAL_DAILY_PREPRINT_WINDOW'],
            2,
        )
        if lookback_days is None or lookback_days < 1:
            lookback_days = 1
        self.preprint_lookback_days = lookback_days

        preprint_limit = self._parse_int_env(
            ['MEDICAL_DAILY_PREPRINT_LIMIT', 'MEDICAL_DAILY_PREPRINT_MAX'],
            3,
        )
        if preprint_limit is None:
            preprint_limit = 3
        self.preprint_max_results = max(preprint_limit, 0)

        self.include_preprints = self._parse_bool_env(
            ['MEDICAL_DAILY_INCLUDE_PREPRINTS', 'MEDICAL_DAILY_ENABLE_PREPRINTS'],
            True,
        )

        default_max_age = PUBMED_DEFAULT_MAX_AGE_DAYS
        env_max_age = os.getenv('MEDICAL_DAILY_PUBMED_MAX_AGE_DAYS')
        max_age_sentinel = object()
        resolved_max_age = max_age_sentinel
        if pubmed_max_age_days is not None:
            try:
                value = int(pubmed_max_age_days)
            except (TypeError, ValueError):
                print('[WARN] Invalid pubmed_max_age_days provided; defaulting to module constant.')
            else:
                resolved_max_age = None if value < 0 else max(0, value)
        elif env_max_age:
            try:
                value = int(env_max_age)
            except ValueError:
                print('[WARN] MEDICAL_DAILY_PUBMED_MAX_AGE_DAYS must be an integer; defaulting to module constant.')
            else:
                resolved_max_age = None if value < 0 else max(0, value)

        if resolved_max_age is max_age_sentinel:
            if default_max_age is None:
                resolved_max_age = None
            else:
                try:
                    value = int(default_max_age)
                except (TypeError, ValueError):
                    print('[WARN] PUBMED_DEFAULT_MAX_AGE_DAYS must be an integer; using 7 days.')
                    resolved_max_age = 7
                else:
                    resolved_max_age = None if value < 0 else max(0, value)

        self.pubmed_max_age_days = resolved_max_age

        default_search_window = PUBMED_DEFAULT_SEARCH_WINDOW_DAYS
        env_search_window = os.getenv('MEDICAL_DAILY_PUBMED_SEARCH_WINDOW_DAYS')
        window_sentinel = object()
        resolved_window = window_sentinel
        if pubmed_search_window_days is not None:
            try:
                value = int(pubmed_search_window_days)
            except (TypeError, ValueError):
                print('[WARN] Invalid pubmed_search_window_days provided; using automatic window.')
            else:
                if value <= 0:
                    print('[WARN] pubmed_search_window_days must be positive; using automatic window.')
                else:
                    resolved_window = value
        elif env_search_window:
            try:
                value = int(env_search_window)
            except ValueError:
                print('[WARN] MEDICAL_DAILY_PUBMED_SEARCH_WINDOW_DAYS must be an integer; using automatic window.')
            else:
                if value <= 0:
                    print('[WARN] MEDICAL_DAILY_PUBMED_SEARCH_WINDOW_DAYS must be positive; using automatic window.')
                else:
                    resolved_window = value

        def _auto_search_window() -> int:
            return 30 if self.pubmed_max_age_days is None else max(self.pubmed_max_age_days + 1, 1)

        if resolved_window is window_sentinel:
            if default_search_window is None:
                self.pubmed_search_window_days = _auto_search_window()
            else:
                try:
                    value = int(default_search_window)
                except (TypeError, ValueError):
                    print('[WARN] PUBMED_DEFAULT_SEARCH_WINDOW_DAYS must be an integer; using automatic window.')
                    self.pubmed_search_window_days = _auto_search_window()
                else:
                    if value <= 0:
                        print('[WARN] PUBMED_DEFAULT_SEARCH_WINDOW_DAYS must be positive; using automatic window.')
                        self.pubmed_search_window_days = _auto_search_window()
                    else:
                        self.pubmed_search_window_days = value
        else:
            self.pubmed_search_window_days = resolved_window

    def configure_pubmed_recency(self, *, max_age_days: int | None = None, search_window_days: int | None = None) -> None:
        """Update the PubMed recency filters at runtime."""
        if max_age_days is not None:
            try:
                value = int(max_age_days)
            except (TypeError, ValueError) as exc:
                raise ValueError("max_age_days must be an integer or None") from exc
            if value < 0:
                self.pubmed_max_age_days = None
            else:
                self.pubmed_max_age_days = value
            if search_window_days is None:
                if self.pubmed_max_age_days is None:
                    self.pubmed_search_window_days = 30
                else:
                    self.pubmed_search_window_days = max(self.pubmed_max_age_days + 1, 1)
        if search_window_days is not None:
            try:
                value = int(search_window_days)
            except (TypeError, ValueError) as exc:
                raise ValueError("search_window_days must be an integer or None") from exc
            if value <= 0:
                raise ValueError("search_window_days must be positive")
            self.pubmed_search_window_days = value

    def _parse_pubmed_date(self, date_elem) -> tuple[datetime | None, str]:
        """Parse a PubMed <PubDate> element into a datetime and display label."""
        if date_elem is None:
            return None, 'Recent'

        def _month_to_int(value: str | None) -> int:
            if not value:
                return 1
            value = value.strip()
            month_map = {
                'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
                'jul': 7, 'aug': 8, 'sep': 9, 'sept': 9, 'oct': 10, 'nov': 11, 'dec': 12
            }
            lower = value.lower()
            if lower in month_map:
                return month_map[lower]
            try:
                num = int(value)
                if 1 <= num <= 12:
                    return num
            except ValueError:
                pass
            return 1

        year_text = date_elem.findtext('Year')
        month_text = date_elem.findtext('Month')
        day_text = date_elem.findtext('Day')

        if not year_text:
            medline_date = date_elem.findtext('MedlineDate')
            if medline_date:
                tokens = medline_date.replace('-', ' ').split()
                year_text = next((t for t in tokens if t.isdigit() and len(t) == 4), None)
                month_text = next((t for t in tokens if t.isalpha()), None)

        try:
            year = int(year_text) if year_text else None
        except ValueError:
            year = None

        if not year:
            return None, 'Recent'

        month = _month_to_int(month_text)
        try:
            day = int(day_text) if day_text and day_text.isdigit() else 1
        except ValueError:
            day = 1

        try:
            date_obj = datetime(year, month, max(1, min(day, 28)))
        except ValueError:
            date_obj = datetime(year, month, 1)

        display = date_obj.strftime('%Y %b %d')
        return date_obj, display



    def _load_cached_articles(self, limit: int = 5) -> list[dict]:
        """Load articles from the most recent cached digest as a fallback."""
        try:
            latest = sorted(self.cache_dir.glob('digest_*.json'), reverse=True)
            if not latest:
                return []
            data = json.loads(latest[0].read_text())
            return data.get('articles', [])[:limit]
        except Exception:
            return []

    def _derive_topic_label(self, article: Dict) -> str | None:
        """Return a gentle, listener-friendly topic label for a story."""
        text_fields = [
            article.get('title') or '',
            article.get('summary') or '',
            article.get('abstract') or '',
            article.get('journal') or ''
        ]
        blob = ' '.join(text_fields).lower()
        for label, keywords in HEADLINE_TOPIC_HINTS:
            if any(keyword in blob for keyword in keywords):
                return label

        title = (article.get('title') or '').strip()
        if not title:
            return None
        simple_words = re.findall(r"[a-zA-Z]{3,}", title.lower())[:3]
        if not simple_words:
            return None
        phrase = ' '.join(simple_words)
        return phrase.capitalize() if phrase else None

    def _condense_headline(self, articles: list[Dict]) -> str:
        """Build a friendly umbrella headline for the day's collection."""
        topics: list[str] = []
        seen: set[str] = set()
        for art in articles:
            topic = self._derive_topic_label(art)
            if not topic:
                continue
            topic_lower = topic.lower()
            if topic_lower in seen:
                continue
            seen.add(topic_lower)
            topics.append(topic)
            if len(topics) == 3:
                break
        if not topics:
            return "Medical Daily: Today's medical highlights"
        if len(topics) == 1:
            headline = f"Medical Daily: Today's focus on {topics[0]}"
        elif len(topics) == 2:
            headline = f"Medical Daily: Updates on {topics[0]} and {topics[1]}"
        else:
            headline = f"Medical Daily: {topics[0]}, {topics[1]}, and {topics[2]}"
        if len(headline) > 90:
            headline = headline[:87].rstrip() + '...'
        return headline

    def _extract_pubmed_publication_types(self, article_elem) -> list[str]:
        """Return any publication type labels attached to the article."""
        publication_types: list[str] = []
        for pt in article_elem.findall('.//PublicationType'):
            label = (pt.text or '').strip()
            if label:
                publication_types.append(label)
        return publication_types

    def _score_pubmed_article(
        self,
        *,
        title: str,
        abstract: str,
        journal: str,
        publication_types: list[str]
    ) -> float:
        """Heuristically score how newsworthy a PubMed article is for the show."""
        score = 0.0
        text_blob = f"{title} {abstract}".lower()

        for keyword, weight in PUBMED_BREAKTHROUGH_KEYWORDS:
            if keyword in text_blob:
                score += weight

        for pub_type in publication_types:
            lowered = pub_type.lower()
            if lowered in PUBMED_SIGNIFICANT_PUBLICATION_TYPES:
                score += 1.5
            if lowered in PUBMED_DE_PRIORITIZED_TYPES:
                score -= 1.5

        journal_clean = (journal or '').strip().lower()
        if journal_clean in PUBMED_PRIORITY_JOURNALS:
            score += 1.5

        if 'case report' in text_blob or 'case series' in text_blob:
            score -= 1.0
        if 'retrospective' in text_blob and 'randomized' not in text_blob:
            score -= 0.8
        if 'observational' in text_blob and 'trial' not in text_blob:
            score -= 0.5
        if 'protocol' in text_blob:
            score -= 0.5
        if 'review' in text_blob and score < 3.0:
            score -= 1.0

        if 'first' in text_blob and 'clinical' in text_blob:
            score += 0.8
        if 'placebo' in text_blob and 'trial' in text_blob:
            score += 0.8
        if 'survival' in text_blob and ('overall' in text_blob or 'progression-free' in text_blob):
            score += 1.0
        if 'biomarker' in text_blob and 'predict' in text_blob:
            score += 0.5

        if score < 0:
            score = 0.0
        return score

    def _build_landing_page(self, audio_url: str, articles: list[Dict]) -> Path | None:
        """Render a simple HTML landing page for the daily episode."""
        if not audio_url:
            return None

        headline = self._condense_headline(articles)
        date_label = datetime.now().strftime('%B %d, %Y')

        story_count = len(articles)
        safe_audio_url = html.escape(audio_url, quote=True)
        player_note = "Audio will appear once today's briefing is ready." if story_count == 0 else f"Tap to hear today's {story_count}-story briefing."
        player_note_html = html.escape(player_note)

        seen_keys: set[tuple[str, str]] = set()
        story_items: list[str] = []
        visible_index = 0
        for article in articles:
            title_text = (article.get('title') or 'Untitled update').strip()
            key = (title_text.lower(), (article.get('url') or '').lower())
            if key in seen_keys:
                continue
            seen_keys.add(key)
            visible_index += 1

            summary_source = article.get('detail_summary') or article.get('summary') or article.get('abstract') or ''
            summary_clean = ' '.join(summary_source.split())
            if len(summary_clean) > 600:
                summary_clean = summary_clean[:597].rstrip() + '...'

            title_html = html.escape(title_text)
            summary_html = html.escape(summary_clean)

            link_html = ''
            url_value = article.get('url')
            if url_value:
                safe_url = html.escape(url_value, quote=True)
                link_html = f'<p class="story-link"><a href="{safe_url}" target="_blank" rel="noopener">Read the original study</a></p>'

            body_parts = [f"<p>{summary_html}</p>"]
            if link_html:
                body_parts.append(link_html)
            story_body = "\n    ".join(body_parts)

            story_html = "\n".join([
                f'<details class="story"{(" open" if visible_index == 1 else "")}>',
                f'  <summary><span class="story-index">{visible_index:02d}</span><span class="story-title">{title_html}</span></summary>',
                '  <div class="story-body">',
                f'    {story_body}',
                '  </div>',
                '</details>',
            ])
            story_items.append(story_html)

        stories_html = "\n      ".join(story_items) if story_items else '<p class="empty">No stories available today.</p>'

        hero_title = "Medical Daily"
        hero_subhead = "Daily highlights in medicine and health."
        today_label = datetime.now().strftime('%B %d, %Y')

        filename = f"medical_daily_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        page_path = self.cache_dir / filename

        html_doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{hero_title} - {today_label}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
    :root {{ color-scheme: dark; font-family:'Inter',system-ui,-apple-system,sans-serif; }}
    body {{ margin:0; background:#050b22; color:#f4f6ff; }}
    main.shell {{ max-width:720px; margin:0 auto; padding:48px 28px 72px; }}
    .hero {{ text-align:center; margin-bottom:40px; }}
    .hero h1 {{ font-size:2.4rem; margin:18px 0 10px; line-height:1.2; }}
    .hero .datestamp {{ letter-spacing:0.18em; text-transform:uppercase; font-size:0.75rem; color:#92a4ff; }}
    .hero .subhead {{ font-size:1rem; color:#cdd6ff; max-width:520px; margin:0 auto; line-height:1.55; }}
    .player {{ display:flex; flex-direction:column; align-items:center; background:linear-gradient(135deg,#1b2050,#0c1132); border-radius:28px; padding:36px 24px; box-shadow:0 24px 60px rgba(5,11,45,0.55); margin-bottom:48px; }}
    .play-toggle {{ border:none; border-radius:50%; width:140px; height:140px; background:#f4f6ff; color:#060b23; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; transition:transform 0.2s ease, box-shadow 0.2s ease; font-weight:600; gap:10px; }}
    .play-toggle .icon {{ font-size:3.2rem; line-height:1; }}
    .play-toggle .label {{ font-size:0.8rem; text-transform:uppercase; letter-spacing:0.12em; }}
    .play-toggle:hover {{ transform:scale(1.05); box-shadow:0 20px 60px rgba(244,246,255,0.35); }}
    .play-toggle.is-playing {{ background:#5ad6ff; color:#030617; }}
    .player-note {{ margin-top:18px; font-size:0.95rem; color:#c5cdfa; text-align:center; }}
    audio {{ display:none; }}
    .topics {{ background:rgba(13,20,55,0.78); border-radius:24px; padding:28px 24px; backdrop-filter:blur(24px); border:1px solid rgba(90,105,180,0.25); }}
    .topics h2 {{ margin:0 0 18px; font-size:1.3rem; letter-spacing:0.04em; text-transform:uppercase; color:#94a6ff; }}
    details.story {{ border-bottom:1px solid rgba(255,255,255,0.08); padding:16px 0; }}
    details.story:last-of-type {{ border-bottom:none; }}
    details.story > summary {{ list-style:none; font-size:1.05rem; display:flex; align-items:center; gap:16px; cursor:pointer; }}
    details.story > summary::-webkit-details-marker {{ display:none; }}
    .story-index {{ display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:50%; background:rgba(148,166,255,0.18); color:#94a6ff; font-weight:600; font-size:0.85rem; }}
    .story-title {{ flex:1; font-weight:600; color:#f4f6ff; }}
    .story-body {{ margin-top:14px; font-size:0.95rem; line-height:1.55; color:#d5dcff; }}
    .story-body p {{ margin:0 0 12px; }}
    .story-link a {{ color:#78f3ff; text-decoration:none; font-weight:600; }}
    .story-link a:hover {{ text-decoration:underline; }}
    .empty {{ margin:0; text-align:center; color:#c5cdfa; }}
    .footnote {{ margin-top:36px; text-align:center; font-size:0.8rem; color:#8c96d8; }}
    @media (max-width:540px) {{
        main.shell {{ padding:36px 18px 60px; }}
        .play-toggle {{ width:120px; height:120px; }}
        .hero h1 {{ font-size:2rem; }}
    }}
</style>
</head>
<body>
  <main class="shell">
    <header class="hero">
      <p class="datestamp">{today_label}</p>
      <h1>{hero_title}</h1>
      <p class="subhead">{hero_subhead}</p>
    </header>
    <section class="player">
      <button class="play-toggle" id="playToggle" type="button" aria-label="Play Medical Daily episode" aria-pressed="false">
        <span class="icon" aria-hidden="true">&#9658;</span>
        <span class="label">Play episode</span>
      </button>
      <p class="player-note">{player_note_html}</p>
      <audio id="podcastAudio" preload="metadata" src="{safe_audio_url}"></audio>
    </section>
    <section class="topics">
      <h2>Today's Headlines</h2>
      {stories_html}
    </section>
    <footer class="footnote">
      <p>This briefing is for information only and not medical advice.</p>
    </footer>
  </main>
<script>
(function() {{
  const audio = document.getElementById('podcastAudio');
  const toggle = document.getElementById('playToggle');
  if (!audio || !toggle) {{ return; }}
  const icon = toggle.querySelector('.icon');
  const label = toggle.querySelector('.label');

  function setPlaying(state) {{
    toggle.classList.toggle('is-playing', state);
    toggle.setAttribute('aria-pressed', state ? 'true' : 'false');
    if (icon) {{ icon.innerHTML = state ? '&#10074;&#10074;' : '&#9658;'; }}
    if (label) {{ label.textContent = state ? 'Pause episode' : 'Play episode'; }}
    toggle.setAttribute('aria-label', state ? 'Pause Medical Daily episode' : 'Play Medical Daily episode');
  }}

  toggle.addEventListener('click', function() {{
    if (audio.paused) {{
      audio.play();
    }} else {{
      audio.pause();
    }}
  }});

  audio.addEventListener('play', function() {{ setPlaying(true); }});
  audio.addEventListener('pause', function() {{ setPlaying(false); }});
  audio.addEventListener('ended', function() {{ setPlaying(false); }});

  setPlaying(!audio.paused);
}})();
</script>
</body>
</html>
"""
        page_path.write_text(html_doc, encoding='utf-8')
        return page_path



    def fetch_pubmed_articles(self, max_results: int = 10) -> List[Dict]:
        """Fetch recent medical research from PubMed using multiple topic lenses."""
        print("[SEARCH] Fetching PubMed articles...")

        base_query = "((breakthrough[Title/Abstract]) OR (clinical trial[Publication Type]) OR (FDA approval) OR (longevity) OR (cancer treatment) OR (gene therapy) OR (medical advancement))"
        base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
        search_url = f"{base_url}esearch.fcgi"
        fetch_url = f"{base_url}efetch.fcgi"

        collected: list[Dict] = []
        seen_pmids: set[str] = set()

        queries = [''] + PUBMED_TOPIC_QUERIES
        now = datetime.now()
        cutoff_date = None
        if self.pubmed_max_age_days is not None:
            cutoff_date = now.date() - timedelta(days=self.pubmed_max_age_days)
        future_guard_date = (now + timedelta(days=1)).date()
        max_pool = max(max_results * PUBMED_COLLECTION_MULTIPLIER, max_results)

        for topic in queries:
            if len(collected) >= max_pool:
                break
            term = base_query if not topic else f"({base_query}) AND ({topic})"
            search_params = {
                'db': 'pubmed',
                'term': term,
                'reldate': max(self.pubmed_search_window_days, 1),
                'retmax': max_results * 2,
                'retmode': 'json',
                'sort': 'pub date'
            }
            try:
                search_response = requests.get(search_url, params=search_params, timeout=10)
                search_response.raise_for_status()
                search_data = search_response.json()
                id_list = search_data.get('esearchresult', {}).get('idlist', [])
                id_list = [pmid for pmid in id_list if pmid not in seen_pmids]
                if not id_list:
                    continue

                fetch_params = {
                    'db': 'pubmed',
                    'id': ','.join(id_list),
                    'retmode': 'xml'
                }
                fetch_response = requests.get(fetch_url, params=fetch_params, timeout=10)
                fetch_response.raise_for_status()
                root = ET.fromstring(fetch_response.content)

                for article in root.findall('.//PubmedArticle'):
                    if len(collected) >= max_pool:
                        break
                    try:
                        title_elem = article.find('.//ArticleTitle')
                        abstract_elem = article.find('.//AbstractText')
                        pmid_elem = article.find('.//PMID')
                        journal_elem = article.find('.//Journal/Title')
                        date_elem = article.find('.//PubDate')

                        title = title_elem.text if title_elem is not None else "No title"
                        abstract = ""
                        if abstract_elem is not None:
                            abstract = ' '.join(abstract_elem.itertext()).strip()
                        if not abstract:
                            continue
                        pmid = pmid_elem.text if pmid_elem is not None else "Unknown"
                        if not pmid or pmid in seen_pmids:
                            continue
                        journal = journal_elem.text if journal_elem is not None else "Unknown Journal"
                        publication_types = self._extract_pubmed_publication_types(article)
                        importance_score = self._score_pubmed_article(
                            title=title,
                            abstract=abstract,
                            journal=journal,
                            publication_types=publication_types
                        )

                        date_obj, display_date = self._parse_pubmed_date(date_elem)
                        if date_obj:
                            article_date = date_obj.date()
                            if cutoff_date is not None and article_date < cutoff_date:
                                continue
                            if article_date > future_guard_date:
                                continue

                        collected.append({
                            'title': title,
                            'abstract': abstract,
                            'pmid': pmid,
                            'journal': journal,
                            'date': display_date,
                            'url': f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                            'publication_types': publication_types,
                            'importance_score': importance_score
                        })
                        seen_pmids.add(pmid)
                    except Exception as exc:
                        print(f"[WARN] Error parsing article: {exc}")
                        continue
            except Exception as exc:
                print(f"[WARN] Query failed for topic '{topic}': {exc}")
                continue

        if not collected:
            print("[WARN] No fresh PubMed articles found; loading from cache.")
            return self._load_cached_articles(limit=max_results)

        collected.sort(key=lambda item: item.get('importance_score', 0), reverse=True)
        curated = [
            item for item in collected
            if item.get('importance_score', 0) >= PUBMED_IMPORTANCE_SCORE_THRESHOLD
        ]
        if curated:
            curated = curated[:max_results]
        else:
            curated = collected[:max_results]

        if not curated:
            print("[WARN] PubMed scoring returned no candidates; loading from cache.")
            return self._load_cached_articles(limit=max_results)

        print(f"[OK] Curated {len(curated)} PubMed articles (scanned {len(collected)})")
        return curated

    def fetch_fda_approvals(self) -> List[Dict]:
        """Fetch recent FDA drug approvals"""
        print("[SEARCH] Fetching FDA approvals...")
        
        try:
            # Try multiple FDA data sources
            approvals = []
            
            # Source 1: FDA Drugs@FDA API
            api_url = "https://api.fda.gov/drug/drugsfda.json"
            params = {
                'search': 'approval_date:[20241001+TO+20251231]',  # Recent approvals
                'limit': 5
            }
            
            response = requests.get(api_url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                
                for item in results[:3]:
                    products = item.get('products', [])
                    if products:
                        product = products[0]
                        brand_name = product.get('brand_name', 'Unknown')
                        active_ingredient = product.get('active_ingredients', [{}])[0].get('name', '')
                        
                        title = f"FDA Approval: {brand_name}"
                        if active_ingredient:
                            title += f" ({active_ingredient})"
                        
                        approvals.append({
                            'title': title,
                            'description': f"New drug approval for {brand_name}. Active ingredient: {active_ingredient}",
                            'abstract': f"The FDA has approved {brand_name} containing {active_ingredient}.",
                            'url': f"https://www.accessdata.fda.gov/scripts/cder/daf/",
                            'date': item.get('submissions', [{}])[0].get('submission_status_date', 'Recent'),
                            'type': 'FDA Approval',
                            'journal': 'FDA'
                        })
                
                print(f"[OK] Found {len(approvals)} FDA approvals")
                return approvals
            else:
                print(f"[WARN] FDA API returned status {response.status_code} - falling back to zero approvals today")
                return []
            
        except Exception as e:
            print(f"[WARN] Could not fetch FDA data: {e}")
            return []
    



    def fetch_preprint_articles(self, max_results: int = 3) -> List[Dict]:
        '''Fetch recent medRxiv and bioRxiv preprints.'''
        if max_results <= 0 or not self.include_preprints:
            return []

        print('[SEARCH] Fetching medRxiv/bioRxiv preprints...')

        lookback_days = max(self.preprint_lookback_days or 1, 1)
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=lookback_days)

        base_url = 'https://api.biorxiv.org/details'
        servers = [
            ('medrxiv', 'medRxiv'),
            ('biorxiv', 'bioRxiv'),
        ]

        sort_pool: list[Dict] = []
        seen_dois: set[str] = set()

        for server_id, label in servers:
            try:
                url = f"{base_url}/{server_id}/{start_date.isoformat()}/{end_date.isoformat()}"
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                payload = response.json()
                records = payload.get('collection') or []
                if not isinstance(records, list):
                    continue

                for entry in records:
                    doi = (entry.get('doi') or '').strip()
                    if doi and doi in seen_dois:
                        continue

                    title = (entry.get('title') or '').strip()
                    abstract = (entry.get('abstract') or '').strip()
                    if not title:
                        continue

                    iso_date = (entry.get('date') or '').strip()
                    display_date = iso_date or 'Recent'
                    sort_timestamp = 0.0
                    if iso_date:
                        try:
                            parsed = datetime.strptime(iso_date, '%Y-%m-%d')
                            display_date = parsed.strftime('%Y %b %d')
                            sort_timestamp = parsed.timestamp()
                        except ValueError:
                            display_date = iso_date

                    url_candidate = entry.get('link') or entry.get('rel_link') or ''
                    if not url_candidate and doi:
                        url_candidate = f"https://doi.org/{doi}"

                    score = self._score_pubmed_article(
                        title=title,
                        abstract=abstract or title,
                        journal=label,
                        publication_types=['Preprint']
                    )
                    if server_id == 'medrxiv':
                        score += 0.4

                    record = {
                        'title': title,
                        'abstract': abstract,
                        'journal': label,
                        'date': display_date,
                        'url': url_candidate or None,
                        'doi': doi or None,
                        'category': entry.get('category'),
                        'importance_score': score,
                        'authors': entry.get('authors'),
                        'type': 'Preprint',
                        '_sort_timestamp': sort_timestamp,
                    }

                    sort_pool.append(record)
                    if doi:
                        seen_dois.add(doi)
            except Exception as exc:
                print(f"[WARN] Preprint fetch failed for {label}: {exc}")
                continue

        if not sort_pool:
            print('[WARN] No preprints found for the selected window.')
            return []

        sort_pool.sort(key=lambda item: (item.get('importance_score', 0.0), item.get('_sort_timestamp', 0.0)), reverse=True)

        curated: list[Dict] = []
        for item in sort_pool:
            pruned = {k: v for k, v in item.items() if not k.startswith('_')}
            curated.append(pruned)
            if len(curated) >= max_results:
                break

        print(f"[OK] Curated {len(curated)} preprints (scanned {len(sort_pool)})")
        return curated

    def generate_summaries(self, articles: List[Dict]) -> List[Dict]:
        """Generate concise summaries using LLM"""
        print('[BOT] Generating summaries with LLM...')

        import re

        def build_fallback_pair(article: Dict) -> tuple[str, str]:
            text_sources = [
                article.get('summary'),
                article.get('abstract'),
                article.get('description'),
            ]
            clean = ''
            for source in text_sources:
                if source:
                    candidate = source.replace('\r', ' ').replace('\n', ' ').strip()
                    if candidate:
                        clean = candidate
                        break
            if not clean:
                journal_name = article.get('journal', 'a leading medical source')
                base = f'This update from {journal_name} highlights an important development to watch.'
                date_label = (article.get('date') or '').strip()
                if date_label and date_label.lower() != 'recent':
                    detail = f"{base} It appeared on {date_label}."
                else:
                    detail = base + " We'll share more details as researchers learn more."
                return base, detail

            sentences = re.split(r'(?<=[.!?])\s+', clean)
            sentences = [s.strip() for s in sentences if s.strip()]
            if not sentences:
                sentences = [clean]

            podcast_sentences = sentences[:2]
            detail_sentences = sentences[:4] if len(sentences) > 2 else sentences
            podcast_summary = ' '.join(podcast_sentences)
            detail_summary = ' '.join(detail_sentences)

            if len(podcast_summary) > 350:
                podcast_summary = podcast_summary[:347].rstrip() + '...'
            if len(detail_summary) > 750:
                detail_summary = detail_summary[:747].rstrip() + '...'

            if detail_summary.strip().lower() == podcast_summary.strip().lower():
                remaining = ' '.join(sentences[len(podcast_sentences):]).strip()
                extras = []
                if remaining:
                    extras.append(remaining)
                journal = (article.get('journal') or '').strip()
                if journal and journal.lower() not in {'unknown', 'unknown journal'}:
                    extras.append(f'It was published in {journal}.')
                date_label = (article.get('date') or '').strip()
                if date_label and date_label.lower() != 'recent':
                    extras.append(f'The findings were shared on {date_label}.')
                if extras:
                    detail_summary = f"{podcast_summary} {' '.join(extras)}"
                else:
                    detail_summary = podcast_summary + ' Researchers are continuing to explore what this means for patients.'

            return podcast_summary, detail_summary

        if not self.openai_api_key:
            print('[WARN] No OpenAI API key provided, using simplified abstracts')
            for article in articles:
                short, long = build_fallback_pair(article)
                article['summary'] = short
                article['detail_summary'] = long
            return articles

        try:
            import openai
            client = openai.OpenAI(api_key=self.openai_api_key)

            for article in articles:
                prompt = f"""You will summarize a medical study for two formats.
Return ONLY a valid JSON object with keys "podcast_summary" and "detail_summary".

Podcast summary: 2 sentences in simple, everyday language for a morning news show.
Detail summary: 3-4 sentences that add at least one concrete detail about study design, scale, population, or next steps. Do not repeat the podcast summary verbatim.
Both summaries must explain technical terms in plain English and stay faithful to the source. If details are missing, say so plainly.

Title: {article['title']}
Abstract: {article.get('abstract', article.get('description', ''))}

JSON:"""

                response = client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a medical science communicator like Kurzgesagt or Vox. Make complex research accessible using simple analogies and everyday language. Never use jargon without explaining it."},
                        {"role": "user", "content": prompt}
                    ],
                    max_completion_tokens=400
                )

                raw_content = response.choices[0].message.content if response.choices else ''
                podcast_summary = ''
                detail_summary = ''
                if raw_content:
                    candidates = [raw_content.strip()]
                    if '```' in raw_content:
                        candidates.extend([chunk.strip() for chunk in raw_content.split('```') if chunk.strip()])
                    for candidate in candidates:
                        cleaned = candidate.strip()
                        if cleaned.lower().startswith('json'):
                            cleaned = cleaned[4:].strip()
                        try:
                            payload = json.loads(cleaned)
                        except json.JSONDecodeError:
                            continue
                        podcast_summary = (payload.get('podcast_summary') or '').strip()
                        detail_summary = (payload.get('detail_summary') or '').strip()
                        if podcast_summary or detail_summary:
                            break

                if not podcast_summary or len(podcast_summary.split()) < 3:
                    fallback_short, fallback_long = build_fallback_pair(article)
                    if not podcast_summary:
                        podcast_summary = fallback_short
                    if not detail_summary:
                        detail_summary = fallback_long

                if not detail_summary:
                    detail_summary = podcast_summary

                if detail_summary.strip().lower() == podcast_summary.strip().lower() or len(detail_summary.split()) <= len(podcast_summary.split()):
                    _, fallback_long = build_fallback_pair(article)
                    fallback_clean = fallback_long.strip()
                    if fallback_clean and fallback_clean.lower() != podcast_summary.strip().lower():
                        detail_summary = fallback_clean
                    else:
                        detail_summary = podcast_summary + ' Researchers are continuing to explore what this means for patients.'

                article['summary'] = podcast_summary
                article['detail_summary'] = detail_summary

            print('[OK] Summaries generated')
            return articles

        except Exception as e:
            print(f"[WARN] Error generating summaries: {e}")
            for article in articles:
                short, long = build_fallback_pair(article)
                article['summary'] = short
                article['detail_summary'] = long
            return articles

    def create_podcast_script(self, articles: List[Dict]) -> str:
        """Create a conversational podcast script with smooth segues and per-segment targets"""
        print("[INFO] Creating podcast script...")
        self.articles = articles

        if not articles:
            return ""

        if not self.openai_api_key:
            return self.create_fallback_script(articles)

        try:
            import openai
            client = openai.OpenAI(api_key=self.openai_api_key)
            prompt = self._build_podcast_prompt(
                articles,
                host_name="Medical Daily",
                tmin=PODCAST_TARGET_SECONDS_MIN,
                tmax=PODCAST_TARGET_SECONDS_MAX
            )
            resp = client.chat.completions.create(
                model=self.model or "gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a meticulous science radio writer. Be engaging, accurate, and concise."},
                    {"role": "user", "content": prompt}
                ]
            )
            script = resp.choices[0].message.content.strip() if resp.choices else ""
            script = self._ensure_tts_safe_length(script, articles)
            if script:
                return script
            print("[WARN] Empty script returned by LLM, using fallback script.")
        except Exception as e:
            print(f"[WARN] Falling back to simple script after LLM error: {e}")

        return self.create_fallback_script(articles)

    def _parse_float_env(self, keys: List[str], default: float) -> float:
        for key in keys:
            value = os.getenv(key)
            if value is None:
                continue
            try:
                return float(value)
            except ValueError:
                print(f"[WARN] {key} must be a number; using default {default}.")
        return default

    def _parse_int_env(self, keys: List[str], default: Optional[int]) -> Optional[int]:
        for key in keys:
            value = os.getenv(key)
            if value is None:
                continue
            try:
                return int(value)
            except ValueError:
                print(f"[WARN] {key} must be an integer; ignoring provided value.")
        return default

    def _parse_bool_env(self, keys: List[str], default: bool) -> bool:
        truthy = {'1', 'true', 'yes', 'on'}
        falsy = {'0', 'false', 'no', 'off'}
        for key in keys:
            value = os.getenv(key)
            if value is None:
                continue
            normalized = value.strip().lower()
            if normalized in truthy:
                return True
            if normalized in falsy:
                return False
            print(f"[WARN] {key} must be boolean; using default {default}.")
        return default

    def _finalize_audio_output(self, output_path: Path) -> str:
        audio_path = str(output_path)
        self.audio_file = audio_path
        try:
            self.audio_url = output_path.resolve().as_uri()
        except Exception:
            self.audio_url = None
        if self.audio_uploader:
            published = self.audio_uploader.publish(output_path)
            if published:
                self.audio_url = published
        print(f"[OK] Audio saved to {output_path}")
        return audio_path

    def _generate_audio_with_elevenlabs(self, script: str, output_path: Path) -> Optional[str]:
        if not self.elevenlabs_api_key or not self.elevenlabs_voice_id:
            return None

        base_url = (self.elevenlabs_base_url or 'https://api.elevenlabs.io').rstrip('/')
        endpoint = f"{base_url}/v1/text-to-speech/{self.elevenlabs_voice_id}"

        voice_settings = {
            'stability': self.elevenlabs_stability,
            'similarity_boost': self.elevenlabs_similarity,
            'use_speaker_boost': self.elevenlabs_speaker_boost,
        }
        if self.elevenlabs_style:
            voice_settings['style'] = self.elevenlabs_style

        payload = {
            'text': script,
            'model_id': self.elevenlabs_model_id,
            'voice_settings': voice_settings,
            'output_format': self.elevenlabs_output_format,
        }
        if self.elevenlabs_latency is not None:
            payload['optimize_streaming_latency'] = self.elevenlabs_latency

        try:
            response = requests.post(
                endpoint,
                headers={
                    'xi-api-key': self.elevenlabs_api_key,
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                },
                json=payload,
                stream=True,
                timeout=60,
            )
            response.raise_for_status()
        except Exception as exc:
            print(f"[ERROR] ElevenLabs TTS request failed: {exc}")
            return None

        try:
            with output_path.open('wb') as handle:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        handle.write(chunk)
        except Exception as exc:
            print(f"[ERROR] ElevenLabs TTS write failed: {exc}")
            return None

        print('[OK] ElevenLabs audio synthesis complete.')
        return self._finalize_audio_output(output_path)

    def create_fallback_script(self, articles: List[Dict]) -> str:
        """Create a fallback script when LLM fails - MUST be under 4096 chars for TTS"""
        date_str = datetime.now().strftime("%B %d, %Y")
        intro_options = [
            f"Welcome to Medical Daily for {date_str}. I'm your AI host bringing you the latest breakthroughs in medicine and healthcare.",
            f"It's {date_str} and you're tuned to Medical Daily. Let's unpack today's biggest developments in medicine and healthcare.",
            f"Good day! {date_str} brings fresh medical insights, and Medical Daily is here to walk you through them."
        ]
        intro = random.choice(intro_options)

        base_transitions = [
            "First up",
            "Next",
            "From the lab",
            "Meanwhile",
            "On a different front",
            "Zooming out",
            "In the clinic",
            "Finally"
        ]
        transitions = random.sample(base_transitions[1:], len(base_transitions) - 1)

        body_segments: list[str] = []
        closing = (
            "That's all for today. Type 'links' for article links or 'details' with a story number for more info. Stay healthy!"
        )
        max_chars = 3500

        def _build_segment_summary(article: Dict) -> str:
            candidate = (
                article.get('detail_summary')
                or article.get('summary')
                or article.get('abstract')
                or article.get('description')
                or ''
            )
            summary = ' '.join(candidate.split())
            if not summary:
                fallback_source = article.get('journal', 'a leading medical journal')
                return f"This update from {fallback_source} highlights an important development to watch."

            max_chars = 600
            if len(summary) > max_chars:
                clipped = summary[:max_chars]
                cutoff = max(clipped.rfind('.'), clipped.rfind('!'), clipped.rfind('?'))
                if cutoff > 0:
                    summary = clipped[:cutoff + 1]
                else:
                    summary = clipped.rstrip() + '...'

            if summary[-1] not in '.!?':
                summary += '.'
            return summary

        for idx, article in enumerate(articles):
            title = article.get('title', 'A new study').strip() or 'A new study'
            title_clean = title.rstrip('.!?')
            summary = _build_segment_summary(article)

            if idx == 0:
                lead_in = 'First up'
            else:
                lead_in = transitions[min(idx - 1, len(transitions) - 1)]
            segment_text = f"{lead_in}, {title_clean}. {summary}".strip()

            tentative_segments = body_segments + [segment_text]
            body_text = '\n\n'.join(tentative_segments)
            candidate = intro + ('\n\n' + body_text if body_text else '') + '\n\n' + closing
            if len(candidate) > max_chars:
                break

            body_segments.append(segment_text)

        parts = [intro]
        if body_segments:
            parts.append('\n\n'.join(body_segments))
        parts.append(closing)

        script = '\n\n'.join(parts)
        script = self._ensure_tts_safe_length(script, articles)
        return script

    def generate_audio(self, script: str, output_file: str = "medical_daily.mp3") -> Optional[str]:
        """Generate audio from script using ElevenLabs, falling back to OpenAI TTS."""
        print("[MUSIC] Generating audio...")
        script = self._ensure_tts_safe_length(script, getattr(self, "articles", None))

        output_path = self.cache_dir / output_file

        if self.elevenlabs_api_key:
            audio_path = self._generate_audio_with_elevenlabs(script, output_path)
            if audio_path:
                return audio_path
            print('[WARN] ElevenLabs TTS failed; falling back to OpenAI.')

        if not self.openai_api_key:
            print('[WARN] No OpenAI API key - skipping audio generation')
            return None

        try:
            import openai
            client = openai.OpenAI(api_key=self.openai_api_key)
            response = client.audio.speech.create(
                model="tts-1",
                voice="nova",
                input=script
            )
            with output_path.open('wb') as handle:
                for chunk in response.iter_bytes():
                    handle.write(chunk)
            return self._finalize_audio_output(output_path)
        except Exception as exc:
            print(f"[ERROR] Error generating audio: {exc}")
            self.audio_file = None
            self.audio_url = None
            return None
    
    def generate_audio_chunked(self, script: str, basename: str = "medical_daily") -> list[str]:
        """Generate multi-part audio for longer shows by chunking text and calling TTS repeatedly."""
        chunks = self._chunk_for_tts(self._ensure_tts_safe_length(script, getattr(self, "articles", None)))
        paths = []
        for i, ch in enumerate(chunks):
            p = self.generate_audio(ch, output_file=f"{basename}_{i:02d}.mp3")
            if p:
                paths.append(p)
        return paths

    def run_daily_digest(self) -> Dict:
        """Main function to run the daily medical digest"""
        print("=" * 50)
        print("[MEDICAL DAILY] MEDICAL DAILY - Generating Today's Digest")
        print("=" * 50)

        now = datetime.now()
        service_date = now.date().isoformat()

        # Fetch content
        pubmed_articles = self.fetch_pubmed_articles(max_results=7)
        preprint_articles = self.fetch_preprint_articles(max_results=self.preprint_max_results)
        fda_approvals = self.fetch_fda_approvals()
        
        # Combine all articles
        all_articles = pubmed_articles + preprint_articles + fda_approvals
        random.shuffle(all_articles)

        if not all_articles:
            print("[ERROR] No articles found. Try again later.")
            return None
        
        # Generate summaries
        all_articles = self.generate_summaries(all_articles)
        
        # Store for later access
        self.articles = all_articles
        
        # Create podcast script
        self.podcast_script = self.create_podcast_script(all_articles)

        # Generate audio
        audio_file = self.generate_audio(
            self.podcast_script,
            output_file=f"medical_daily_{service_date}.mp3"
        )

        # Build landing page if audio is available\n        self.audio_page_url = None\n        # Landing page generation is disabled for the SMS bot integration.\n        # Uncomment the block below if we want to publish HTML again.\n        # landing_path = None\n        # if self.audio_url:\n        #     landing_path = self._build_landing_page(self.audio_url, all_articles)\n        #     if landing_path:\n        #         landing_link = None\n        #         if self.audio_uploader:\n        #             landing_link = self.audio_uploader.publish(landing_path)\n        #         if not landing_link:\n        #             landing_link = landing_path.as_uri()\n        #         self.audio_page_url = landing_link

        # Save metadata
        metadata = {
            'date': now.isoformat(),
            'service_date': service_date,
            'article_count': len(all_articles),
            'articles': all_articles,
            'script': self.podcast_script,
            'audio_file': self.audio_file,
            'audio_url': self.audio_url,
            'audio_page_url': self.audio_page_url
        }

        metadata_file = self.cache_dir / f"digest_{now.strftime('%Y%m%d')}.json"
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print("\n" + "=" * 50)
        print("[OK] MEDICAL DAILY DIGEST COMPLETE!")
        print("=" * 50)
        
        return metadata
    

    def _format_daily_intro(self) -> str:
        """Compose the SMS-style daily intro message."""
        if not self.articles:
            return "No digest available yet. Run the daily digest first."

        today_label = datetime.now().strftime('%m/%d')
        headline = self._condense_headline(self.articles)

        link = self.audio_page_url or self.audio_url
        if link:
            audio_line = f"Hear it here: {link}"
        else:
            audio_line = "Audio link not available yet."

        instructions = "Text 'text' for the full script, 'links' for sources, or 'detail #' for the story you pick."
        return f"Medical Daily {today_label} - {headline}.\n{audio_line}\n{instructions}"

    def handle_message(self, message: str) -> str:
        """Handle user messages/commands"""
        message = message.lower().strip()
        
        if message == "medical daily":
            return self._format_daily_intro()
        if message == "links":
            return self.get_links()
        elif message == "text":
            return self.get_text_version()
        elif message.startswith("detail"):
            # Extract article number if provided
            parts = message.split()
            if len(parts) > 1 and parts[1].isdigit():
                return self.get_details(int(parts[1]) - 1)
            return "Please specify an article number, e.g., 'detail 1'"
        else:
            return "Commands: 'medical daily' (today's intro), 'links', 'text', or 'detail #' for more info the story you want."
    
    def get_links(self) -> str:
        """Return formatted links to all articles"""
        if not self.articles:
            return "No articles available. Run the digest first."
        
        response = "[LINKS] Medical Daily - Article Links:\n\n"
        for i, article in enumerate(self.articles, 1):
            response += f"{i}. {article['title']}\n"
            response += f"   {article.get('url', 'No URL available')}\n\n"
        
        return response
    
    def get_text_version(self) -> str:
        """Return text version of the podcast"""
        if not self.podcast_script:
            return "No podcast script available. Run the digest first."
        
        return f"[TEXT] Medical Daily - Text Version:\n\n{self.podcast_script}"
    
    def get_details(self, index: int) -> str:
        """Get detailed information about a specific article"""
        if not self.articles or index >= len(self.articles):
            return "Article not found."
        
        article = self.articles[index]
        response = f"[DETAILS] Article Details:\n\n"
        response += f"Title: {article['title']}\n\n"
        response += f"Source: {article.get('journal', 'FDA')}\n"
        response += f"Date: {article.get('date', 'Recent')}\n\n"
        detail = article.get('detail_summary') or article.get('summary', '')
        response += f"Summary: {detail}\n\n"
        response += f"Link: {article.get('url', 'Not available')}\n"
        
        return response


def main():
    """Demo usage"""
    print("[MEDICAL DAILY] Medical Daily Agent - Demo Mode\n")
    
    # Initialize agent (will use OPENAI_API_KEY env variable if available)
    agent = MedicalDailyAgent(model="gpt-4o")
    
    print(f"[INFO] Using model: {agent.model}")
    
    # Run daily digest
    result = agent.run_daily_digest()
    
    if result:
        print("\n[SIMULATION] Simulating user interactions:\n")
        
        # Simulate user commands
        print("\nUser: links")
        print(agent.handle_message("links"))
        
        print("\n" + "-" * 50 + "\n")
        print("User: text")
        print(agent.handle_message("text")[:500] + "...")
        
        print("\n" + "-" * 50 + "\n")
        print("User: details 1")
        print(agent.handle_message("details 1"))


if __name__ == "__main__":
    main()

