from flask import Flask
from flask_cors import CORS
from api import api_bp
from services.multicam import main as multicam_main
import threading
import subprocess
import sys

def create_app():
    app = Flask(__name__)
    CORS(app)  

    app.register_blueprint(api_bp)

    return app

def run_anpr():
    try:
        # Use sys.executable to ensure the correct Python interpreter is used
        # Adjust the path to anpr.py as needed
        subprocess.Popen([sys.executable, 'services/anpr.py'])
    except Exception as e:
        print(f"Error starting anpr.py: {e}")

if __name__ == "__main__":
    app = create_app()
    multicam_thread = threading.Thread(target=multicam_main)
    multicam_thread.daemon = True
    multicam_thread.start()

    # Start car_counter processing in a separate thread
    from services.car_counter import main as car_counter_main
    car_counter_thread = threading.Thread(target=car_counter_main)
    car_counter_thread.daemon = True
    car_counter_thread.start()

    # anpr.py is now run separately.

    app.run(debug=True, host='0.0.0.0', port=5000)
