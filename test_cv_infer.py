import os
import cv2
import numpy as np

from backend.app.api.video_stream import get_cv_components

def test():
    print("Testing get_cv_components...")
    detector, tracker, zone_mgr, weapon_det, fight_det, theft_det = get_cv_components()
    print("CV components loaded!")

    cap = cv2.VideoCapture("datasets/sample/sample_cctv.mp4")
    ret, sample_frame = cap.read()
    if ret:
        print(f"Sample frame loaded, shape: {sample_frame.shape}")
        dets = detector.detect(sample_frame)
        print(f"Detected persons: {len(dets)}")
        for d in dets[:3]:
            print(f"  Person bbox: {d.bbox}, conf: {d.confidence}")

        tracks = tracker.track_detections([{"bbox": d.bbox, "confidence": d.confidence} for d in dets])
        print(f"Tracked persons: {len(tracks)}")
        for tr in tracks[:3]:
            print(f"  Track: {tr.track_id}, bbox: {tr.bbox}, conf: {tr.confidence}")

        w_events, w_dets = weapon_det.detect(sample_frame, detector.model)
        print(f"Weapon detections: {len(w_dets)}, Weapon events: {len(w_events)}")

if __name__ == "__main__":
    test()
