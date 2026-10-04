from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, Optional

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.ai.copilot import AISafetyCopilot

router = APIRouter(prefix="/api/copilot", tags=["AI Safety Copilot"])

class CopilotQueryRequest(BaseModel):
    query: str

class CopilotQueryResponse(BaseModel):
    query: str
    intent: str
    grounded_summary: str
    data: Any
    citations_count: int

@router.post("/query", response_model=CopilotQueryResponse)
def ask_safety_copilot(
    req: CopilotQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query prompt cannot be empty.")

    copilot = AISafetyCopilot(db=db)
    result = copilot.query(req.query)

    return CopilotQueryResponse(
        query=req.query,
        intent=result.get("intent", "GENERAL_QUERY"),
        grounded_summary=result.get("grounded_summary", "No findings available."),
        data=result.get("data", {}),
        citations_count=result.get("citations_count", 0)
    )
