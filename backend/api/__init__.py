from flask import Blueprint
from .feeds import feeds_api 
from .dashboard import dashboard_api
from .camera import camera_api

api_bp = Blueprint("api", __name__)

api_bp.register_blueprint(feeds_api)
api_bp.register_blueprint(dashboard_api)
api_bp.register_blueprint(camera_api) 

