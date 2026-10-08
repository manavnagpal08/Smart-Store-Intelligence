"""Generate a synthetic CCTV sample video simulating store layout and moving people."""

import os
import cv2
import numpy as np


def generate_retail_sample_video(
    output_path: str = "datasets/sample/sample_retail.mp4",
    num_frames: int = 150,
    width: int = 1280,
    height: int = 720,
    fps: int = 25
):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    # Base background: retail store floor
    base_bg = np.full((height, width, 3), (220, 225, 230), dtype=np.uint8)

    # Draw store floor tiles
    tile_size = 80
    for y in range(0, height, tile_size):
        for x in range(0, width, tile_size):
            if (x // tile_size + y // tile_size) % 2 == 0:
                cv2.rectangle(base_bg, (x, y), (x + tile_size, y + tile_size), (210, 215, 220), -1)
            cv2.rectangle(base_bg, (x, y), (x + tile_size, y + tile_size), (195, 200, 205), 1)

    # Draw fixtures: Aisle shelves, Checkout counters
    # Aisle 1 shelves
    cv2.rectangle(base_bg, (400, 100), (750, 450), (180, 180, 180), 2)
    cv2.putText(base_bg, "AISLE A - GROCERY", (420, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (120, 120, 120), 2)
    
    # Aisle 2 shelves
    cv2.rectangle(base_bg, (800, 100), (1150, 450), (180, 180, 180), 2)
    cv2.putText(base_bg, "AISLE B - BEVERAGES", (820, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (120, 120, 120), 2)

    # Checkouts
    cv2.rectangle(base_bg, (150, 500), (550, 700), (160, 160, 160), 2)
    cv2.putText(base_bg, "CHECKOUT 01", (170, 530), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (100, 100, 100), 2)

    # Simulated people paths
    # Person 1 walks through Entrance into Aisle A
    # Person 2 waits in Checkout 01
    # Person 3 walks down Aisle B
    for f in range(num_frames):
        frame = base_bg.copy()

        # Person 1 coords (moving from (100, 100) towards (550, 300))
        t1 = f / num_frames
        p1_x = int(100 + t1 * 450)
        p1_y = int(100 + t1 * 200)

        # Person 2 coords (browsing in Checkout 01)
        p2_x = int(250 + np.sin(f * 0.1) * 15)
        p2_y = int(580 + np.cos(f * 0.08) * 10)

        # Person 3 coords (walking down Aisle B)
        p3_x = int(950)
        p3_y = int(150 + (f % 100) * 2.5)

        people = [
            (p1_x, p1_y, (60, 120, 220), (30, 70, 160)),   # Person 1 (Blue)
            (p2_x, p2_y, (180, 80, 80), (120, 40, 40)),    # Person 2 (Red)
            (p3_x, p3_y, (60, 180, 80), (30, 120, 40)),    # Person 3 (Green)
        ]

        for px, py, shirt_color, pants_color in people:
            # Draw synthetic human silhouette (head, torso, legs)
            # Head
            cv2.circle(frame, (px, py - 35), 14, (200, 180, 160), -1)
            # Hair/hat
            cv2.circle(frame, (px, py - 42), 12, (50, 40, 30), -1)
            # Torso / Shirt
            cv2.rectangle(frame, (px - 16, py - 20), (px + 16, py + 20), shirt_color, -1)
            # Legs / Pants
            cv2.rectangle(frame, (px - 14, py + 20), (px - 2, py + 55), pants_color, -1)
            cv2.rectangle(frame, (px + 2, py + 20), (px + 14, py + 55), pants_color, -1)
            # Shoes
            cv2.rectangle(frame, (px - 16, py + 55), (px - 2, py + 62), (30, 30, 30), -1)
            cv2.rectangle(frame, (px + 2, py + 55), (px + 16, py + 62), (30, 30, 30), -1)

        # Frame timestamp watermarking
        cv2.putText(
            frame,
            f"CCTV SIMULATION - FRAME {f+1:04d}",
            (30, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (40, 40, 40),
            2
        )

        out.write(frame)

    out.release()
    print(f"Generated sample video: {output_path} ({num_frames} frames, {width}x{height} @ {fps}fps)")


if __name__ == "__main__":
    generate_retail_sample_video()
