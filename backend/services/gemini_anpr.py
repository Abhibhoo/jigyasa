import cv2
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
from backend.new_anpr.google_sheets import update_google_sheet  # Your custom Google Sheets module

# NEW: Import Gemini and Pillow libraries
import google.generativeai as genai
from PIL import Image

# --- Gemini API Configuration ---
# IMPORTANT: Replace "YOUR_API_KEY" with your actual Gemini API key.
# For better security, use environment variables or a secrets management tool.
try:
    # Replace "YOUR_API_KEY" with the key you generated.
    genai.configure(api_key="AIzaSyC2kQ0rwXRHzB-i4WQUP0q7TNT2MdkQmcw") 
    print("✅ Gemini API configured successfully.")
except Exception as e:
    print(f"❌ Error configuring Gemini API: {e}")
    print("Please make sure you have set your API key correctly in the script.")
    exit()
# ---

# Load configuration for video feeds
CONFIG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__),'..', 'config', 'feeds_config.json'))


class PlateDetector:
    """Detects license plates within a given image crop using a YOLO model."""
    def __init__(self, model_path='license_plate_detector.pt'):
        self.model = YOLO(model_path)

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
                if dist < min_dist and dist < 75:
                    min_dist = dist
                    matched_id = obj_id

            if matched_id is None:
                matched_id = self.next_id
                self.next_id += 1

            prev_cy = self.objects[matched_id][1] if matched_id in self.objects else cy
            updated[matched_id] = (cx, cy, x1, y1, x2, y2, prev_cy)

        self.objects = updated
        return self.objects

def recognize_plate_with_gemini(plate_image):
    """Sends a license plate image to Gemini for recognition."""
    prompt = """
    You are an expert vehicle license plate reader for Indian vehicles, specifically from Maharashtra.
    Analyze this image and extract the exact license plate number.
    - Respond with ONLY the alphanumeric characters of the plate number.
    - Do not include spaces, hyphens, or any other descriptions. For example, if you see 'MH 14 TC 1234', respond with 'MH14TC1234'.
    - If the license plate is unclear or you cannot read it confidently, respond with the single word: UNREADABLE
    """
    model = genai.GenerativeModel('gemini-1.5-flash-latest')
    pil_image = Image.fromarray(cv2.cvtColor(plate_image, cv2.COLOR_BGR2RGB))
    
    try:
        print("🤖 [Worker] Sending image to Gemini for recognition...")
        response = model.generate_content([prompt, pil_image])
        plate_text = response.text.strip().upper()
        
        if "UNREADABLE" in plate_text or len(plate_text) < 6:
            print("⚠️ [Worker] Gemini response: Plate is unreadable or text is too short.")
            return ""
        
        print(f"✅ [Worker] Gemini recognized: {plate_text}")
        return plate_text
    except Exception as e:
        print(f"❌ [Worker] Error during Gemini API call: {e}")
        return ""

def processing_worker(q, plate_detector_worker, output_dir_worker, log_file_worker):
    """Worker function to process car images using Gemini in the background."""
    while True:
        try:
            car_crop, direction, location_name = q.get()
            
            # First, detect the smaller license plate within the car crop
            plates = plate_detector_worker.detect_plates(car_crop)
            for (px1, py1, px2, py2) in plates:
                plate_crop = car_crop[py1:py2, px1:px2]
                if plate_crop.size == 0: continue
                
                # Call the Gemini function for OCR
                plate_text = recognize_plate_with_gemini(plate_crop)
                
                if plate_text:
                    timestamp = datetime.now()
                    ts_str_log = timestamp.strftime("%Y-%m-%d %H:%M:%S")

                    # Log to local CSV file
                    with open(log_file_worker, 'a', newline='') as f:
                        writer = csv.writer(f)
                        writer.writerow([ts_str_log, plate_text, location_name, direction])
                    
                    # Save the image that was successfully read
                    ts_str_file = timestamp.strftime("%Y%m%d_%H%M%S")
                    img_path = os.path.join(output_dir_worker, f"{plate_text}_{ts_str_file}.jpg")
                    cv2.imwrite(img_path, plate_crop)
                    
                    # Update Google Sheet
                    try:
                        update_google_sheet(plate_text, status=direction, location=location_name)
                    except Exception as e:
                        print(f"⚠️ [Worker] Google Sheet update failed: {e}")
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

output_dir = "plates_detected"
os.makedirs(output_dir, exist_ok=True)
log_file = "plates_log.csv"
if not os.path.isfile(log_file):
    with open(log_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['timestamp', 'license_plate', 'location', 'direction'])

# --- Setup for worker thread ---
processing_queue = queue.Queue(maxsize=50)
# Note: The 'reader' argument and debouncing logic are removed.
worker_args = (plate_detector, output_dir, log_file)
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
    # Handle both integer index (for webcams) and string paths for video files
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
        'tracker': SimpleTracker(),
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
                # If video ends, reset to the beginning (for file-based sources)
                if cap.get(cv2.CAP_PROP_POS_FRAMES) > 0 and cap.get(cv2.CAP_PROP_POS_FRAMES) >= cap.get(cv2.CAP_PROP_FRAME_COUNT):
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            
            active_feeds_count += 1
            current_feed_info = feed_info[i]
            line_y = current_feed_info['line_y']
            tracker = current_feed_info['tracker']
            
            car_detections = car_detector.detect_cars(frame)
            formatted_detections = [[x1, y1, x1 + w, y1 + h] for x1, y1, w, h in car_detections]
            tracked_cars = tracker.update(formatted_detections)

            for car_id, (cx, cy, x1, y1, x2, y2, prev_cy) in tracked_cars.items():
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(frame, f"ID: {car_id}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

                is_crossing_down = prev_cy < line_y and cy >= line_y
                is_crossing_up = prev_cy > line_y and cy <= line_y

                if (is_crossing_down or is_crossing_up) and car_id not in current_feed_info['processed_car_ids']:
                    direction = "enter" if is_crossing_down else "exit"
                    current_feed_info['processed_car_ids'].add(car_id)
                    
                    car_crop = frame[y1:y2, x1:x2].copy()
                    if car_crop.size > 0:
                        try:
                            task = (car_crop, direction, current_feed_info['name'])
                            processing_queue.put_nowait(task)
                            print(f"🚗 Car {car_id} *crossed line* and was queued for processing from {current_feed_info['name']}.")
                        except queue.Full:
                            print(f"⚠️ Processing buffer is full. Dropping detection for car {car_id}.")

            cv2.line(frame, (0, line_y), (current_feed_info['frame_width'], line_y), (255, 0, 0), 2)
            cv2.imshow(f"License Plate Recognition - {current_feed_info['name']}", frame)

        if active_feeds_count == 0 and len(caps) > 0:
             # This condition might be met if all video files have ended
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
