from flask import Blueprint, request, jsonify
from services.dashboard_service import get_dashboard_stats,get_multicam_feeds

dashboard_api = Blueprint("dashboard_api", __name__)

@dashboard_api.route("/api/dashboard/stats", methods=["GET"])
def get_dashboard_stats_route():
    stats = get_dashboard_stats()
    return jsonify(stats)

@dashboard_api.route("/api/dashboard/multicam", methods=["GET"])
def fetch_multicam_data():
    multicam_data = get_multicam_feeds()
    return jsonify(multicam_data)