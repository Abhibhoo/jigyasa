from ultralytics import YOLO

class CarDetector:
    def __init__(self, model_name='yolov8n.pt'):
        self.model_name = model_name
        self.model = None

    def load_model(self):
        self.model = YOLO(self.model_name)

    def detect_cars(self, frame):
        results = self.model(frame, verbose=False)
        detected_cars = []
        for result in results:
            boxes = result.boxes.xyxy.cpu().numpy()  # Bounding boxes
            confidences = result.boxes.conf.cpu().numpy()  # Confidence scores
            class_ids = result.boxes.cls.cpu().numpy()  # Class IDs
            for box, conf, cls in zip(boxes, confidences, class_ids):
                if conf > 0.5 and int(cls) == 2:  # Class 2 is car in COCO dataset
                    x1, y1, x2, y2 = map(int, box)
                    w = x2 - x1
                    h = y2 - y1
                    detected_cars.append([x1, y1, w, h])
        return detected_cars
