"""
i5 Daily Pipeline

Orchestrates the full flow from ingestion to publishing.
"""

import asyncio
import json
from datetime import datetime
from pathlib import Path

from .ingestion import arxiv_client, hackernews_client, reddit_client, backlog_sampler
from .screening import stage1, stage2
from .selection import daily_picker
from .generation import script_writer, audio_generator
from .publishing import podcast_publisher, twitter_clips


class DailyPipeline:
    """Main orchestrator for daily podcast generation."""

    def __init__(self, config_path: str = "config/settings.yaml", skip_review: bool = False):
        self.config = self._load_config(config_path)
        self.date = datetime.now().strftime("%Y-%m-%d")
        self.skip_review = skip_review

    def _load_config(self, path: str) -> dict:
        import yaml
        config_file = Path(__file__).parent.parent / path
        with open(config_file) as f:
            return yaml.safe_load(f)

    async def run(self) -> dict:
        """Execute full daily pipeline."""

        print(f"[{self.date}] Starting daily pipeline...")

        # 1. Ingest from all sources
        print("[1/7] Ingesting papers...")
        papers = await self._ingest_all()
        print(f"       Found {len(papers)} papers")

        if len(papers) == 0:
            print("       ERROR: No papers found. Check ingestion sources.")
            return {
                'status': 'error',
                'date': self.date,
                'error': 'No papers found from any source'
            }

        # 2. Stage 1 screening
        print("[2/7] Stage 1: Guillotine...")
        stage1_survivors = await stage1.screen(papers, self.config.get('screening', {}))
        print(f"       {len(stage1_survivors)} survivors ({len(stage1_survivors)/max(len(papers),1)*100:.1f}%)")

        if len(stage1_survivors) == 0:
            print("       WARNING: No papers passed Stage 1. Using top papers by source engagement.")
            # Fallback: use top papers by source engagement
            stage1_survivors = sorted(papers, key=lambda p: p.get('metadata', {}).get('hn_score', 0) + p.get('metadata', {}).get('reddit_score', 0), reverse=True)[:20]
            for p in stage1_survivors:
                p['stage1_passed'] = True
                p['stage1_tags'] = ['fallback']
                p['stage1_reason'] = 'Top engagement fallback'

        # 3. Stage 2 screening
        print("[3/7] Stage 2: Sniff Test...")
        stage2_survivors = await stage2.screen(stage1_survivors, self.config.get('screening', {}))
        print(f"       {len(stage2_survivors)} survivors")

        if len(stage2_survivors) == 0:
            print("       WARNING: No papers passed Stage 2. Using Stage 1 survivors.")
            stage2_survivors = stage1_survivors[:8]
            for p in stage2_survivors:
                p['stage2_passed'] = True
                p['score'] = 50

        # 4. Select top 4
        print("[4/7] Selecting top 4...")
        picks, backups = daily_picker.select(stage2_survivors, self.config)
        print(f"       Picks: {[p['title'][:50] for p in picks]}")

        if len(picks) == 0:
            print("       ERROR: No picks selected.")
            return {
                'status': 'error',
                'date': self.date,
                'error': 'No picks could be selected'
            }

        # 5. Generate script
        print("[5/7] Generating script...")
        script = await script_writer.generate(picks, self.date, self.config.get('generation', {}))

        # Prepare output directory
        output_dir = Path(__file__).parent.parent / "data" / "output" / self.date
        output_dir.mkdir(parents=True, exist_ok=True)

        # Save script as markdown
        script_path = output_dir / "script.md"
        with open(script_path, 'w') as f:
            f.write(self._build_report_markdown(script, picks))

        if self.skip_review:
            # Auto-approve
            print("[6/7] Skipping review (--skip-review)")
            final_script = script
        else:
            # 6. Save for human review
            print("[6/7] Awaiting human review...")
            review_result = await self._human_review(picks, script, backups)

            if not review_result['approved']:
                print("       Episode not approved. Exiting.")
                return {'status': 'not_approved', 'date': self.date}

            final_script = review_result.get('revised_script', script)

        # 7. Generate audio
        print("[7/7] Generating audio...")
        audio_path = await audio_generator.generate(final_script, self.config.get('audio', {}))

        # Move/copy audio to output dir
        if audio_path:
            import shutil
            final_audio_path = output_dir / "episode.mp3"
            shutil.copy(audio_path, final_audio_path)
            audio_path = final_audio_path
            print(f"       Audio saved to: {audio_path}")

        # Skip external publishing for SMS mode
        if not self.skip_review:
            await podcast_publisher.publish(audio_path, picks, self.date, self.config)
            await twitter_clips.generate_and_post(audio_path, picks, self.config)

        print(f"[{self.date}] Pipeline complete!")

        result = {
            'status': 'success',
            'date': self.date,
            'papers_ingested': len(papers),
            'stage1_survivors': len(stage1_survivors),
            'stage2_survivors': len(stage2_survivors),
            'picks': [p['title'] for p in picks],
            'script_path': str(script_path),
            'audio_path': str(audio_path) if audio_path else None,
        }

        # Output JSON result for TypeScript orchestrator to parse
        print(json.dumps(result))

        return result

    def _build_report_markdown(self, script: str, picks: list) -> str:
        """Build full report markdown with script and picks."""
        lines = [
            f"# Tokenshots - {self.date}",
            "",
            "## Today's Highlights",
            "",
        ]

        for i, pick in enumerate(picks, 1):
            title = pick.get('title', 'Unknown')
            url = pick.get('url', '')
            lines.append(f"**{i}. {title}**")
            if url:
                lines.append(f"[Read more]({url})")
            lines.append("")

        lines.extend([
            "---",
            "",
            "## Episode Script",
            "",
            script,
        ])

        return "\n".join(lines)

    async def _ingest_all(self) -> list:
        """Ingest from all configured sources."""
        papers = []

        # Build ingestion config in the format clients expect
        ingestion_config = {'sources': self.config.get('sources', {})}

        sources = self.config.get('sources', {})

        if sources.get('arxiv', {}).get('enabled', True):
            try:
                arxiv_papers = await arxiv_client.fetch_daily(ingestion_config)
                papers.extend(arxiv_papers)
                print(f"       [arxiv] {len(arxiv_papers)} papers")
            except Exception as e:
                print(f"       [arxiv] Error: {e}")

        if sources.get('hackernews', {}).get('enabled', True):
            try:
                hn_papers = await hackernews_client.fetch_trending(ingestion_config)
                papers.extend(hn_papers)
                print(f"       [hackernews] {len(hn_papers)} papers")
            except Exception as e:
                print(f"       [hackernews] Error: {e}")

        if sources.get('reddit', {}).get('enabled', True):
            try:
                reddit_papers = await reddit_client.fetch_top(ingestion_config)
                papers.extend(reddit_papers)
                print(f"       [reddit] {len(reddit_papers)} papers")
            except Exception as e:
                print(f"       [reddit] Error: {e}")

        if sources.get('backlog', {}).get('enabled', False):
            try:
                backlog_papers = await backlog_sampler.sample(self.config)
                papers.extend(backlog_papers)
                print(f"       [backlog] {len(backlog_papers)} papers")
            except Exception as e:
                print(f"       [backlog] Error: {e}")

        # Dedupe by paper ID
        seen = set()
        unique = []
        for p in papers:
            if p['id'] not in seen:
                seen.add(p['id'])
                unique.append(p)

        return unique

    async def _human_review(self, picks: list, script: str, backups: list) -> dict:
        """
        Present picks for human review.

        In MVP, this writes to a file and waits for approval.
        Later: Slack bot, web UI, etc.
        """
        review_dir = Path(f"data/review/{self.date}")
        review_dir.mkdir(parents=True, exist_ok=True)

        # Write review materials
        with open(review_dir / "picks.md", "w") as f:
            f.write(f"# Episode Review - {self.date}\n\n")
            f.write("## Today's Picks\n\n")
            for i, p in enumerate(picks, 1):
                f.write(f"### {i}. {p['title']}\n")
                f.write(f"- Score: {p['score']}\n")
                f.write(f"- Desperate user: {p.get('desperate_user', 'TBD')}\n")
                f.write(f"- Obvious business: {p.get('obvious_business', 'TBD')}\n\n")

            f.write("## Backups\n\n")
            for i, p in enumerate(backups, 1):
                f.write(f"{i}. {p['title']} (score: {p['score']})\n")

        with open(review_dir / "script.md", "w") as f:
            f.write(script)

        # Write approval file (human edits this)
        approval_file = review_dir / "approval.txt"
        with open(approval_file, "w") as f:
            f.write("PENDING\n")
            f.write("# Change to APPROVED to publish\n")
            f.write("# Change to SWAP:1:3 to swap pick 1 with backup 3\n")
            f.write("# Change to REJECTED to skip today\n")

        print(f"       Review materials in: {review_dir}")
        print(f"       Edit {approval_file} to approve")

        # Wait for approval (poll file)
        timeout = self.config['review']['timeout_hours'] * 3600
        start = asyncio.get_event_loop().time()

        while True:
            with open(approval_file) as f:
                status = f.readline().strip()

            if status == "APPROVED":
                return {'approved': True}
            elif status == "REJECTED":
                return {'approved': False}
            elif status.startswith("SWAP:"):
                # Handle swap logic
                pass

            if asyncio.get_event_loop().time() - start > timeout:
                if self.config['review']['auto_publish_on_timeout']:
                    return {'approved': True}
                return {'approved': False}

            await asyncio.sleep(30)


async def main():
    pipeline = DailyPipeline()
    result = await pipeline.run()
    print(result)


if __name__ == "__main__":
    asyncio.run(main())
