from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    delivery_success_rate: float = 0.92
    open_rate: float = 0.55
    read_rate: float = 0.40
    click_rate: float = 0.18
    conversion_rate: float = 0.08
    min_delay_seconds: float = 0.5
    max_delay_seconds: float = 3.0

    class Config:
        env_file = ".env"


settings = Settings()
