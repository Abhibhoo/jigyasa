import os
import json
from threading import Lock

CONFIG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'config', 'feeds_config.json'))
lock = Lock()

def _load_config():
    if not os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, 'w') as f:
            json.dump({"feeds": [], "global_car_count": 0}, f, indent=4)
    with open(CONFIG_PATH, 'r') as f:
        return json.load(f)

def _save_config(data):
    with open(CONFIG_PATH, 'w') as f:
        json.dump(data, f, indent=4)

def get_all_feeds():
    with lock:
        return _load_config()

def add_new_feed(data):
    with lock:
        config = _load_config()
        data['id'] = len(config['feeds'])
        config['feeds'].append(data)
        _save_config(config)
        return {"status": "success", "feed": data}

def update_existing_feed(feed_id, data):
    with lock:
        config = _load_config()
        if 0 <= feed_id < len(config['feeds']):
            config['feeds'][feed_id].update(data)
            _save_config(config)
            return {"status": "success", "feed": config['feeds'][feed_id]}
        return {"status": "error", "message": "Invalid feed id"}, 404

def delete_existing_feed(feed_id):
    with lock:
        config = _load_config()
        if 0 <= feed_id < len(config['feeds']):
            deleted = config['feeds'].pop(feed_id)
            for i, feed in enumerate(config['feeds']):
                feed['id'] = i
            _save_config(config)
            return {"status": "success", "deleted": deleted}
        return {"status": "error", "message": "Invalid feed id"}, 404

def set_global_count(data):
    count = data.get("count")
    if count is None:
        return {"status": "error", "message": "Missing count"}, 400
    with lock:
        config = _load_config()
        config['global_car_count'] = count
        _save_config(config)
        return {"status": "success"}

def update_feed_initial_count(feed_id, count):
    with lock:
        config = _load_config()
        updated = False
        for feed in config["feeds"]:
            if feed.get("id") == feed_id:
                feed["initialCount"] = count
                updated = True
                break
        if updated:
            _save_config(config)
        return updated
