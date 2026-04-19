import io
from typing import Optional
import numpy as np
from PIL import Image

_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)
_INPUT_SIZE = 224
_BLUR_THRESHOLD = 80.0


def decode_image(image_bytes: bytes) -> Image.Image:
    """
    Decodes raw image bytes to a PIL Image in RGB mode.

    Args:
        image_bytes (bytes): Raw bytes from the uploaded file.

    Returns:
        Image.Image: Decoded image in RGB.

    Raises:
        ValueError: If the bytes cannot be decoded as an image.
    """
    try:
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise ValueError(f"Could not decode image: {exc}") from exc


def check_blur(img: Image.Image) -> Optional[str]:
    """
    Detects excessive blur using Laplacian variance. Returns a warning
    string if variance is below the threshold, None otherwise.

    Args:
        img (Image.Image): RGB PIL image.

    Returns:
        Optional[str]: Warning message or None.
    """
    try:
        import cv2
        gray = np.array(img.convert("L"))
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        if variance < _BLUR_THRESHOLD:
            return f"Image appears blurry (Laplacian variance={variance:.1f}). Results may be less accurate."
    except ImportError:
        pass
    return None


def preprocess(image_bytes: bytes) -> tuple[np.ndarray, Optional[str]]:
    """
    Full preprocessing pipeline: decode → resize → normalize → add batch dim.

    Applies ImageNet mean/std normalization matching the EfficientNet-B0
    training environment. Returns channels-first layout for ONNX Runtime.

    Args:
        image_bytes (bytes): Raw image bytes.

    Returns:
        tuple[np.ndarray, Optional[str]]:
            - Float32 array of shape (1, 3, 224, 224).
            - Optional blur warning string.

    Raises:
        ValueError: If decoding fails.
    """
    img = decode_image(image_bytes)
    warning = check_blur(img)

    img = img.resize((_INPUT_SIZE, _INPUT_SIZE), Image.BILINEAR)
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = (arr - _MEAN) / _STD
    arr = arr.transpose(2, 0, 1)           # HWC → CHW
    arr = np.expand_dims(arr, axis=0)      # CHW → BCHW

    return arr.astype(np.float32), warning