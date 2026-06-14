from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./xeno_crm.db"
    channel_service_url: str = "http://localhost:8002"
    crm_callback_url: str = "http://localhost:8001/api/receipts"
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    class Config:
        env_file = ".env"


settings = Settings()
