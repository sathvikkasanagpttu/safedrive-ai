from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.session import DrivingSession
from app.models.user import User
from app.schemas.report import ReportGenerateRequest, ReportResponse
from app.api.deps import get_current_user
from app.services.report_service import ReportService
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.post("/generate", response_model=ReportResponse)
def generate_report(
    req: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        report_dict = ReportService.generate_report_data(db, req.session_id)
        report_dict["download_url"] = f"/api/reports/{req.session_id}/pdf"
        log_audit_event(db, current_user.id, "GENERATE_REPORT", "reports", str(req.session_id))
        return report_dict
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Report generation error: {str(e)}")

@router.get("/{session_id}", response_model=ReportResponse)
def get_report(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        report_dict = ReportService.generate_report_data(db, session_id)
        report_dict["download_url"] = f"/api/reports/{session_id}/pdf"
        return report_dict
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get("/{session_id}/pdf")
def download_pdf_report(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        pdf_bytes = ReportService.generate_pdf_report(db, session_id)
        filename = f"SafeDrive_Safety_Report_Session_{session_id}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"PDF generation error: {str(e)}")
