"""
Fine-tunes EfficientNet-B0 on the Food-101 dataset.

Usage (run from backend/ with a GPU environment):
    python -m scripts.train_classifier

Outputs:
    scripts/checkpoints/efficientnet_b0_food101_best.pt

Requirements (install separately in training env):
    torch torchvision timm
"""

import os
from pathlib import Path
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import torchvision.transforms as T
from torchvision.datasets import Food101
import timm

CHECKPOINT_DIR = Path(__file__).parent / "checkpoints"
DATA_DIR = Path(__file__).parent / "data"
BATCH_SIZE = 64
EPOCHS = 10
LR_HEAD = 1e-3
LR_BACKBONE = 1e-4
NUM_CLASSES = 101


def build_transforms(train: bool) -> T.Compose:
    """
    Returns image transforms for training or validation.

    Args:
        train (bool): True for augmented training transforms, False for eval.

    Returns:
        T.Compose: Composed transform pipeline.
    """
    if train:
        return T.Compose([
            T.RandomResizedCrop(224, scale=(0.7, 1.0)),
            T.RandomHorizontalFlip(),
            T.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
    return T.Compose([
        T.Resize(256),
        T.CenterCrop(224),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])


def build_model() -> nn.Module:
    """
    Loads EfficientNet-B0 from timm with ImageNet pretrained weights
    and replaces the classification head for 101 classes.

    Returns:
        nn.Module: Model ready for fine-tuning.
    """
    model = timm.create_model("efficientnet_b0", pretrained=True, num_classes=NUM_CLASSES)
    return model


def run_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    optimizer: optim.Optimizer | None,
    device: torch.device,
    train: bool,
) -> tuple[float, float]:
    """
    Runs one epoch of training or validation.

    Args:
        model (nn.Module): The network.
        loader (DataLoader): Data loader for the epoch.
        criterion (nn.Module): Loss function.
        optimizer (optim.Optimizer | None): Optimizer; None during validation.
        device (torch.device): Device to run on.
        train (bool): True for training mode (enables grad), False for eval.

    Returns:
        tuple[float, float]: (average_loss, top1_accuracy).
    """
    model.train(train)
    total_loss = 0.0
    correct = 0
    total = 0

    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        if train:
            optimizer.zero_grad()

        with torch.set_grad_enabled(train):
            logits = model(images)
            loss = criterion(logits, labels)
            if train:
                loss.backward()
                optimizer.step()

        total_loss += loss.item() * images.size(0)
        correct += (logits.argmax(dim=1) == labels).sum().item()
        total += images.size(0)

    return total_loss / total, correct / total


def train() -> None:
    """
    Orchestrates the full training run with differential learning rates
    and saves the best checkpoint by validation accuracy.
    """
    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on: {device}")

    train_ds = Food101(root=str(DATA_DIR), split="train", transform=build_transforms(True), download=True)
    val_ds   = Food101(root=str(DATA_DIR), split="test",  transform=build_transforms(False), download=True)
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,  num_workers=4, pin_memory=True)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False, num_workers=4, pin_memory=True)

    model = build_model().to(device)

    head_params = [p for n, p in model.named_parameters() if "classifier" in n]
    backbone_params = [p for n, p in model.named_parameters() if "classifier" not in n]
    optimizer = optim.AdamW([
        {"params": head_params,     "lr": LR_HEAD},
        {"params": backbone_params, "lr": LR_BACKBONE},
    ], weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

    best_acc = 0.0
    for epoch in range(1, EPOCHS + 1):
        train_loss, train_acc = run_epoch(model, train_loader, criterion, optimizer, device, train=True)
        val_loss,   val_acc   = run_epoch(model, val_loader,   criterion, None,      device, train=False)
        scheduler.step()

        print(
            f"Epoch {epoch:02d}/{EPOCHS} | "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} | "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f}"
        )

        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), CHECKPOINT_DIR / "efficientnet_b0_food101_best.pt")
            print(f"  → saved best checkpoint (val_acc={val_acc:.4f})")

    print(f"Training complete. Best val_acc: {best_acc:.4f}")


if __name__ == "__main__":
    train()