from pathlib import Path
from typing import Optional
import numpy as np
import onnxruntime as ort

from .food101_classes import FOOD101_CLASSES

_MODEL_PATH = Path(__file__).parent / "models" / "efficientnet_b0_food101.onnx"
_TOP_K = 3
_session: Optional[ort.InferenceSession] = None


def _get_session() -> ort.InferenceSession:
    """
    Lazily initialises and returns the ONNX inference session.
    The session is created once per process and reused across requests.

    Returns:
        ort.InferenceSession: Loaded ONNX session.

    Raises:
        FileNotFoundError: If the model file does not exist.
    """
    global _session
    if _session is None:
        if not _MODEL_PATH.exists():
            raise FileNotFoundError(
                f"ONNX model not found at {_MODEL_PATH}. "
                "Run scripts/export_to_onnx.py first."
            )
        _session = ort.InferenceSession(
            str(_MODEL_PATH),
            providers=["CPUExecutionProvider"],
        )
    return _session


def classify(input_tensor: np.ndarray) -> list[dict]:
    """
    Runs EfficientNet-B0 inference and returns the top-3 class predictions.

    Args:
        input_tensor (np.ndarray): Float32 array of shape (1, 3, 224, 224).

    Returns:
        list[dict]: Up to 3 dicts with 'name' (str) and 'confidence' (float),
                    sorted descending by confidence.
    """
    session = _get_session()
    input_name = session.get_inputs()[0].name
    logits = session.run(None, {input_name: input_tensor})[0][0]  # shape: (101,)

    probs = _softmax(logits)
    top_indices = np.argsort(probs)[::-1][:_TOP_K]

    return [
        {
            "name": FOOD101_CLASSES[int(idx)],
            "confidence": float(round(probs[idx], 4)),
        }
        for idx in top_indices
    ]


def _softmax(logits: np.ndarray) -> np.ndarray:
    """
    Numerically stable softmax over a 1-D logits array.

    Args:
        logits (np.ndarray): Raw model output of shape (num_classes,).

    Returns:
        np.ndarray: Probability distribution of shape (num_classes,).
    """
    shifted = logits - logits.max()
    exp = np.exp(shifted)
    return exp / exp.sum()