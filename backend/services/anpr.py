import cv2
import easyocr
import numpy as np
from datetime import datetime
from ultralytics import YOLO
import os
import csv
import json
import queue
import threading
import time
from threading import Lock
from detector import CarDetector  # Assumes this file exists with detect_cars()
from google_sheets import update_google_sheet  # Your custom Google Sheets module

# Load configuration for video feeds
CONFIG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__),'..', 'config', 'feeds_config.json'))


class PlateDetector:
    """Detects license plates within a given image crop using a YOLO model."""
    def __init__(self, model_path='license_plate_detector.pt'):
        # Construct absolute path to the model file
        script_dir = os.path.dirname(__file__)
        absolute_model_path = os.path.join(script_dir, model_path)
        self.model = YOLO(absolute_model_path)

    def detect_plates(self, car_crop):
        results = self.model(car_crop, verbose=False)
        plates = []
        for result in results:
            for box in result.boxes.xyxy.cpu().numpy():
                x1, y1, x2, y2 = map(int, box)
                plates.append((x1, y1, x2, y2))
        return plates

class SimpleTracker:
    """A simple object tracker to assign and maintain IDs for detected cars."""
    def __init__(self):
        self.next_id = 0
        self.objects = {}

    def update(self, detections):
        updated = {}
        for (x1, y1, x2, y2) in detections:
            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
            matched_id = None
            min_dist = float('inf')
            for obj_id, (px, py, *_) in self.objects.items():
                dist = np.sqrt((cx - px)**2 + (cy - py)**2)
                if dist < min_dist and dist < 50: # Using the original distance threshold
                    min_dist = dist
                    matched_id = obj_id

            if matched_id is None:
                matched_id = self.next_id
                self.next_id += 1

            prev_cy = self.objects[matched_id][1] if matched_id in self.objects else cy
            updated[matched_id] = (cx, cy, x1, y1, x2, y2, prev_cy)

        self.objects = updated
        return self.objects

def scale_plate_image(plate_image):
    """
    Enlarges a plate image to a standard width to improve OCR performance.
    """
    height, width = plate_image.shape[:2]
    if width == 0 or height == 0:
        return None
    # Increased target width for better OCR
    target_width = 400 
    scale_ratio = target_width / float(width)
    target_height = int(height * scale_ratio)
    # Use INTER_CUBIC for upscaling as it's higher quality
    interpolation = cv2.INTER_CUBIC
    return cv2.resize(plate_image, (target_width, target_height), interpolation=interpolation)

def ocr_and_clean_plate(image, reader):
    """
    Performs OCR on an image using EasyOCR and cleans the result.
    This version is lenient and will try to find at least 4 digits.
    """
    try:
        result = reader.readtext(image)
        if result:
            # Take the most confident reading
            text = result[0][1]
            cleaned = ''.join(filter(str.isalnum, text)).strip().upper()
            
            # Reverted to more lenient 4-character logic
            if len(cleaned) >= 4:
                return cleaned
            else:
                # Fallback for very short or messy reads: find the last 4 digits
                digits = ''.join(filter(str.isdigit, cleaned))
                return digits[-4:] if len(digits) >= 4 else ""
        return ""
    except Exception as e:
        print(f"⚠️ [Worker] EasyOCR error: {e}")
        return ""

def processing_worker(q, plate_detector_worker, reader_worker, output_dir_worker, log_file_worker):
    """
    Worker function to handle all slow operations in the background.
    This prevents the main video feed from freezing.
    """
    while True:
        try:
            car_crop, direction, location_name = q.get()
            
            # --- Step A: Detect Plate (Local YOLO model) ---
            plates = plate_detector_worker.detect_plates(car_crop)
            for (px1, py1, px2, py2) in plates:
                plate_crop = car_crop[py1:py2, px1:px2]
                if plate_crop.size == 0: continue
                
                scaled_plate = scale_plate_image(plate_crop)
                if scaled_plate is None: continue

                # --- Step B: Save Image First for Resilience ---
                timestamp = datetime.now()
                ts_str_file = timestamp.strftime("%Y%m%d_%H%M%S_%f")
                temp_img_name = f"plate_{location_name}_{ts_str_file}.jpg"
                img_path = os.path.join(output_dir_worker, temp_img_name)
                cv2.imwrite(img_path, scaled_plate)
                print(f"📸 [Worker] Plate image saved to {img_path}")

                # --- Step C: Recognize Plate (Slow Local OCR) ---
                plate_text = ocr_and_clean_plate(scaled_plate, reader_worker)
                
                # --- Step D: Log and Finalize ---
                if plate_text:
                    print(f"✅ [Worker] EasyOCR recognized: {plate_text}")
                    ts_str_log = timestamp.strftime("%Y-%m-%d %H:%M:%S")

                    with open(log_file_worker, 'a', newline='') as f:
                        writer = csv.writer(f)
                        writer.writerow([ts_str_log, plate_text, location_name, direction])
                    
                    final_img_name = f"{plate_text}_{ts_str_file}.jpg"
                    final_img_path = os.path.join(output_dir_worker, final_img_name)
                    try:
                        os.rename(img_path, final_img_path)
                        print(f"📝 [Worker] Renamed image to {final_img_path}")
                    except OSError as e:
                        print(f"⚠️ [Worker] Could not rename image: {e}")

                    try:
                        update_google_sheet(plate_text, status=direction, location=location_name)
                    except Exception as e:
                        print(f"⚠️ [Worker] Google Sheet update failed: {e}")
                else:
                    print(f"ℹ️ [Worker] Plate at {img_path} was unreadable. Image kept for review.")

        except queue.Empty:
            continue
        except Exception as e:
            print(f"💥 [Worker] Error processing task: {e}")
        finally:
            q.task_done()

# ---- Main Execution ----
car_detector = CarDetector()
car_detector.load_model()
plate_detector = PlateDetector()
# Initialize EasyOCR reader once
reader = easyocr.Reader(['en'])

output_dir = "plates_detected"
os.makedirs(output_dir, exist_ok=True)
log_file = "plates_log.csv"
if not os.path.isfile(log_file):
    with open(log_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['timestamp', 'license_plate', 'location', 'direction'])

# --- Setup for worker thread ---
# The queue acts as a buffer between the fast main loop and the slow worker.
processing_queue = queue.Queue(maxsize=50)
worker_args = (plate_detector, reader, output_dir, log_file)
processing_thread = threading.Thread(target=processing_worker, args=(processing_queue,) + worker_args, daemon=True)
processing_thread.start()
print("🚀 Processing worker thread started.")

with open(CONFIG_PATH, 'r') as f:
    anpr_config = json.load(f)

counter_feeds = [feed for feed in anpr_config['feeds'] if feed['type'] == 'counter']
caps = []
feed_info = []
for feed in counter_feeds:
    source = feed['video_source']
    if isinstance(source, str) and not source.isnumeric():
        source = os.path.abspath(os.path.join(os.path.dirname(CONFIG_PATH), '..', source))
    else:
        source = int(source)

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"❌ Error: Could not open video source '{source}'")
        continue
    caps.append(cap)
    feed_info.append({
        'id': feed['id'], 'name': feed['name'],
        'frame_width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        'frame_height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        'line_y': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) // 2,
        'tracker': SimpleTracker(), # Each feed gets its own tracker
        'processed_car_ids': set()
    })

if not caps:
    print("No video feeds to process. Exiting.")
    exit()

print("🟢 Starting video feeds... Press 'q' or Ctrl+C to exit.")
while True:
    try:
        active_feeds_count = 0
        for i, cap in enumerate(caps):
            ret, frame = cap.read()
            if not ret:
                if cap.get(cv2.CAP_PROP_POS_FRAMES) > 0 and cap.get(cv2.CAP_PROP_POS_FRAMES) >= cap.get(cv2.CAP_PROP_FRAME_COUNT):
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            
            active_feeds_count += 1
            current_feed_info = feed_info[i]
            line_y = current_feed_info['line_y']
            tracker = current_feed_info['tracker']
            
            # These are fast, local operations that don't block the video feed.
            car_detections = car_detector.detect_cars(frame)
            formatted_detections = [[x1, y1, x1 + w, y1 + h] for x1, y1, w, h in car_detections]
            tracked_cars = tracker.update(formatted_detections)

            for car_id, (cx, cy, x1, y1, x2, y2, prev_cy) in tracked_cars.items():
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(frame, f"ID: {car_id}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

                # --- FIX: Precise line-crossing logic to prevent multiple triggers ---
                is_crossing_down = prev_cy < line_y and cy >= line_y
                is_crossing_up = prev_cy > line_y and cy <= line_y

                # This ensures a car ID is only processed ONCE per crossing.
                if (is_crossing_down or is_crossing_up) and car_id not in current_feed_info['processed_car_ids']:
                    direction = "enter" if is_crossing_down else "exit"
                    current_feed_info['processed_car_ids'].add(car_id)
                    
                    car_crop = frame[y1:y2, x1:x2].copy()
                    if car_crop.size > 0:
                        try:
                            # The only task here is to quickly add the job to the queue.
                            task = (car_crop, direction, current_feed_info['name'])
                            processing_queue.put_nowait(task)
                            print(f"🚗 Car {car_id} *crossed line*. Queued for background processing from {current_feed_info['name']}.")
                        except queue.Full:
                            print(f"⚠️ Processing buffer is full. Dropping detection for car {car_id}.")

            cv2.line(frame, (0, line_y), (current_feed_info['frame_width'], line_y), (255, 0, 0), 2)
            cv2.imshow(f"License Plate Recognition - {current_feed_info['name']}", frame)

        if active_feeds_count == 0 and len(caps) > 0:
            print("All video feeds appear to have ended. Exiting.")
            break

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    except KeyboardInterrupt:
        print("\n🛑 Shutting down due to user interrupt.")
        break

for cap in caps:
    cap.release()
cv2.destroyAllWindows()
print("Program finished.")
