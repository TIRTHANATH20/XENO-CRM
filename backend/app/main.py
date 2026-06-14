from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import analytics, campaigns, customers, ingest, receipts, segments, ai
from app.seed import seed_database

Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_database()
    yield

app = FastAPI(
    title="Xeno Mini CRM",
    description="AI-native CRM for reaching shoppers",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router)
app.include_router(segments.router)
app.include_router(campaigns.router)
app.include_router(receipts.router)
app.include_router(analytics.router)
app.include_router(ingest.router)
app.include_router(ai.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "xeno-crm"}
