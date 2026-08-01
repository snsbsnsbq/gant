from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongo_url: str = "mongodb://mongo:27017"
    mongo_db: str = "gant"

    openrouter_api_key: str = ""
    openrouter_model: str = "moonshotai/kimi-k3"

    cors_origins: str = "*"


settings = Settings()
