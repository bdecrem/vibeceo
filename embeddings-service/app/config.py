from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    # Model settings
    model_name: str = "all-MiniLM-L6-v2"
    embedding_dimension: int = 384
    max_batch_size: int = 32

    # API settings
    api_port: int = 8000
    api_key: Optional[str] = None
    
    # Rate limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 3600  # in seconds

    class Config:
        env_file = ".env.local"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings() 