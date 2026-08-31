from fastapi import APIRouter, Depends

from app.api.v1 import agent, auth, dashboard, tours, zalo
from app.core.security import require_api_key

api_router = APIRouter(prefix="/api/v1", dependencies=[Depends(require_api_key)])
api_router.include_router(auth.router)
api_router.include_router(tours.router)
api_router.include_router(agent.router)
api_router.include_router(zalo.router)
api_router.include_router(dashboard.router)
