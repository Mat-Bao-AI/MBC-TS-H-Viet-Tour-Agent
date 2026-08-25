from fastapi import APIRouter

from app.api.v1 import agent, auth, tours, zalo

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(tours.router)
api_router.include_router(agent.router)
api_router.include_router(zalo.router)
