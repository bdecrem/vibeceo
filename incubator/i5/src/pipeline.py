"""
i5 Daily Pipeline

Orchestrates the full flow from ingestion to publishing.
"""

import asyncio
from datetime import datetime
from pathlib import Path

from .ingestion import arxiv_client, hackernews_client, reddit_client, backlog_sampler
from .screening import stage1, stage2
from .selection import daily_picker
from .generation import script_writer, audio_generator
from .publishing import podcast_publisher, twitter_clips


class DailyPipeline:
    """Main orchestrator for daily podcast generation."""

    def __init__(self, config_path: str = "config/settings.yaml"):
        self.config = self._load_config(config_path)
        self.date = datetime.now().strftime("%Y-%m-%d")

    def _load_config(self, path: str) -> dict:
        import yaml
        with open(path) as f:
            return yaml.safe_load(f)

    async def run(self) -> dict:
        """Execute full daily pipeline."""

        print(f"[{self.date}] Starting daily pipeline...")

        # 1. Ingest from all sources
        print("[1/7] Ingesting papers...")
        papers = await self._ingest_all()
        print(f"       Found {len(papers)} papers")

        # 2. Stage 1 screening
        print("[2/7] Stage 1: Guillotine...")
        stage1_survivors = await stage1.screen(papers, self.config)
        print(f"       {len(stage1_survivors)} survivors ({len(stage1_survivors)/max(len(papers),1)*100:.1f}%)")

        # 3. Stage 2 screening
        print("[3/7] Stage 2: Sniff Test...")
        stage2_survivors = await stage2.screen(stage1_survivors, self.config)
        print(f"       {len(stage2_survivors)} survivors")

        # 4. Select top 4
        print("[4/7] Selecting top 4...")
        picks, backups = daily_picker.select(stage2_survivors, self.config)
        print(f"       Picks: {[p['title'][:50] for p in picks]}")

        # 5. Generate script
        print("[5/7] Generating script...")
        script = await script_writer.generate(picks, self.date, self.config)

        # 6. Save for human review
        print("[6/7] Awaiting human review...")
        review_result = await self._human_review(picks, script, backups)

        if not review_result['approved']:
            print("       Episode not approved. Exiting.")
            return {'status': 'not_approved'}

        final_script = review_result.get('revised_script', script)

        # 7. Generate audio and publish
        print("[7/7] Generating audio and publishing...")
        audio_path = await audio_generator.generate(final_script, self.config)

        await podcast_publisher.publish(audio_path, picks, self.date, self.config)
        await twitter_clips.generate_and_post(audio_path, picks, self.config)

        print(f"[{self.date}] Pipeline complete!")

        return {
            'status': 'published',
            'papers_ingested': len(papers),
            'stage1_survivors': len(stage1_survivors),
            'stage2_survivors': len(stage2_survivors),
            'picks': [p['title'] for p in picks]
        }

    async def _ingest_all(self) -> list:
        """Ingest from all configured sources."""
        papers = []

        if self.config['sources']['arxiv']['enabled']:
            papers.extend(await arxiv_client.fetch_daily(self.config))

        if self.config['sources']['hackernews']['enabled']:
            papers.extend(await hackernews_client.fetch_trending(self.config))

        if self.config['sources']['reddit']['enabled']:
            papers.extend(await reddit_client.fetch_top(self.config))

        if self.config['sources']['backlog']['enabled']:
            papers.extend(await backlog_sampler.sample(self.config))

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
