"""
Ingestion modules for fetching papers from various sources.
"""

from . import arxiv_client
from . import hackernews_client
from . import reddit_client
from . import backlog_sampler

__all__ = [
    "arxiv_client",
    "hackernews_client",
    "reddit_client",
    "backlog_sampler",
]
