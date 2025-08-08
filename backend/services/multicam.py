import cv2
from .detector import CarDetector
from .counter import ParkingCounter
from .utils import draw_line

import json
import os
import numpy as np

CONFIG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'config', 'feeds_config.json'))

class CentroidTracker:
    def __init__(self, max_disappeared=10):
        self.next_object_id = 0
        self.objects = {}
        self.disappeared = {}
        self.max_disappeared = max_disappeared
        self.last_direction = {}
        self.previous_positions = {}

    def register(self, centroid):
        self.objects[self.next_object_id] = centroid
        self.disappeared[self.next_object_id] = 0
        self.last_direction[self.next_object_id] = None
        self.previous_positions[self.next_object_id] = centroid
        self.next_object_id += 1

    def deregister(self, object_id):
        del self.objects[object_id]
        del self.disappeared[object_id]
        del self.last_direction[object_id]
        del self.previous_positions[object_id]

    def update(self, rects):
        if len(rects) == 0:
            disappeared_ids = []
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    disappeared_ids.append(object_id)
                    self.deregister(object_id)
            return self.objects, disappeared_ids

        input_centroids = []
        for (x, y, w, h) in rects:
            cx = x + w // 2
            cy = y + h // 2
            input_centroids.append((cx, cy))

        if len(self.objects) == 0:
            for centroid in input_centroids:
                self.register(centroid)
            return self.objects, []

        object_ids = list(self.objects.keys())
        object_centroids = list(self.objects.values())

        D = np.linalg.norm(np.array(object_centroids)[:, None] - np.array(input_centroids), axis=2)

        rows = D.min(axis=1).argsort()
        cols = D.argmin(axis=1)[rows]

        assigned_rows = set()
        assigned_cols = set()

        for row, col in zip(rows, cols):
            if row in assigned_rows or col in assigned_cols:
                continue
            if D[row, col] > 50:
                continue
            object_id = object_ids[row]
            self.objects[object_id] = input_centroids[col]
            self.disappeared[object_id] = 0
            assigned_rows.add(row)
            assigned_cols.add(col)

        unassigned_rows = set(range(len(object_centroids))) - assigned_rows
        for row in unassigned_rows:
            object_id = object_ids[row]
            self.disappeared[object_id] += 1
            if self.disappeared[object_id] > self.max_disappeared:
                self.deregister(object_id)

        unassigned_cols = set(range(len(input_centroids))) - assigned_cols
        for col in unassigned_cols:
            self.register(input_centroids[col])

        return self.objects, []

def update_available_slots(feed_id, available_slots):
    with open(CONFIG_PATH, 'r+') as f:
        parking_slots_config = json.load(f)
        for feed in parking_slots_config['feeds']:
            if feed['id'] == feed_id:
                feed['availableSlots'] = available_slots
                break
        f.seek(0)
        json.dump(parking_slots_config, f, indent=4)
        f.truncate()

def process_frame(frame, car_detector, tracker, parking_counter, feed_id, update_callback=None):
    frame_height, frame_width = frame.shape[:2]
    center_y = frame_height // 2

    detected_cars = car_detector.detect_cars(frame)
    objects, disappeared_ids = tracker.update(detected_cars)

    # Handle disappeared cars
    for object_id in disappeared_ids:
        last_dir = tracker.last_direction.get(object_id, None)
        if last_dir == "towards":
            parking_counter.decrement_count()
        elif last_dir == "away":
            parking_counter.increment_count()

    for object_id, centroid in objects.items():
        prev_centroid = tracker.previous_positions.get(object_id, None)
        if prev_centroid is not None:
            prev_cx, prev_cy = prev_centroid
            cx, cy = centroid
            if prev_cy < center_y <= cy:
                # Car coming towards camera crossing line - decrement available slots
                parking_counter.decrement_count()
                tracker.last_direction[object_id] = "towards"
            elif prev_cy > center_y >= cy:
                # Car going away from camera crossing line - increment available slots
                parking_counter.increment_count()
                tracker.last_direction[object_id] = "away"
        tracker.previous_positions[object_id] = centroid

    # Draw horizontal line
    draw_line(frame, center_y)

    # Draw bounding boxes
    for (x, y, w, h) in detected_cars:
        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
    

    # Call update callback with current available slots
    

    update_available_slots(feed_id, parking_counter.available_slots)
    if update_callback:
        update_callback(feed_id, frame)

def main(target_feed_id=None, update_frame_callback=None):
    car_detectors = []
    trackers = []
    caps = []
    parking_counters = []

    # Load config from JSON file
    with open(CONFIG_PATH, 'r') as f:
        parking_slots_config = json.load(f)

    if target_feed_id:
        multicam_feeds = [feed for feed in parking_slots_config['feeds'] if feed['type'] == 'multicam' and feed['id'] == target_feed_id]
    else:
        multicam_feeds = [feed for feed in parking_slots_config['feeds'] if feed['type'] == 'multicam']

    # Initialize detectors, trackers, video captures, and counters for each camera feed
    for config in multicam_feeds:
     source = config["video_source"]
     source = os.path.abspath(os.path.join(os.path.dirname(CONFIG_PATH), '..', source))
     total_slots = config["totalSlots"]
     available_slots = config["availableSlots"]

     detector = CarDetector()
     detector.load_model()
     car_detectors.append(detector)

     tracker = CentroidTracker(max_disappeared=10)
     trackers.append(tracker)

     parking_counter = ParkingCounter(total_slots, available_slots)
     parking_counters.append(parking_counter)

     cap = cv2.VideoCapture(source)
     if not cap.isOpened():
        print(f"Error: Could not open video source {source}")
        return
     caps.append(cap)


    while True:
        frames = []
        rets = []
        for cap in caps:
            ret, frame = cap.read()
            rets.append(ret)
            frames.append(frame if ret else None)

        if not any(rets):
            break

        for i, ret in enumerate(rets):
            if ret:
                # Implement frame skipping
                if caps[i].get(cv2.CAP_PROP_POS_FRAMES) % 2 != 0:
                    continue

                # Resize frame for faster processing and streaming
                processed_frame = cv2.resize(frames[i], (640, 480))
                process_frame(processed_frame, car_detectors[i], trackers[i], parking_counters[i], multicam_feeds[i]['id'], update_frame_callback)
                

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    for cap in caps:
        cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
