import cv2
from .detector import CarDetector
from .counter import ParkingCounter
import json
import os
from .utils import draw_parking_status, draw_line
import numpy as np
import threading
import queue
import time

class CarCounterState:
    def __init__(self, config_path):
        self.config_path = config_path
        self.config = self._load_config()
        self.total_cars_counted = self.config.get('global_car_count', 0)

    def _load_config(self):
        with open(self.config_path, 'r') as f:
            return json.load(f)

    def _save_config(self):
        with open(self.config_path, 'w') as f:
            json.dump(self.config, f, indent=4)

    def increment(self):
        self.total_cars_counted += 1
        self.config['global_car_count'] = self.total_cars_counted
        self._save_config()

    def decrement(self):
        self.total_cars_counted -= 1
        self.config['global_car_count'] = self.total_cars_counted
        self._save_config()

CONFIG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'config', 'feeds_config.json'))
# This single instance will be used everywhere
car_counter_state = CarCounterState(CONFIG_PATH)

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

def process_frame(frame, car_detector, tracker, parking_counter, car_counter_state, update_callback=None):
    frame_height, frame_width = frame.shape[:2]
    center_y = frame_height // 2

    detected_cars = car_detector.detect_cars(frame)
    objects, disappeared_ids = tracker.update(detected_cars)

    # Handle disappeared cars
    for object_id in disappeared_ids:
        last_dir = tracker.last_direction.get(object_id, None)
        if last_dir == "towards":
            parking_counter.decrement_count()
            car_counter_state.decrement()

    for object_id, centroid in objects.items():
        prev_centroid = tracker.previous_positions.get(object_id, None)
        if prev_centroid is not None:
            prev_cx, prev_cy = prev_centroid
            cx, cy = centroid
            if prev_cy < center_y <= cy:
                # Car coming towards camera crossing line - increment count
                parking_counter.increment_count()
                tracker.last_direction[object_id] = "towards"
                car_counter_state.increment()
            elif prev_cy > center_y >= cy:
                # Car going away from camera crossing line - decrement count
                parking_counter.decrement_count()
                tracker.last_direction[object_id] = "away"
                car_counter_state.decrement()
        tracker.previous_positions[object_id] = centroid

    # Draw horizontal line
    draw_line(frame, center_y)

    # Draw bounding boxes
    for (x, y, w, h) in detected_cars:
        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

    # Display total cars counted
    cv2.putText(frame, f"Total Cars: {car_counter_state.total_cars_counted}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
    return car_counter_state.total_cars_counted

class AsyncFrameProcessor:
    def __init__(self, feed_id, video_source, detector, tracker, parking_counter, frame_skip=3):
        self.feed_id = feed_id
        self.video_source = video_source
        self.detector = detector
        self.tracker = tracker
        self.parking_counter = parking_counter
        self.frame_skip = frame_skip
        
        # Thread-safe frame buffer
        self.frame_buffer = queue.Queue(maxsize=60)
        self.result_buffer = queue.Queue(maxsize=30)
        
        # Thread control
        self.running = False
        self.capture_thread = None
        self.processing_thread = None
        
        # Frame counter for sampling
        self.frame_counter = 0
        
        # Video capture
        self.cap = cv2.VideoCapture(video_source)
        if not self.cap.isOpened():
            raise ValueError(f"Could not open video source: {video_source}")
            
    def start(self):
        """Start the async processing threads"""
        self.running = True
        self.capture_thread = threading.Thread(target=self._capture_frames, daemon=True)
        self.processing_thread = threading.Thread(target=self._process_frames_async, daemon=True)
        self.capture_thread.start()
        self.processing_thread.start()
        
    def stop(self):
        """Stop all processing threads"""
        self.running = False
        if self.capture_thread:
            self.capture_thread.join(timeout=1)
        if self.processing_thread:
            self.processing_thread.join(timeout=1)
        if self.cap:
            self.cap.release()
            
    def _capture_frames(self):
        """Background thread for capturing frames from video source"""
        while self.running:
            try:
                ret, frame = self.cap.read()
                if not ret:
                    # Try to reopen the video source
                    self.cap.release()
                    self.cap = cv2.VideoCapture(self.video_source)
                    time.sleep(0.1)
                    continue
                    
                # Add frame to buffer (non-blocking)
                try:
                    self.frame_buffer.put_nowait(frame)
                except queue.Full:
                    # Remove oldest frame if buffer is full
                    try:
                        self.frame_buffer.get_nowait()
                        self.frame_buffer.put_nowait(frame)
                    except queue.Empty:
                        pass
                        
            except Exception as e:
                print(f"Error in frame capture for {self.feed_id}: {e}")
                time.sleep(0.1)
                
    def _process_frames_async(self):
        """Background thread for processing frames with detection and counting"""
        while self.running:
            try:
                # Get frame from buffer with timeout
                frame = self.frame_buffer.get(timeout=1)
                
                # Frame sampling - process only 1 in every N frames
                self.frame_counter += 1
                if self.frame_counter % self.frame_skip != 0:
                    continue
                    
                # Resize frame for faster processing
                processed_frame = cv2.resize(frame, (640, 480))
                
                # Perform detection and counting
                process_frame(
                    processed_frame, 
                    self.detector, 
                    self.tracker, 
                    self.parking_counter, 
                    car_counter_state
                )
                
                # Add result to buffer for display
                try:
                    self.result_buffer.put_nowait(processed_frame)
                except queue.Full:
                    # Remove oldest result if buffer is full
                    try:
                        self.result_buffer.get_nowait()
                        self.result_buffer.put_nowait(processed_frame)
                    except queue.Empty:
                        pass
                        
            except queue.Empty:
                continue
            except Exception as e:
                print(f"Error in frame processing for {self.feed_id}: {e}")
                time.sleep(0.1)
                
    def get_latest_frame(self):
        """Get the latest processed frame for display"""
        try:
            return self.result_buffer.get_nowait()
        except queue.Empty:
            return None
            
    def is_running(self):
        """Check if processor is running"""
        return self.running and self.capture_thread.is_alive() and self.processing_thread.is_alive()


def main(target_feed_id=None, update_frame_callback=None):
    processors = []
    
    # Load config from JSON file
    with open(CONFIG_PATH, 'r') as f:
        car_counter_config = json.load(f)

    counter_feeds = [feed for feed in car_counter_config['feeds'] if feed['type'] == 'counter']

    # Initialize async processors for each video source
    for feed in counter_feeds:
        source = feed['video_source']
        source = os.path.abspath(os.path.join(os.path.dirname(CONFIG_PATH), '..', source))

        detector = CarDetector()
        detector.load_model()

        tracker = CentroidTracker(max_disappeared=10)

        parking_counter = ParkingCounter(0, 0)

        try:
            processor = AsyncFrameProcessor(
                feed_id=feed['id'],
                video_source=source,
                detector=detector,
                tracker=tracker,
                parking_counter=parking_counter,
                frame_skip=3  # Process 1 in every 3 frames
            )
            processor.start()
            processors.append(processor)
        except ValueError as e:
            print(f"Error initializing processor for {feed['id']}: {e}")
            continue

    # Main display loop - non-blocking
    while True:
        for processor in processors[:]:  # Use slice to allow removal during iteration
            if not processor.is_running():
                processors.remove(processor)
                continue
                
            frame = processor.get_latest_frame()
            if frame is not None and update_frame_callback:
                update_frame_callback(processor.feed_id, frame)

        if cv2.waitKey(30) & 0xFF == ord('q'):  # Reduced wait time for smoother display
            break
            
        time.sleep(0.01)  # Small sleep to prevent CPU overload

    # Cleanup
    for processor in processors:
        processor.stop()

    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()