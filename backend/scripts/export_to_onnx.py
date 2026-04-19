"""
Loads the best training checkpoint and exports to ONNX.

Usage:
    python -m scripts.export_to_onnx

Outputs:
    app/ml/image_recognition/models/efficientnet_b0_food101.onnx
"""

from pathlib import Path
import torch
import timm
import onnxruntime as ort
import numpy as np

CHECKPOINT_PATH = Path(__file__).parent / "checkpoints" / "efficientnet_b0_food101_best.pt"
OUTPUT_PATH = Path(__file__).parent.parent / "app" / "ml" / "image_recognition" / "models" / "efficientnet_b0_food101.onnx"
NUM_CLASSES = 101


def export() -> None:
    """
    Loads the PyTorch checkpoint, traces the model, exports to ONNX,
    and verifies the export with a dummy forward pass.
    """
    if not CHECKPOINT_PATH.exists():
        raise FileNotFoundError(f"Checkpoint not found: {CHECKPOINT_PATH}. Run train_classifier.py first.")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=NUM_CLASSES)
    state = torch.load(CHECKPOINT_PATH, map_location="cpu")
    model.load_state_dict(state)
    model.eval()

    dummy_input = torch.randn(1, 3, 224, 224)

    torch.onnx.export(
        model,
        dummy_input,
        str(OUTPUT_PATH),
        export_params=True,
        opset_version=13,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["logits"],
        dynamic_axes={"input": {0: "batch_size"}, "logits": {0: "batch_size"}},
    )
    print(f"Exported ONNX model to: {OUTPUT_PATH}")

    session = ort.InferenceSession(str(OUTPUT_PATH), providers=["CPUExecutionProvider"])
    result = session.run(None, {"input": dummy_input.numpy()})
    assert result[0].shape == (1, NUM_CLASSES), "ONNX output shape mismatch"
    print(f"ONNX verification passed. Output shape: {result[0].shape}")


if __name__ == "__main__":
    export()