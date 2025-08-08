import json
import os
import cv2
import time
import logging
from threading import Lock, Thread
from . import multicam
from . import car_counter

class CameraService:
    def __init__(self):
        pass

    def start_multicam_processing(self, feed_id):
        multicam.main(feed_id)

logging.basicConfig(level=logging.INFO)

class CameraService:
    def __init__(self):
        self.CONFIG_PATH = os.path.join(os.path.dirname(__file__), "../config/feeds_config.json")
        self.video_frames = {}
        self.video_frame_locks = {}
        self.video_threads = {}

    def load_config(self):
        with open(self.CONFIG_PATH, "r") as f:
            return json.load(f)

    def get_camera_summary(self):
        config = self.load_config()
        feeds = config.get("feeds", [])

        total_feeds = len(feeds)
        multicam_feeds = [f for f in feeds if f.get("type") == "multicam"]
        counter_feeds = [f for f in feeds if f.get("type") == "counter"]
        active_feeds = [f for f in feeds if f.get("status") == "active"]

        return {
            "totalFeeds": total_feeds,
            "multicamFeeds": len(multicam_feeds),
            "counterFeeds": len(counter_feeds),
            "activeFeeds": len(active_feeds),
        }

    def get_camera_config(self):
        config = self.load_config()
        feeds = config.get("feeds", [])

        for feed in feeds:
            if feed.get("status") == "active":
                if feed["type"] == "multicam":
                    feed["url"] = f"http://localhost:5000/video_feed/{feed['id']}"
                elif feed["type"] == "counter":
                    feed["url"] = f"http://localhost:5000/car_counter_video_feed/{feed['id']}"

        multicam_feeds = [f for f in feeds if f.get("type") == "multicam"]
        counter_feeds = [f for f in feeds if f.get("type") == "counter"]

        return {
            "multicamFeeds": multicam_feeds,
            "counterFeeds": counter_feeds,
            "globalCarCount": config.get("global_car_count", 0),
        }

    def toggle_feed_status(self, feed_id, feed_type):
        config = self.load_config()
        feeds = config.get("feeds", [])
        for feed in feeds:
            if feed["id"] == feed_id and feed["type"] == feed_type:
                feed["status"] = "inactive" if feed["status"] == "active" else "active"
                break
        with open(self.CONFIG_PATH, "w") as f:
            json.dump(config, f, indent=2)
        return feed

    def update_frame(self, feed_id, frame):
        if feed_id not in self.video_frame_locks:
            self.video_frame_locks[feed_id] = Lock()
        with self.video_frame_locks[feed_id]:
            self.video_frames[feed_id] = frame

    def preload_camera(self, feed_id, video_path):
        logging.info(f"[preload_camera] Starting thread for Feed ID {feed_id}, Source: {video_path}")

        cap = None
        retry_count = 0
        while retry_count < 5:
            cap = cv2.VideoCapture(video_path)
            if cap.isOpened():
                break
            logging.warning(f"[preload_camera] Retry {retry_count+1}: Failed to open {video_path}")
            retry_count += 1
            time.sleep(2)

        if not cap or not cap.isOpened():
            logging.error(f"[preload_camera] Could not open video: {video_path}")
            return

        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                logging.warning(f"[preload_camera] Empty frame from {video_path}, resetting...")
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                time.sleep(0.5)
                continue

            self.update_frame(feed_id, frame) # Use the new update_frame function

            time.sleep(0.033)  # ~30 FPS

    def start_multicam_processing(self, feed_id):
        multicam.main(feed_id, self.update_frame)

    def start_car_counter_processing(self, feed_id):
        car_counter.main(feed_id, self.update_frame)

    def start_all_camera_threads(self):
        config = self.load_config()
        for feed in config.get("feeds", []):
            if feed.get("status") == "active":
                feed_type = feed.get("type")
                if feed_type == "multicam":
                    feed_id = feed["id"]
                    if feed_id not in self.video_frame_locks:
                        self.video_frame_locks[feed_id] = Lock()
                    # Start multicam processing in a separate thread
                    thread = Thread(target=self.start_multicam_processing, args=(feed_id,))
                    thread.daemon = True
                    thread.start()
                    self.video_threads[feed_id] = thread
                elif feed_type == "counter":
                    feed_id = feed["id"]
                    if feed_id not in self.video_frame_locks:
                        self.video_frame_locks[feed_id] = Lock()
                    # Start car_counter processing in a separate thread
                    thread = Thread(target=self.start_car_counter_processing, args=(feed_id,))
                    thread.daemon = True
                    thread.start()
                    self.video_threads[feed_id] = thread
                continue

                video_path = feed.get("video_source")
                if not video_path:
                    continue

                is_http_stream = video_path.startswith("http://") or video_path.startswith("https://")
                if not is_http_stream and not os.path.exists(video_path):
                    logging.warning(f"[start_all_camera_threads] File not found: {video_path}")
                    continue

                feed_id = feed["id"]
                if feed_id not in self.video_frame_locks:
                    self.video_frame_locks[feed_id] = Lock()

                thread = Thread(target=self.preload_camera, args=(feed_id, video_path))
                thread.daemon = True
                thread.start()
                self.video_threads[feed_id] = thread

    def generate_mjpeg_frames(self, feed_id):
        while True:
            with self.video_frame_locks.get(feed_id, Lock()):
                frame = self.video_frames.get(feed_id)

            if frame is None:
                time.sleep(0.1)
                continue

            ret, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if not ret:
                continue

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )
