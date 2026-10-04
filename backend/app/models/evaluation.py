from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class EvaluationDataset(Base):
    __tablename__ = "evaluation_datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    task_type = Column(String(50), nullable=False) # FACE_RECOGNITION, DROWSINESS_DETECTION, OBJECT_DETECTION, HEAD_POSE
    version = Column(String(50), nullable=False)
    sample_count = Column(Integer, default=0)
    split = Column(String(50), default="BENCHMARK") # TEST, VALIDATION, BENCHMARK
    source = Column(String(255), nullable=True)
    license = Column(String(100), default="Research / Evaluation")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    runs = relationship("EvaluationRun", back_populates="dataset", cascade="all, delete-orphan")


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("evaluation_datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    model_name = Column(String(100), nullable=False, index=True)
    model_version = Column(String(50), nullable=False)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    accuracy = Column(Float, nullable=True)
    roc_auc = Column(Float, nullable=True)
    confusion_matrix = Column(JSON, default=dict)
    false_positive_rate = Column(Float, nullable=True)
    false_negative_rate = Column(Float, nullable=True)
    latency_ms = Column(Float, nullable=True)
    threshold_used = Column(Float, default=0.5)
    status = Column(String(50), default="NOT_EVALUATED") # COMPLETED, RUNNING, NOT_EVALUATED
    hardware = Column(String(100), default="Apple Silicon Metal / CPU")
    evaluated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    dataset = relationship("EvaluationDataset", back_populates="runs")
