import cv2

def draw_parking_status(frame, available_slots, total_slots):
    status_text = f"Available Parking Slots: {available_slots}/{total_slots}"
    # Draw the status text on the frame
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 1.2  # Reduced font scale for smaller text
    color = (255,255,25)  # Changed color to white for better visibility
    thickness = 2  # Reduced thickness for smaller text
    position = (10, 40)  # Adjusted position accordingly
    cv2.putText(frame, status_text, position, font, font_scale, color, thickness, cv2.LINE_AA)

def draw_line(frame, line_position, color=(0, 0, 255), thickness=2):
    """
    Draw a horizontal line on the frame at the specified y-coordinate.
    """
    height, width = frame.shape[:2]
    cv2.line(frame, (0, line_position), (width, line_position), color, thickness)

def process_frame(frame, available_slots, total_slots):
    # Placeholder for image processing logic
    # This function can be expanded to include any additional processing needed for each frame
    return frame

def display_frame(frame):
    # Placeholder for displaying the frame
    # This function can be expanded to include any additional display logic needed
    pass
