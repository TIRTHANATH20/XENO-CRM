from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    crm_api_url: str = "http://localhost:8001"
    groq_api_key: str = ""
    temperature: float = 0

    class Config:
        env_file = os.path.join(os.path.dirname(__file__), ".env")
        extra = "ignore"


settings = Settings()
