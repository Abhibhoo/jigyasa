import json
import os

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "feeds_config.json")

def load_config():
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)

def get_dashboard_stats():
    config = load_config()

    feeds = config.get("feeds", [])
    global_car_count = config.get("global_car_count", 0)

    total_capacity = 0
    total_available = 0
    active_feed_count = 0

    for feed in feeds:
        if feed.get("status") == "active":
            active_feed_count += 1
        if feed.get("type") == "multicam":
            total_capacity += feed.get("totalSlots", 0)
            total_available += feed.get("availableSlots", 0)

    return {
        "currentCount": global_car_count,
        "totalSpaces": total_capacity,
        "availableSpaces": total_available,
        "activeFeeds": active_feed_count
    }

def get_multicam_feeds():
    config = load_config()
    feeds = config.get("feeds", [])
    multicam_feeds = [f for f in feeds if f.get("type") == "multicam"]
    return multicam_feeds
