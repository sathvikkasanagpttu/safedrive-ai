from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class EventGraphNode(Base):
    __tablename__ = "event_graph_nodes"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("detection_events.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("driving_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    node_type = Column(String(100), nullable=False) # e.g. PHONE_USAGE, HEAD_DISTRACTION, HIGH_RISK, DROWSINESS
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    severity = Column(String(50), default="info", nullable=False) # info, warning, high, critical
    confidence = Column(Float, default=1.0)
    metadata_json = Column(JSON, default=dict)

    event = relationship("DetectionEvent", backref="graph_node")
    session = relationship("DrivingSession", backref="graph_nodes")
    outgoing_edges = relationship("EventGraphEdge", foreign_keys="EventGraphEdge.source_node_id", back_populates="source_node", cascade="all, delete-orphan")
    incoming_edges = relationship("EventGraphEdge", foreign_keys="EventGraphEdge.target_node_id", back_populates="target_node", cascade="all, delete-orphan")


class EventGraphEdge(Base):
    __tablename__ = "event_graph_edges"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("driving_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    source_node_id = Column(Integer, ForeignKey("event_graph_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    target_node_id = Column(Integer, ForeignKey("event_graph_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    relation_type = Column("relationship", String(50), nullable=False) # PRECEDED, CONTRIBUTED_TO, CO_OCCURRED, ESCALATED, RECOVERED_AFTER
    confidence = Column(Float, default=1.0)
    time_delta_seconds = Column(Float, default=0.0)

    session = relationship("DrivingSession", backref="graph_edges")
    source_node = relationship("EventGraphNode", foreign_keys=[source_node_id], back_populates="outgoing_edges")
    target_node = relationship("EventGraphNode", foreign_keys=[target_node_id], back_populates="incoming_edges")
