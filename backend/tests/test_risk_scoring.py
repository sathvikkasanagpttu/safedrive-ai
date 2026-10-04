import pytest
from app.ai.risk_engine import RiskEngine

def test_risk_baseline_low():
    engine = RiskEngine()
    score, category, contributors = engine.calculate_risk(
        eye_closure_severity=0.0,
        head_distraction_severity=0.0,
        phone_usage_severity=0.0,
        yawn_severity=0.0,
        is_unknown_driver=False
    )
    assert score == 0.0
    assert category == "low"
    assert len(contributors) == 0

def test_risk_moderate_threshold():
    engine = RiskEngine()
    score, category, contributors = engine.calculate_risk(
        eye_closure_severity=0.0,
        head_distraction_severity=0.8,  # 0.8 * 0.25 * 100 = 20
        phone_usage_severity=0.6,       # 0.6 * 0.20 * 100 = 12 -> total ~ 32
        yawn_severity=0.0,
        is_unknown_driver=False
    )
    assert 30 < score <= 60
    assert category == "moderate"
    assert len(contributors) >= 2

def test_risk_critical_compounding():
    engine = RiskEngine()
    # Simultaneous critical hazards: severe eye closure + phone usage
    score, category, contributors = engine.calculate_risk(
        eye_closure_severity=1.0,
        head_distraction_severity=0.7,
        phone_usage_severity=1.0,
        yawn_severity=0.5,
        is_unknown_driver=False
    )
    assert score > 80.0
    assert category == "critical"
    # Verify contributor structure
    for c in contributors:
        assert "type" in c
        assert "weight" in c
        assert "contribution_points" in c

def test_unknown_driver_penalty():
    engine = RiskEngine()
    score, category, contributors = engine.calculate_risk(
        eye_closure_severity=0.0,
        head_distraction_severity=0.0,
        phone_usage_severity=0.0,
        yawn_severity=0.0,
        is_unknown_driver=True
    )
    assert score > 0.0
    types = [c["type"] for c in contributors]
    assert "unknown_driver" in types
