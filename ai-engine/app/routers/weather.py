from fastapi import APIRouter, HTTPException, Query
from app.pipelines.weather import get_weather

router = APIRouter()


@router.get("/current")
async def current_weather(lat: float = Query(...), lng: float = Query(...)):
    try:
        return await get_weather(lat, lng)
    except Exception as e:
        raise HTTPException(502, f"Weather service unavailable: {e}")


@router.get("/route-advice")
async def route_advice(lat: float = Query(...), lng: float = Query(...)):
    try:
        weather = await get_weather(lat, lng)
        return {
            "condition": weather["condition"],
            "advice": weather["navigationAdvice"],
            "alerts": weather["alerts"],
            "isHazardous": weather["isHazardous"],
        }
    except Exception as e:
        raise HTTPException(502, f"Weather service unavailable: {e}")
