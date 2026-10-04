from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class ReportGenerateRequest(BaseModel):
    session_id: int
    format: Optional[str] = "pdf"  # "pdf" or "json"

class ReportResponse(BaseModel):
    report_id: str
    generated_at: str
    executive_summary: str
    driver_information: Dict[str, Any]
    session_information: Dict[str, Any]
    risk_summary: Dict[str, Any]
    event_summary: Dict[str, Any]
    risk_timeline: List[Dict[str, Any]]
    drowsiness_analysis: Dict[str, Any]
    distraction_analysis: Dict[str, Any]
    phone_usage_analysis: Dict[str, Any]
    recommendations: List[str]
    technical_notes: str
    download_url: Optional[str] = None
