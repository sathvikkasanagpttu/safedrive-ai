from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class OverviewStats(BaseModel):
    total_drivers: int
    active_drivers: int
    total_sessions: int
    total_driving_hours: float
    current_active_sessions: int
    total_safety_events: int
    high_risk_events: int
    average_risk_score: float
    safety_trend_percentage: float  # e.g., +4.2% improved

class RiskTrendPoint(BaseModel):
    timestamp: str
    risk_score: float
    session_id: Optional[str] = None

class EventCategoryCount(BaseModel):
    category: str
    count: int
    percentage: float

class DriverSafetyRank(BaseModel):
    id: int
    driver_code: str
    full_name: str
    safety_score: float
    total_events: int
    rating: str

class AnalyticsOverviewResponse(BaseModel):
    overview: OverviewStats
    event_distribution: List[EventCategoryCount]
    risk_trend: List[RiskTrendPoint]
    driver_rankings: List[DriverSafetyRank]
    drowsiness_trend: List[Dict[str, Any]]
    distraction_trend: List[Dict[str, Any]]
    phone_use_trend: List[Dict[str, Any]]
