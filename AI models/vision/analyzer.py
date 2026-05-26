"""
HireMind - Vision Engine
Real-time face mesh, posture, and eye contact analysis via MediaPipe.
All outputs are internal — never exposed directly to the user.
"""

import cv2
import numpy as np
import time
from dataclasses import dataclass, asdict
from typing import Optional

# try:
#     import mediapipe as mp
#     _ = mp.solutions.face_mesh
#     _MP_AVAILABLE = True
# except (ImportError, AttributeError):
#     _MP_AVAILABLE = False
try:
    import mediapipe as mp
    FACE_MESH = mp.solutions.face_mesh.FaceMesh
    _MP_AVAILABLE = True
except Exception:
    FACE_MESH = None
    _MP_AVAILABLE = False

@dataclass
class FaceData:
    detected: bool = False
    bounding_box: dict = None
    head_pose: dict = None       # pitch, yaw, roll
    facial_tension: float = 0.0  # 0–1


@dataclass
class PostureData:
    detected: bool = False
    slouching: bool = False
    leaning: str = "none"           # none | left | right
    shoulder_alignment: float = 0.0
    confidence: float = 0.0


@dataclass
class EyeContactData:
    detected: bool = False
    gaze_direction: str = "center"  # center | left | right | up | down
    looking_away: bool = False
    away_duration: float = 0.0
    contact_ratio: float = 1.0


class VisionAnalyzer:
    """
    Thread-safe vision analysis engine.
    Falls back to stub data when MediaPipe is unavailable (dev/demo mode).
    """

    # MediaPipe iris landmark indices
    LEFT_IRIS  = [474, 475, 476, 477]
    RIGHT_IRIS = [469, 470, 471, 472]

def __init__(self):
    self._away_start: Optional[float] = None
    self._total_frames = 0
    self._contact_frames = 0
    self._tension_history: list[float] = []

    self.face_mesh = None
    self.pose = None

    if _MP_AVAILABLE:
        mp_fm = mp.solutions.face_mesh
        mp_pose = mp.solutions.pose

        self.face_mesh = mp_fm.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

        self.pose = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
    else:
        print("[VisionAnalyzer] MediaPipe not installed — running in stub mode.")
    # ──────────────────────────────────────────────────
    # Frame decoding
    # ──────────────────────────────────────────────────

    def decode_frame(self, frame_data: bytes) -> np.ndarray:
        """Decode JPEG bytes → RGB numpy array."""
        arr = np.frombuffer(frame_data, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image frame")
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # ──────────────────────────────────────────────────
    # Face analysis
    # ──────────────────────────────────────────────────

    def analyze_face(self, img: np.ndarray) -> dict:
        """Detect face landmarks and compute head pose + facial tension."""
        if self.face_mesh is None:
            return self._stub_face()

        h, w = img.shape[:2]
        results = self.face_mesh.process(img)

        if not results.multi_face_landmarks:
            return asdict(FaceData())

        lm = results.multi_face_landmarks[0].landmark
        pts = np.array([[p.x * w, p.y * h, p.z * w] for p in lm])

        xs, ys = pts[:, 0], pts[:, 1]
        bbox = {
            "x": float(xs.min()), "y": float(ys.min()),
            "w": float(xs.max() - xs.min()), "h": float(ys.max() - ys.min()),
        }

        pitch, yaw, roll = self._estimate_head_pose(pts, w, h)

        # Facial tension: std of landmark distances (proxy for muscle activation)
        dists = np.linalg.norm(pts[:, :2] - pts[:, :2].mean(axis=0), axis=1)
        tension = float(np.std(dists) / (np.mean(dists) + 1e-6))
        tension = min(1.0, tension * 2.0)

        self._tension_history.append(tension)
        if len(self._tension_history) > 30:
            self._tension_history.pop(0)

        return {
            "detected": True,
            "bounding_box": bbox,
            "head_pose": {"pitch": pitch, "yaw": yaw, "roll": roll},
            "facial_tension": round(tension, 3),
            "landmarks_count": len(lm),
        }

    def _estimate_head_pose(self, pts: np.ndarray, w: int, h: int):
        """PnP-based head pose estimation — returns (pitch, yaw, roll) in degrees."""
        model_pts = np.array([
            [0.0, 0.0, 0.0],           # Nose tip     (1)
            [0.0, -330.0, -65.0],      # Chin         (152)
            [-225.0, 170.0, -135.0],   # Left eye     (33)
            [225.0, 170.0, -135.0],    # Right eye    (263)
            [-150.0, -150.0, -125.0],  # Left mouth   (61)
            [150.0, -150.0, -125.0],   # Right mouth  (291)
        ], dtype=np.float64)

        idx = [1, 152, 33, 263, 61, 291]
        img_pts = np.array([[pts[i][0], pts[i][1]] for i in idx], dtype=np.float64)

        focal = w
        cam_matrix = np.array(
            [[focal, 0, w / 2], [0, focal, h / 2], [0, 0, 1]], dtype=np.float64
        )
        dist = np.zeros((4, 1))

        try:
            _, rvec, tvec = cv2.solvePnP(model_pts, img_pts, cam_matrix, dist)
            rmat, _ = cv2.Rodrigues(rvec)
            angles = cv2.decomposeProjectionMatrix(np.hstack((rmat, tvec)))[6]
            return float(angles[0]), float(angles[1]), float(angles[2])
        except Exception:
            return 0.0, 0.0, 0.0

    # ──────────────────────────────────────────────────
    # Posture analysis
    # ──────────────────────────────────────────────────

    def analyze_posture(self, img: np.ndarray) -> dict:
        """Detect body posture via MediaPipe Pose landmarks."""
        if self.pose is None:
            return self._stub_posture()

        results = self.pose.process(img)
        if not results.pose_landmarks:
            return asdict(PostureData())

        lm = results.pose_landmarks.landmark
        h, w = img.shape[:2]

        def pt(idx):
            p = lm[idx]
            return np.array([p.x * w, p.y * h])

        left_shoulder  = pt(11)
        right_shoulder = pt(12)
        left_ear       = pt(7)
        right_ear      = pt(8)
        left_hip       = pt(23)
        right_hip      = pt(24)

        shoulder_diff = abs(left_shoulder[1] - right_shoulder[1])
        shoulder_alignment = float(shoulder_diff / (h + 1e-6))

        mid_shoulder = (left_shoulder + right_shoulder) / 2
        mid_ear      = (left_ear + right_ear) / 2
        mid_hip      = (left_hip + right_hip) / 2

        body_lean_x = float(mid_shoulder[0] - mid_hip[0])
        lean_thresh = w * 0.05
        if body_lean_x < -lean_thresh:
            leaning = "right"
        elif body_lean_x > lean_thresh:
            leaning = "left"
        else:
            leaning = "none"

        slouching = bool(mid_ear[1] > mid_shoulder[1] + 20)

        vis = [lm[i].visibility for i in [11, 12, 23, 24]]
        confidence = float(np.mean(vis))

        return {
            "detected": True,
            "slouching": slouching,
            "leaning": leaning,
            "shoulder_alignment": round(shoulder_alignment, 3),
            "confidence": round(confidence, 2),
        }

    # ──────────────────────────────────────────────────
    # Eye contact analysis
    # ──────────────────────────────────────────────────

    def analyze_eye_contact(self, img: np.ndarray) -> dict:
        """Track gaze direction and rolling eye-contact quality ratio."""
        if self.face_mesh is None:
            return self._stub_eye()

        h, w = img.shape[:2]
        results = self.face_mesh.process(img)
        self._total_frames += 1

        if not results.multi_face_landmarks:
            return asdict(EyeContactData())

        lm = results.multi_face_landmarks[0].landmark

        def to_px(idx):
            p = lm[idx]
            return np.array([p.x * w, p.y * h])

        left_iris  = np.mean([to_px(i) for i in self.LEFT_IRIS], axis=0)
        right_iris = np.mean([to_px(i) for i in self.RIGHT_IRIS], axis=0)

        def iris_ratio(iris, eye_left_idx, eye_right_idx):
            el = to_px(eye_left_idx)
            er = to_px(eye_right_idx)
            eye_w = np.linalg.norm(er - el) + 1e-6
            offset = np.dot(iris - el, (er - el) / eye_w)
            return offset / eye_w

        left_ratio  = iris_ratio(left_iris,  33,  133)
        right_ratio = iris_ratio(right_iris, 362, 263)
        avg_ratio   = (left_ratio + right_ratio) / 2

        # Determine gaze from iris position
        if avg_ratio < 0.35:
            gaze = "left"
        elif avg_ratio > 0.65:
            gaze = "right"
        else:
            gaze = "center"

        # Override via nose position (head turn)
        nose = lm[1]
        if nose.x < 0.35:
            gaze = "right"
        elif nose.x > 0.65:
            gaze = "left"

        looking_away = gaze != "center"
        now = time.time()

        if looking_away:
            if self._away_start is None:
                self._away_start = now
            away_duration = now - self._away_start
        else:
            self._away_start = None
            away_duration = 0.0
            self._contact_frames += 1

        contact_ratio = self._contact_frames / max(self._total_frames, 1)

        return {
            "detected": True,
            "gaze_direction": gaze,
            "looking_away": looking_away,
            "away_duration": round(away_duration, 2),
            "contact_ratio": round(contact_ratio, 2),
        }

    # ──────────────────────────────────────────────────
    # Demo / stub helpers (when MediaPipe unavailable)
    # ──────────────────────────────────────────────────

    def _stub_face(self) -> dict:
        import random
        t = round(random.uniform(0.1, 0.4), 3)
        return {
            "detected": True,
            "bounding_box": {"x": 100, "y": 50, "w": 200, "h": 250},
            "head_pose": {"pitch": random.uniform(-5, 5),
                          "yaw": random.uniform(-10, 10),
                          "roll": random.uniform(-3, 3)},
            "facial_tension": t,
            "landmarks_count": 468,
        }

    def _stub_posture(self) -> dict:
        return {
            "detected": True,
            "slouching": False,
            "leaning": "none",
            "shoulder_alignment": 0.02,
            "confidence": 0.95,
        }

    def _stub_eye(self) -> dict:
        import random
        self._total_frames += 1
        self._contact_frames += 1
        return {
            "detected": True,
            "gaze_direction": "center",
            "looking_away": False,
            "away_duration": 0.0,
            "contact_ratio": round(self._contact_frames / max(self._total_frames, 1), 2),
        }
