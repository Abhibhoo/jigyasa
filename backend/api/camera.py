from flask import Blueprint, request, jsonify, Response
from services.camera_service import CameraService

camera_api = Blueprint("camera_api", __name__)
camera_service = CameraService()

camera_service.start_all_camera_threads()

@camera_api.route("/api/camera/feeds", methods=["GET"])
def get_camera_summary_route():
    summary = camera_service.get_camera_summary()
    return jsonify(summary)

@camera_api.route("/api/camera/config", methods=["GET"])
def get_camera_config_route():
    return jsonify(camera_service.get_camera_config())

@camera_api.route("/api/camera/toggle", methods=["POST"])
def toggle_camera_status():
    data = request.json
    feed_id = data.get("id")
    feed_type = data.get("type")
    if feed_id is None or feed_type not in ["counter", "multicam"]:
        return jsonify({"error": "Invalid input"}), 400

    updated_feed = camera_service.toggle_feed_status(feed_id, feed_type)
    return jsonify(updated_feed)

@camera_api.route("/video_feed/<int:feed_id>")
def stream_multicam_video(feed_id):
    return Response(camera_service.generate_mjpeg_frames(feed_id), mimetype="multipart/x-mixed-replace; boundary=frame")

@camera_api.route("/car_counter_video_feed/<int:feed_id>")
def stream_counter_video(feed_id):
    return Response(camera_service.generate_mjpeg_frames(feed_id), mimetype="multipart/x-mixed-replace; boundary=frame")