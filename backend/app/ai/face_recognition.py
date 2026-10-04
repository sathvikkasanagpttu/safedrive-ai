import math
import numpy as np
import cv2
from collections import deque
from typing import List, Optional, Tuple, Dict, Any
from app.ai.base import IdentityResult, BoundingBox
from app.config import settings

class FaceRecognitionService:
    def __init__(self, embedding_dim: int = 128, history_size: int = 30):
        self.embedding_dim = embedding_dim
        # Deterministic projection matrix for embedding generation from normalized face patch
        np.random.seed(42)
        self.projection_matrix = np.random.randn(64 * 64, self.embedding_dim).astype(np.float32)
        norms = np.linalg.norm(self.projection_matrix, axis=0, keepdims=True)
        self.projection_matrix /= np.maximum(norms, 1e-7)

        # Sliding window history for temporal stability
        self.match_history = deque(maxlen=history_size)
        self.quality_history = deque(maxlen=history_size)

    def assess_face_quality(
        self,
        face_patch_bgr: np.ndarray,
        head_yaw: float = 0.0,
        head_pitch: float = 0.0,
        frame_shape: Optional[Tuple[int, int]] = None
    ) -> Tuple[float, str, Dict[str, Any]]:
        """
        Calculates holistic face quality score (0.0 to 1.0) and descriptive label.
        Evaluates sharpness (Laplacian variance), illumination, size, and pose deflection.
        """
        if face_patch_bgr is None or face_patch_bgr.size == 0:
            return 0.0, "POOR", {"sharpness": 0, "illumination": 0, "occlusion": True}

        gray = cv2.cvtColor(face_patch_bgr, cv2.COLOR_BGR2GRAY) if len(face_patch_bgr.shape) == 3 else face_patch_bgr

        # 1. Sharpness via Laplacian variance
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        # Normalize: >150 is sharp, <30 is blurry
        sharpness_score = min(1.0, max(0.0, (laplacian_var - 20.0) / 180.0))

        # 2. Illumination and contrast
        mean_val, std_val = cv2.meanStdDev(gray)
        mean_b = float(mean_val[0][0])
        std_b = float(std_val[0][0])
        # Optimal brightness range: 80 to 180
        if mean_b < 50:
            illum_score = max(0.2, mean_b / 50.0 * 0.6) # Low light
        elif mean_b > 210:
            illum_score = max(0.2, (255.0 - mean_b) / 45.0 * 0.6) # Overexposed
        else:
            illum_score = 0.7 + min(0.3, std_b / 60.0 * 0.3) # Good contrast

        # 3. Pose deflection penalty (frontal face gives best biometric reliability)
        pose_dev = math.sqrt(head_yaw**2 + head_pitch**2)
        pose_factor = max(0.4, 1.0 - (pose_dev / 50.0))

        # Combined composite quality score
        quality_score = round(float(0.40 * sharpness_score + 0.35 * illum_score + 0.25 * pose_factor), 3)

        if quality_score >= 0.80:
            quality_label = "EXCELLENT"
        elif quality_score >= 0.65:
            quality_label = "GOOD"
        elif quality_score >= 0.45:
            quality_label = "FAIR"
        else:
            quality_label = "POOR"

        details = {
            "laplacian_var": round(laplacian_var, 1),
            "brightness_mean": round(mean_b, 1),
            "contrast_std": round(std_b, 1),
            "pose_penalty": round(1.0 - pose_factor, 2),
            "low_light": mean_b < 50,
            "sunglasses_suspected": illum_score < 0.4 and mean_b < 60
        }
        return quality_score, quality_label, details

    def extract_and_align_face(self, frame_bgr: np.ndarray, bbox: Optional[BoundingBox] = None) -> Optional[np.ndarray]:
        h, w = frame_bgr.shape[:2]
        if bbox is None:
            crop_size = min(h, w)
            y1 = (h - crop_size) // 2
            x1 = (w - crop_size) // 2
            face = frame_bgr[y1:y1+crop_size, x1:x1+crop_size]
        else:
            x1 = max(0, int(bbox.x))
            y1 = max(0, int(bbox.y))
            x2 = min(w, int(bbox.x + bbox.width))
            y2 = min(h, int(bbox.y + bbox.height))
            if x2 <= x1 or y2 <= y1:
                return None
            face = frame_bgr[y1:y2, x1:x2]

        if face.size == 0:
            return None

        face_resized = cv2.resize(face, (64, 64))
        gray = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
        normalized = clahe.apply(gray)
        return normalized

    def generate_embedding(self, face_patch: np.ndarray) -> List[float]:
        patch = face_patch
        if patch.ndim == 3:
            if patch.shape[2] == 3:
                patch = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY)
            elif patch.shape[2] == 1:
                patch = patch[:, :, 0]
        if patch.shape != (64, 64):
            patch = cv2.resize(patch, (64, 64))

        flat = patch.flatten().astype(np.float32) / 255.0
        flat -= np.mean(flat)
        vector = np.dot(flat, self.projection_matrix)
        norm = np.linalg.norm(vector)
        if norm > 1e-6:
            vector = vector / norm
        else:
            vector = np.zeros(self.embedding_dim, dtype=np.float32)
        return [round(float(val), 6) for val in vector]

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        a = np.array(v1, dtype=np.float32)
        b = np.array(v2, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        sim = float(np.dot(a, b) / (norm_a * norm_b))
        return max(0.0, min(1.0, (sim + 1.0) / 2.0))

    def match_driver_advanced(
        self,
        current_embedding: List[float],
        raw_face_patch: Optional[np.ndarray],
        registered_drivers: List[Dict[str, Any]],
        head_yaw: float = 0.0,
        head_pitch: float = 0.0,
        threshold: Optional[float] = None
    ) -> IdentityResult:
        """
        SafeDrive AI 2.0 Driver Identity Confidence Engine.
        Combines:
          Embedding Similarity (35%)
          + Face Quality Score (25%)
          + Temporal Consistency (25%)
          + Registration Quality (15%)
        """
        if threshold is None:
            threshold = settings.IDENTITY_CONFIDENCE_THRESHOLD

        # 1. Quality evaluation
        quality_score, quality_label, q_details = self.assess_face_quality(
            raw_face_patch, head_yaw=head_yaw, head_pitch=head_pitch
        )
        self.quality_history.append(quality_score)

        # 2. Embedding similarity against gallery
        best_sim = 0.0
        best_driver = None
        best_reg_quality = 1.0

        for driver_entry in registered_drivers:
            embeddings = driver_entry.get("embeddings", [])
            for ref_emb in embeddings:
                sim = self.cosine_similarity(current_embedding, ref_emb)
                if sim > best_sim:
                    best_sim = sim
                    best_driver = driver_entry
                    best_reg_quality = driver_entry.get("quality_score", 0.95)

        # 3. Temporal consistency tracking
        matched_id = best_driver["id"] if (best_driver and best_sim >= threshold) else None
        self.match_history.append(matched_id)

        if len(self.match_history) > 0:
            matching_count = sum(1 for m in self.match_history if m == matched_id)
            temporal_consistency = matching_count / len(self.match_history)
        else:
            temporal_consistency = 1.0

        if temporal_consistency >= 0.85:
            stability = "HIGH"
        elif temporal_consistency >= 0.55:
            stability = "MODERATE"
        else:
            stability = "LOW"

        # 4. Composite Identity Confidence Engine Formula
        if matched_id is not None:
            composite_confidence = (
                0.35 * best_sim
                + 0.25 * quality_score
                + 0.25 * temporal_consistency
                + 0.15 * best_reg_quality
            )
            composite_confidence = round(min(0.99, max(0.40, composite_confidence)), 3)

            status = "AUTHORIZED"
            if q_details.get("sunglasses_suspected"):
                status = "OCCLUDED_VERIFIED"

            return IdentityResult(
                driver_id=best_driver["id"],
                driver_name=best_driver["full_name"],
                driver_code=best_driver.get("driver_code"),
                confidence=composite_confidence,
                is_authorized=True,
                stability=stability,
                face_quality=quality_label,
                quality_score=quality_score,
                status=status,
                embedding_similarity=round(best_sim, 3),
                temporal_consistency=round(temporal_consistency, 2)
            )
        else:
            # Unknown Driver detected
            composite_confidence = round(max(0.1, 1.0 - best_sim), 3)
            return IdentityResult(
                driver_id=None,
                driver_name="Unknown Driver",
                driver_code=None,
                confidence=composite_confidence,
                is_authorized=False,
                stability=stability,
                face_quality=quality_label,
                quality_score=quality_score,
                status="UNAUTHORIZED",
                embedding_similarity=round(best_sim, 3),
                temporal_consistency=round(temporal_consistency, 2)
            )

    # Legacy method wrapper for backward compatibility with existing tests
    def match_driver(
        self,
        current_embedding: List[float],
        registered_drivers: List[Dict[str, Any]],
        threshold: Optional[float] = None
    ) -> IdentityResult:
        return self.match_driver_advanced(
            current_embedding=current_embedding,
            raw_face_patch=None,
            registered_drivers=registered_drivers,
            threshold=threshold
        )
