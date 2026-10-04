import io
import os
from datetime import datetime
from typing import Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from sqlalchemy.orm import Session

from app.models.session import DrivingSession
from app.models.driver import Driver
from app.models.event import DetectionEvent, EventType
from app.models.risk import RiskScore

class ReportService:
    @staticmethod
    def generate_report_data(db: Session, session_id: int) -> Dict[str, Any]:
        driving_session = db.query(DrivingSession).filter(DrivingSession.id == session_id).first()
        if not driving_session:
            raise ValueError(f"Session with ID {session_id} not found.")

        driver = db.query(Driver).filter(Driver.id == driving_session.driver_id).first()
        events = db.query(DetectionEvent).filter(DetectionEvent.session_id == session_id).all()
        risk_records = db.query(RiskScore).filter(RiskScore.session_id == session_id).order_by(RiskScore.timestamp.asc()).all()

        # Group events
        drowsiness_events = [e for e in events if e.event_type in (EventType.DROWSINESS, EventType.PROLONGED_EYE_CLOSURE)]
        distraction_events = [e for e in events if e.event_type == EventType.HEAD_DISTRACTION]
        phone_events = [e for e in events if e.event_type == EventType.PHONE_USAGE]
        yawn_events = [e for e in events if e.event_type == EventType.YAWNING]
        unknown_events = [e for e in events if e.event_type == EventType.UNKNOWN_DRIVER]

        driver_info = {
            "name": driver.full_name if driver else "Unknown Driver",
            "driver_code": driver.driver_code if driver else "N/A",
            "license_number": driver.license_number if driver else "N/A",
            "safety_score": driver.safety_score if driver else 0.0,
            "status": driver.status if driver else "N/A",
        }

        duration_mins = round(driving_session.duration_seconds / 60.0, 1)
        session_info = {
            "session_id": driving_session.session_id,
            "start_time": driving_session.start_time.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "end_time": driving_session.end_time.strftime("%Y-%m-%d %H:%M:%S UTC") if driving_session.end_time else "In Progress",
            "duration_minutes": duration_mins,
            "status": driving_session.status,
            "safety_rating": driving_session.safety_rating,
        }

        risk_summary = {
            "average_risk_score": driving_session.avg_risk_score,
            "maximum_risk_score": driving_session.max_risk_score,
            "total_events": driving_session.total_events,
            "high_risk_events": driving_session.high_risk_events,
            "risk_band": "CRITICAL" if driving_session.max_risk_score > 80 else ("HIGH" if driving_session.max_risk_score > 60 else "MODERATE")
        }

        event_summary = {
            "drowsiness_count": len(drowsiness_events),
            "distraction_count": len(distraction_events),
            "phone_usage_count": len(phone_events),
            "yawning_count": len(yawn_events),
            "unknown_driver_count": len(unknown_events),
        }

        # Recommendations based on telemetry
        recs = []
        if len(drowsiness_events) > 0 or len(yawn_events) > 2:
            recs.append("Mandatory rest break: Frequency of prolonged eye closure and yawning suggests severe circadian fatigue.")
        if len(phone_events) > 0:
            recs.append("Fleet policy reminder: In-cab handheld phone detection detected. Deploy vehicle phone docking station.")
        if len(distraction_events) > 4:
            recs.append("Forward-gaze coaching: Frequent head turns away from roadway (>2.0s duration) require spatial attention review.")
        if not recs:
            recs.append("Maintain current driving standard. All safety parameters remained within optimal thresholds.")

        return {
            "report_id": f"REP-{driving_session.session_id}",
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "executive_summary": (
                f"Fleet safety evaluation for driver {driver_info['name']} across {duration_mins} minutes of operation. "
                f"Session sustained an average risk index of {driving_session.avg_risk_score}/100 and peaked at {driving_session.max_risk_score}/100. "
                f"A total of {driving_session.total_events} safety anomalies were logged ({driving_session.high_risk_events} high severity)."
            ),
            "driver_information": driver_info,
            "session_information": session_info,
            "risk_summary": risk_summary,
            "event_summary": event_summary,
            "risk_timeline": [
                {"timestamp": r.timestamp.strftime("%H:%M:%S"), "risk_score": r.overall_risk, "category": r.category}
                for r in risk_records[:25]
            ],
            "drowsiness_analysis": {
                "total_events": len(drowsiness_events),
                "max_closure_duration": max([e.duration_seconds for e in drowsiness_events], default=0.0),
                "assessment": "Critical Fatigue Indication" if len(drowsiness_events) >= 2 else "Nominal Alertness"
            },
            "distraction_analysis": {
                "total_events": len(distraction_events),
                "directions_observed": list(set([e.details.get("direction", "UNKNOWN") for e in distraction_events if e.details])),
                "assessment": "Elevated Distraction Risk" if len(distraction_events) >= 5 else "Normal Road Attention"
            },
            "phone_usage_analysis": {
                "total_events": len(phone_events),
                "max_interaction_duration": max([e.duration_seconds for e in phone_events], default=0.0),
                "assessment": "Severe Policy Violation" if len(phone_events) > 0 else "Compliant Hand Placement"
            },
            "recommendations": recs,
            "technical_notes": (
                "SafeDrive AI research prototype analysis. Risk scores and event classifications "
                "are derived from multi-signal computer vision telemetry (EAR, MAR, 3D Pose PnP, YOLO object bounding). "
                "This report constitutes an engineering diagnostic assessment and is not certified as an automotive functional safety compliance standard (ISO 26262)."
            ),
        }

    @classmethod
    def generate_pdf_report(cls, db: Session, session_id: int) -> bytes:
        data = cls.generate_report_data(db, session_id)
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        primary_color = colors.HexColor("#0f172a")  # Slate 900
        accent_color = colors.HexColor("#2563eb")   # Blue 600
        muted_color = colors.HexColor("#64748b")    # Slate 500

        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=primary_color,
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=muted_color,
            spaceAfter=12
        )
        section_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=13,
            leading=17,
            textColor=accent_color,
            spaceBefore=10,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'BodyText',
            parent=styles['Normal'],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=6
        )

        elements = []

        # Header Banner
        elements.append(Paragraph("SAFEDRIVE AI — DRIVING SAFETY AUDIT REPORT", title_style))
        elements.append(Paragraph(f"Report ID: {data['report_id']} | Generated: {data['generated_at']}", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=10))

        # Executive Summary
        elements.append(Paragraph("1. Executive Summary", section_style))
        elements.append(Paragraph(data["executive_summary"], body_style))
        elements.append(Spacer(1, 6))

        # Driver & Session Information Table
        elements.append(Paragraph("2. Driver & Session Profile", section_style))
        d_info = data["driver_information"]
        s_info = data["session_information"]
        r_info = data["risk_summary"]

        table_data = [
            ["Driver Name:", d_info["name"], "Session ID:", s_info["session_id"]],
            ["Driver Code:", d_info["driver_code"], "Duration:", f"{s_info['duration_minutes']} min"],
            ["License No:", d_info["license_number"], "Safety Rating:", s_info["safety_rating"]],
            ["Avg Risk Score:", f"{r_info['average_risk_score']} / 100", "Peak Risk Score:", f"{r_info['maximum_risk_score']} / 100"],
            ["Total Events:", str(r_info["total_events"]), "High-Risk Events:", str(r_info["high_risk_events"])],
        ]
        t = Table(table_data, colWidths=[110, 160, 110, 160])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor("#0f172a")),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 10))

        # Event Telemetry Breakdown
        elements.append(Paragraph("3. Event Telemetry Breakdown", section_style))
        ev_sum = data["event_summary"]
        event_table_data = [
            ["Event Category", "Incident Count", "Severity Assessment", "Telemetry Trigger"],
            ["Drowsiness / Microsleep", str(ev_sum["drowsiness_count"]), data["drowsiness_analysis"]["assessment"], "EAR < 0.22 with temporal persistence > 1.5s"],
            ["Head Distraction", str(ev_sum["distraction_count"]), data["distraction_analysis"]["assessment"], "3D Pose Yaw/Pitch deflection > 25° for > 1.0s"],
            ["Handheld Phone Interaction", str(ev_sum["phone_usage_count"]), data["phone_usage_analysis"]["assessment"], "YOLO phone bbox in driver hand/face zone"],
            ["Yawning Episodes", str(ev_sum["yawning_count"]), "Fatigue Symptom", "MAR > 0.58 with > 2.0s expansion"],
            ["Unknown Driver Flag", str(ev_sum["unknown_driver_count"]), "Security Audit", "Biometric face embedding cosine match < 0.65"],
        ]
        ev_t = Table(event_table_data, colWidths=[140, 75, 140, 185])
        ev_t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ]))
        elements.append(ev_t)
        elements.append(Spacer(1, 10))

        # Recommendations
        elements.append(Paragraph("4. Safety Recommendations", section_style))
        for idx, rec in enumerate(data["recommendations"], 1):
            elements.append(Paragraph(f"• <b>Recommendation {idx}:</b> {rec}", body_style))
        elements.append(Spacer(1, 8))

        # Technical Notes & Compliance Disclaimer
        elements.append(Paragraph("5. Technical Notes & Legal Disclaimer", section_style))
        elements.append(Paragraph(data["technical_notes"], ParagraphStyle(
            'Disclaimer', parent=body_style, fontSize=7.5, leading=10, textColor=muted_color
        )))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
