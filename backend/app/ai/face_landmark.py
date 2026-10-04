import math
import numpy as np
import cv2
from typing import List, Tuple, Optional
from app.ai.base import LandmarkResult, BoundingBox, HeadPoseResult
from app.config import settings

class FaceLandmarkService:
    def __init__(self):
        self._mesh = None
        self._init_mediapipe()

        # 3D generic facial model points for head pose estimation (solvePnP)
        self.model_points_3d = np.array([
            (0.0, 0.0, 0.0),             # Nose tip (index 1)
            (0.0, -330.0, -65.0),        # Chin (index 152)
            (-225.0, 170.0, -135.0),     # Left eye left corner (index 263 or 33)
            (225.0, 170.0, -135.0),      # Right eye right corner (index 33 or 263)
            (-150.0, -150.0, -125.0),    # Left mouth corner (index 61)
            (150.0, -150.0, -125.0)      # Right mouth corner (index 291)
        ], dtype=np.float64)

        # MediaPipe landmark indices for eyes & mouth
        # Left eye: 362, 385, 387, 263, 373, 380
        self.LEFT_EYE = [362, 385, 387, 263, 373, 380]
        # Right eye: 33, 160, 158, 133, 153, 144
        self.RIGHT_EYE = [33, 160, 158, 133, 153, 144]
        # Mouth: outer lip corners and verticals
        # 61: left, 291: right, 13: upper inner, 14: lower inner, 0: upper outer, 17: lower outer
        self.MOUTH_CORNERS = (61, 291)
        self.MOUTH_VERTICAL_INNER = (13, 14)
        self.MOUTH_VERTICAL_OUTER = (0, 17)

    def _init_mediapipe(self):
        try:
            import mediapipe as mp
            self.mp_face_mesh = mp.solutions.face_mesh
            self._mesh = self.mp_face_mesh.FaceMesh(
                max_num_faces=2,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
        except Exception:
            self._mesh = None

    def _calculate_ear(self, landmarks_2d: List[Tuple[float, float]], indices: List[int], w: int, h: int) -> float:
        """
        EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
        """
        try:
            pts = [np.array([landmarks_2d[idx][0] * w, landmarks_2d[idx][1] * h]) for idx in indices]
            # Vertical distances
            dist_v1 = np.linalg.norm(pts[1] - pts[5])
            dist_v2 = np.linalg.norm(pts[2] - pts[4])
            # Horizontal distance
            dist_h = np.linalg.norm(pts[0] - pts[3])
            if dist_h == 0:
                return 0.30
            ear = (dist_v1 + dist_v2) / (2.0 * dist_h)
            return float(ear)
        except Exception:
            return 0.30

    def _calculate_mar(self, landmarks_2d: List[Tuple[float, float]], w: int, h: int) -> float:
        """
        MAR = (||upper_outer - lower_outer|| + ||upper_inner - lower_inner||) / (2 * ||left - right||)
        """
        try:
            p_left = np.array([landmarks_2d[self.MOUTH_CORNERS[0]][0] * w, landmarks_2d[self.MOUTH_CORNERS[0]][1] * h])
            p_right = np.array([landmarks_2d[self.MOUTH_CORNERS[1]][0] * w, landmarks_2d[self.MOUTH_CORNERS[1]][1] * h])
            p_top_in = np.array([landmarks_2d[self.MOUTH_VERTICAL_INNER[0]][0] * w, landmarks_2d[self.MOUTH_VERTICAL_INNER[0]][1] * h])
            p_bot_in = np.array([landmarks_2d[self.MOUTH_VERTICAL_INNER[1]][0] * w, landmarks_2d[self.MOUTH_VERTICAL_INNER[1]][1] * h])
            p_top_out = np.array([landmarks_2d[self.MOUTH_VERTICAL_OUTER[0]][0] * w, landmarks_2d[self.MOUTH_VERTICAL_OUTER[0]][1] * h])
            p_bot_out = np.array([landmarks_2d[self.MOUTH_VERTICAL_OUTER[1]][0] * w, landmarks_2d[self.MOUTH_VERTICAL_OUTER[1]][1] * h])

            v_in = np.linalg.norm(p_top_in - p_bot_in)
            v_out = np.linalg.norm(p_top_out - p_bot_out)
            h_dist = np.linalg.norm(p_left - p_right)

            if h_dist == 0:
                return 0.20
            mar = (v_in + v_out) / (2.0 * h_dist)
            return float(mar)
        except Exception:
            return 0.20

    def estimate_head_pose(self, landmarks_2d: List[Tuple[float, float]], w: int, h: int) -> HeadPoseResult:
        try:
            # 2D points corresponding to model_points_3d
            # Nose tip (1), Chin (152), Left Eye Left (33), Right Eye Right (263), Left Mouth (61), Right Mouth (291)
            image_points = np.array([
                (landmarks_2d[1][0] * w, landmarks_2d[1][1] * h),
                (landmarks_2d[152][0] * w, landmarks_2d[152][1] * h),
                (landmarks_2d[33][0] * w, landmarks_2d[33][1] * h),
                (landmarks_2d[263][0] * w, landmarks_2d[263][1] * h),
                (landmarks_2d[61][0] * w, landmarks_2d[61][1] * h),
                (landmarks_2d[291][0] * w, landmarks_2d[291][1] * h)
            ], dtype=np.float64)

            focal_length = w
            center = (w / 2, h / 2)
            camera_matrix = np.array([
                [focal_length, 0, center[0]],
                [0, focal_length, center[1]],
                [0, 0, 1]
            ], dtype=np.float64)
            dist_coeffs = np.zeros((4, 1))

            success, rot_vec, trans_vec = cv2.solvePnP(
                self.model_points_3d, image_points, camera_matrix, dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE
            )
            if not success:
                return HeadPoseResult()

            rot_mat, _ = cv2.Rodrigues(rot_vec)
            # Compute Euler angles
            sy = math.sqrt(rot_mat[0, 0] * rot_mat[0, 0] + rot_mat[1, 0] * rot_mat[1, 0])
            singular = sy < 1e-6

            if not singular:
                x = math.atan2(rot_mat[2, 1], rot_mat[2, 2])
                y = math.atan2(-rot_mat[2, 0], sy)
                z = math.atan2(rot_mat[1, 0], rot_mat[0, 0])
            else:
                x = math.atan2(-rot_mat[1, 2], rot_mat[1, 1])
                y = math.atan2(-rot_mat[2, 0], sy)
                z = 0

            pitch = float(math.degrees(x))
            yaw = float(math.degrees(y))
            roll = float(math.degrees(z))

            # Direction classification
            direction = "FOCUSED"
            is_distracted = False
            if yaw > settings.HEAD_YAW_THRESHOLD:
                direction = "LOOKING_RIGHT"
                is_distracted = True
            elif yaw < -settings.HEAD_YAW_THRESHOLD:
                direction = "LOOKING_LEFT"
                is_distracted = True
            elif pitch > settings.HEAD_PITCH_DOWN_THRESHOLD:
                direction = "LOOKING_DOWN"
                is_distracted = True
            elif pitch < -settings.HEAD_PITCH_UP_THRESHOLD:
                direction = "LOOKING_UP"
                is_distracted = True

            return HeadPoseResult(
                pitch=round(pitch, 2),
                yaw=round(yaw, 2),
                roll=round(roll, 2),
                direction=direction,
                is_distracted=is_distracted
            )
        except Exception:
            return HeadPoseResult()

    def process_frame(self, frame_bgr: np.ndarray) -> LandmarkResult:
        h, w = frame_bgr.shape[:2]
        if self._mesh is None:
            # Fallback when MediaPipe FaceMesh is initializing
            return LandmarkResult()

        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        results = self._mesh.process(rgb)

        if not results.multi_face_landmarks:
            return LandmarkResult(num_faces_detected=0)

        num_faces = len(results.multi_face_landmarks)
        # Select primary driver face (largest by default or first face)
        primary_face = results.multi_face_landmarks[0]
        landmarks_2d = [(lm.x, lm.y) for lm in primary_face.landmark]

        # Bounding box
        xs = [lm.x * w for lm in primary_face.landmark]
        ys = [lm.y * h for lm in primary_face.landmark]
        min_x, max_x = max(0, min(xs)), min(w, max(xs))
        min_y, max_y = max(0, min(ys)), min(h, max(ys))
        bbox = BoundingBox(
            x=round(float(min_x), 1),
            y=round(float(min_y), 1),
            width=round(float(max_x - min_x), 1),
            height=round(float(max_y - min_y), 1)
        )

        ear_l = self._calculate_ear(landmarks_2d, self.LEFT_EYE, w, h)
        ear_r = self._calculate_ear(landmarks_2d, self.RIGHT_EYE, w, h)
        ear_avg = (ear_l + ear_r) / 2.0
        mar = self._calculate_mar(landmarks_2d, w, h)

        return LandmarkResult(
            landmarks_2d=landmarks_2d,
            ear_left=round(ear_l, 3),
            ear_right=round(ear_r, 3),
            ear_avg=round(ear_avg, 3),
            mar=round(mar, 3),
            face_bbox=bbox,
            num_faces_detected=num_faces
        )
