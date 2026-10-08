"""Generate a realistic test video stream with real human subjects for end-to-end CV verification."""

import os
import cv2
import numpy as np


def generate_cctv_video(
    source_img_path: str = "bus.jpg",
    output_path: str = "datasets/sample/sample_cctv.mp4",
    num_frames: int = 40,
    fps: int = 15
):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    img = cv2.imread(source_img_path)
    if img is None:
        raise FileNotFoundError(f"Source image not found: {source_img_path}")

    h, w = img.shape[:2]
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))

    for f in range(num_frames):
        # Apply slight realistic pan / jitter to test tracking continuity
        dx = int(np.sin(f * 0.2) * 3)
        dy = int(np.cos(f * 0.2) * 2)

        M = np.float32([[1, 0, dx], [0, 1, dy]])
        frame = cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REFLECT)

        # Subtle noise / lighting variation
        noise = np.random.normal(0, 1.2, frame.shape).astype(np.int16)
        frame_noisy = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        out.write(frame_noisy)

    out.release()
    print(f"Generated realistic test stream: '{output_path}' ({num_frames} frames, {w}x{h} @ {fps}fps)")


if __name__ == "__main__":
    generate_cctv_video()
