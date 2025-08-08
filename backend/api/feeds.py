from flask import Blueprint, request, jsonify
from services.feeds_service import (
    get_all_feeds,
    add_new_feed,
    update_existing_feed,
    delete_existing_feed,
    set_global_count,
    update_feed_initial_count  
)

feeds_api = Blueprint('feeds_api', __name__)

@feeds_api.route('/api/feeds', methods=['GET'])
def get_feeds():
    return jsonify(get_all_feeds())

@feeds_api.route('/api/feeds', methods=['POST'])
def add_feed():
    return jsonify(add_new_feed(request.json))

@feeds_api.route('/api/feeds/<int:feed_id>', methods=['PUT'])
def update_feed(feed_id):
    return jsonify(update_existing_feed(feed_id, request.json))

@feeds_api.route('/api/feeds/<int:feed_id>', methods=['DELETE'])
def delete_feed(feed_id):
    return jsonify(delete_existing_feed(feed_id))

@feeds_api.route('/api/feeds/global_count', methods=['POST'])
def global_count():
    return jsonify(set_global_count(request.json))

@feeds_api.route("/api/feeds/<int:feed_id>/count", methods=["PATCH"])
def patch_initial_count(feed_id):
    data = request.get_json()
    count = data.get("initialCount")

    if count is None or not isinstance(count, int):
        return jsonify({"status": "error", "message": "initialCount must be an integer"}), 400

    success = update_feed_initial_count(feed_id, count)
    if success:
        return jsonify({
            "status": "success",
            "message": f"Initial count set for feed {feed_id}",
            "initialCount": count
        })
    else:
        return jsonify({"status": "error", "message": "Feed not found"}), 404
