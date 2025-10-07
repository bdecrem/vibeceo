import argparse
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from medical_daily_agent import MedicalDailyAgent


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Run the Medical Daily agent and emit report metadata.'
    )
    parser.add_argument(
        '--output-dir',
        required=True,
        help='Directory where markdown and metadata files will be written.'
    )
    parser.add_argument(
        '--cache-dir',
        help='Directory used for cached assets (defaults to <output-dir>/cache).'
    )
    parser.add_argument(
        '--date',
        help='Override ISO date (YYYY-MM-DD) used for filenames.'
    )
    parser.add_argument(
        '--model',
        default=os.getenv('MEDICAL_DAILY_MODEL', 'gpt-4o'),
        help='Override the LLM model used for summarisation.'
    )
    parser.add_argument(
        '--max-age-days',
        type=int,
        help='Override PubMed recency filter (max age in days).'
    )
    parser.add_argument(
        '--search-window-days',
        type=int,
        help='Override PubMed search window size.'
    )
    return parser.parse_args()


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def clip_text(text: str, limit: int = 320) -> str:
    compact = ' '.join(text.split())
    if len(compact) <= limit:
        return compact

    truncated = compact[:limit]
    if '.' in truncated:
        truncated = truncated.rsplit('.', 1)[0].strip()
        if truncated:
            return truncated + '.'

    return truncated.rstrip() + '...'


def extract_summary(articles: Iterable[Dict[str, Any]]) -> str:
    for article in articles:
        if not isinstance(article, dict):
            continue
        for key in ('podcast_summary', 'detail_summary', 'summary', 'description'):
            value = article.get(key)
            if isinstance(value, str) and value.strip():
                return clip_text(value.strip())
    return ''


def build_markdown(date_label: str, metadata: Dict[str, Any]) -> str:
    lines: List[str] = []
    articles: List[Dict[str, Any]] = list(metadata.get('articles') or [])

    lines.append('# Medical Daily Briefing')
    lines.append(f'**Date:** {date_label}')

    generated = metadata.get('date')
    if isinstance(generated, str) and generated.strip():
        lines.append(f'**Generated:** {generated.strip()}')

    story_count = len(articles)
    lines.append(f'**Stories:** {story_count}')

    audio_link = metadata.get('audio_page_url') or metadata.get('audio_url')
    if audio_link:
        lines.append(f'**Listen:** {audio_link}')

    lines.append('')
    lines.append('---')
    lines.append('')

    summary = extract_summary(articles)
    if summary:
        lines.append('## Executive Summary')
        lines.append('')
        lines.append(summary)
        lines.append('')
        lines.append('---')
        lines.append('')

    for index, article in enumerate(articles, start=1):
        title = article.get('title') or f'Story {index}'
        lines.append(f'## Story {index}: {title}')

        journal = article.get('journal') or article.get('source')
        if journal:
            lines.append(f'**Source:** {journal}')

        published = article.get('date')
        if published:
            lines.append(f'**Date:** {published}')

        link = article.get('url')
        if link:
            lines.append(f'**Link:** {link}')

        detail = (
            article.get('detail_summary')
            or article.get('podcast_summary')
            or article.get('summary')
            or ''
        )
        if isinstance(detail, str) and detail.strip():
            lines.append('')
            lines.append(detail.strip())

        lines.append('')
        lines.append('---')
        lines.append('')

    script_text = metadata.get('script')
    if isinstance(script_text, str) and script_text.strip():
        lines.append('## Full Script')
        lines.append('')
        lines.append(script_text.strip())
        lines.append('')

    # Remove trailing separators
    while lines and lines[-1] == '':
        lines.pop()
    if lines and lines[-1] == '---':
        lines.pop()

    return '\n'.join(lines) + '\n'


def parse_override_date(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    try:
        parsed = datetime.strptime(value, '%Y-%m-%d').date()
    except ValueError:
        return None
    return parsed.isoformat()


def derive_iso_date(raw_date: Any) -> Optional[str]:
    if isinstance(raw_date, str):
        try:
            return datetime.fromisoformat(raw_date).date().isoformat()
        except ValueError:
            pass
    return None


def main() -> int:
    args = parse_args()

    output_dir = ensure_directory(Path(args.output_dir).expanduser().resolve())

    cache_dir = Path(args.cache_dir).expanduser().resolve() if args.cache_dir else output_dir / 'cache'
    ensure_directory(cache_dir)

    if 'PUBLIC_AUDIO_TARGET_DIR' not in os.environ:
        os.environ['PUBLIC_AUDIO_TARGET_DIR'] = str(cache_dir / 'public_audio')

    agent = MedicalDailyAgent(
        model=args.model,
        pubmed_max_age_days=args.max_age_days,
        pubmed_search_window_days=args.search_window_days,
    )
    agent.cache_dir = cache_dir
    agent.cache_dir.mkdir(exist_ok=True)

    try:
        metadata = agent.run_daily_digest()
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({'status': 'error', 'error': str(exc)}))
        return 1

    if not isinstance(metadata, dict):
        print(json.dumps({'status': 'error', 'error': 'no_metadata'}))
        return 2

    articles: List[Dict[str, Any]] = list(metadata.get('articles') or [])

    iso_date = derive_iso_date(metadata.get('date'))
    override_date = parse_override_date(args.date)
    final_date = override_date or iso_date or datetime.now().date().isoformat()

    try:
        pretty_date = datetime.strptime(final_date, '%Y-%m-%d').strftime('%B %d, %Y')
    except ValueError:
        pretty_date = final_date

    headline = ''
    if hasattr(agent, '_condense_headline'):
        try:
            headline = agent._condense_headline(articles) or ''  # type: ignore[attr-defined]
        except Exception:
            headline = ''

    daily_intro = ''
    if hasattr(agent, '_format_daily_intro'):
        try:
            daily_intro = agent._format_daily_intro() or ''  # type: ignore[attr-defined]
        except Exception:
            daily_intro = ''

    summary = extract_summary(articles)

    markdown = build_markdown(pretty_date, metadata)
    report_path = output_dir / f'medical_daily_{final_date}.md'
    report_path.write_text(markdown, encoding='utf-8')

    details_payload: Dict[str, Any] = {
        'date': metadata.get('date'),
        'service_date': final_date,
        'headline': headline,
        'summary': summary,
        'daily_intro': daily_intro,
        'audio_url': metadata.get('audio_url'),
        'audio_page_url': metadata.get('audio_page_url'),
        'article_count': len(articles),
        'articles': articles,
        'script': metadata.get('script'),
    }

    details_path = output_dir / f'medical_daily_{final_date}.json'
    details_path.write_text(
        json.dumps(details_payload, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )

    result_payload = {
        'status': 'success',
        'output_file': str(report_path),
        'details_file': str(details_path),
        'date': final_date,
        'summary': summary,
        'headline': headline,
        'daily_intro': daily_intro,
        'audio_url': metadata.get('audio_url'),
        'audio_page_url': metadata.get('audio_page_url'),
        'article_count': len(articles),
    }

    print(json.dumps(result_payload))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
