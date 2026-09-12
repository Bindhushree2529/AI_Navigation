from __future__ import annotations
import httpx
from typing import Optional

# Open-Meteo — free, no API key, uses GPS coords
_BASE = "https://api.open-meteo.com/v1/forecast"

_WMO_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Icy fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    85: "Slight snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail",
}

_HAZARDOUS_CODES = {45, 48, 65, 75, 82, 86, 95, 96, 99}
_RAIN_CODES = {51, 53, 55, 61, 63, 65, 80, 81, 82}
_SNOW_CODES = {71, 73, 75, 77, 85, 86}


async def get_weather(lat: float, lng: float) -> dict:
    params = {
        "latitude": lat,
        "longitude": lng,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,visibility",
        "wind_speed_unit": "kmh",
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(_BASE, params=params)
        res.raise_for_status()
        data = res.json()

    current = data.get("current", {})
    code = current.get("weather_code", 0)
    condition = _WMO_CODES.get(code, "Unknown")
    temp = current.get("temperature_2m")
    wind = current.get("wind_speed_10m")
    humidity = current.get("relative_humidity_2m")
    visibility = current.get("visibility")  # meters

    alerts = _build_alerts(code, wind, visibility)

    return {
        "condition": condition,
        "weatherCode": code,
        "temperatureC": temp,
        "windSpeedKmh": wind,
        "humidityPct": humidity,
        "visibilityM": visibility,
        "isHazardous": code in _HAZARDOUS_CODES,
        "isRaining": code in _RAIN_CODES,
        "isSnowing": code in _SNOW_CODES,
        "alerts": alerts,
        "navigationAdvice": _navigation_advice(code, wind, visibility),
    }


def _build_alerts(code: int, wind: Optional[float], visibility: Optional[float]) -> list:
    alerts = []
    if code in _HAZARDOUS_CODES:
        alerts.append("Hazardous weather conditions detected.")
    if code in _RAIN_CODES:
        alerts.append("Rain detected in your area.")
    if code in _SNOW_CODES:
        alerts.append("Snow detected in your area.")
    if wind and wind > 50:
        alerts.append(f"Strong wind: {wind} km/h.")
    if visibility is not None and visibility < 1000:
        alerts.append(f"Low visibility: {int(visibility)} meters.")
    return alerts


def _navigation_advice(code: int, wind: Optional[float], visibility: Optional[float]) -> str:
    if code in _HAZARDOUS_CODES:
        return "Severe weather conditions. Consider staying indoors if possible."
    if code in _RAIN_CODES:
        return "Rain detected. Use covered routes where available. Walk carefully on wet surfaces."
    if code in _SNOW_CODES:
        return "Snow detected. Walk slowly and use cleared paths."
    if wind and wind > 50:
        return "Strong winds. Hold onto railings and avoid open areas."
    if visibility is not None and visibility < 500:
        return "Very low visibility. Proceed with extra caution."
    return "Weather conditions are suitable for outdoor navigation."
