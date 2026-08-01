from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import close_client
from app.mcp_server import mcp
from app.routes import router
from app.seed import ensure_seed

mcp_app = mcp.http_app(path="/")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run the MCP session manager lifespan alongside our own startup/shutdown.
    async with mcp_app.lifespan(app):
        await ensure_seed()
        yield
        await close_client()


app = FastAPI(
    title="Gant API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.mount("/mcp", mcp_app)


@app.get("/")
async def root() -> dict:
    return {"service": "gant", "docs": "/docs", "mcp": "/mcp"}
