from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.session import DrivingSession
from app.models.event import DetectionEvent, EventSeverity, EventType
from app.models.event_graph import EventGraphNode, EventGraphEdge

class EventGraphService:
    @staticmethod
    def build_or_get_session_graph(db: Session, session_identifier: Any) -> Dict[str, Any]:
        """
        Constructs or retrieves a temporal causal graph for a driving session's safety events.
        Connects events into a directed acyclic graph (DAG) based on timestamp deltas and behavioral relationships:
        - PRECEDED (sequential occurrence within temporal threshold)
        - CONTRIBUTED_TO (distraction preceding risk escalation)
        - CO_OCCURRED (simultaneous multi-factor risk, delta <= 2s)
        - ESCALATED (severity escalation, e.g. info -> critical)
        - RECOVERED_AFTER (attention restoration following an alert)
        """
        # Session identifier can be integer id or string session_id (e.g. SESS-...)
        if isinstance(session_identifier, int) or (isinstance(session_identifier, str) and session_identifier.isdigit()):
            session = db.query(DrivingSession).filter(DrivingSession.id == int(session_identifier)).first()
        else:
            session = db.query(DrivingSession).filter(DrivingSession.session_id == str(session_identifier)).first()

        if not session:
            return None

        # Check existing nodes
        existing_nodes = db.query(EventGraphNode).filter(EventGraphNode.session_id == session.id).all()
        if not existing_nodes:
            # Query chronologically sorted events
            events = (
                db.query(DetectionEvent)
                .filter(DetectionEvent.session_id == session.id)
                .order_by(DetectionEvent.start_time.asc())
                .all()
            )

            if not events:
                return {
                    "session_id": session.session_id,
                    "session_db_id": session.id,
                    "nodes": [],
                    "edges": [],
                    "causal_chains": [],
                    "summary": {
                        "total_nodes": 0,
                        "total_edges": 0,
                        "primary_causal_chains": 0
                    }
                }

            # Create nodes
            created_nodes: List[EventGraphNode] = []
            for ev in events:
                node = EventGraphNode(
                    event_id=ev.id,
                    session_id=session.id,
                    node_type=ev.event_type.value if hasattr(ev.event_type, 'value') else str(ev.event_type),
                    timestamp=ev.start_time or datetime.utcnow(),
                    severity=ev.severity.value if hasattr(ev.severity, 'value') else str(ev.severity),
                    confidence=ev.confidence or 1.0,
                    metadata_json={
                        "duration_sec": ev.duration_seconds,
                        "risk_contribution": ev.risk_contribution or 0.0,
                        "evidence_factors": ev.evidence_factors or []
                    }
                )
                db.add(node)
                created_nodes.append(node)
            db.commit()

            # Refresh created nodes to get auto-generated IDs
            for n in created_nodes:
                db.refresh(n)

            # Build edges based on time deltas and semantic relations
            created_edges: List[EventGraphEdge] = []
            severity_order = {"info": 1, "warning": 2, "high": 3, "critical": 4}

            for i in range(len(created_nodes)):
                source = created_nodes[i]
                # Look at subsequent events within 45 seconds
                for j in range(i + 1, min(i + 4, len(created_nodes))):
                    target = created_nodes[j]
                    delta = (target.timestamp - source.timestamp).total_seconds()
                    if delta < 0:
                        continue
                    if delta > 45.0:
                        break

                    rel_type = "PRECEDED"
                    conf = 0.85

                    s_sev = severity_order.get(source.severity.lower(), 1)
                    t_sev = severity_order.get(target.severity.lower(), 1)

                    if delta <= 2.5:
                        rel_type = "CO_OCCURRED"
                        conf = 0.95
                    elif "RESTORED" in target.node_type.upper():
                        rel_type = "RECOVERED_AFTER"
                        conf = 0.90
                    elif "PHONE" in source.node_type.upper() or "DISTRACTION" in source.node_type.upper():
                        if t_sev >= s_sev or "DROWSINESS" in target.node_type.upper() or "MANEUVER" in target.node_type.upper():
                            rel_type = "CONTRIBUTED_TO"
                            conf = 0.92
                    elif t_sev > s_sev:
                        rel_type = "ESCALATED"
                        conf = 0.88

                    edge = EventGraphEdge(
                        session_id=session.id,
                        source_node_id=source.id,
                        target_node_id=target.id,
                        relation_type=rel_type,
                        confidence=conf,
                        time_delta_seconds=round(delta, 1)
                    )
                    db.add(edge)
                    created_edges.append(edge)

            db.commit()

        # Query all nodes and edges for session
        nodes = db.query(EventGraphNode).filter(EventGraphNode.session_id == session.id).all()
        edges = db.query(EventGraphEdge).filter(EventGraphEdge.session_id == session.id).all()

        nodes_list = [{
            "id": n.id,
            "event_id": n.event_id,
            "node_type": n.node_type,
            "timestamp": n.timestamp.isoformat(),
            "severity": n.severity,
            "confidence": n.confidence,
            "metadata": n.metadata_json or {}
        } for n in nodes]

        edges_list = [{
            "id": e.id,
            "source": e.source_node_id,
            "target": e.target_node_id,
            "relationship": e.relation_type,
            "confidence": e.confidence,
            "time_delta_seconds": e.time_delta_seconds
        } for e in edges]

        # Identify chains of 2 or more nodes connected by CONTRIBUTED_TO or ESCALATED
        critical_chains = []
        for e in edges_list:
            if e["relationship"] in ("CONTRIBUTED_TO", "ESCALATED"):
                source_node = next((n for n in nodes_list if n["id"] == e["source"]), None)
                target_node = next((n for n in nodes_list if n["id"] == e["target"]), None)
                if source_node and target_node:
                    critical_chains.append({
                        "source": source_node["node_type"],
                        "target": target_node["node_type"],
                        "relationship": e["relationship"],
                        "time_delta": e["time_delta_seconds"],
                        "source_severity": source_node["severity"],
                        "target_severity": target_node["severity"]
                    })

        return {
            "session_id": session.session_id,
            "session_db_id": session.id,
            "nodes": nodes_list,
            "edges": edges_list,
            "causal_chains": critical_chains,
            "summary": {
                "total_nodes": len(nodes_list),
                "total_edges": len(edges_list),
                "causal_chains_count": len(critical_chains)
            }
        }
