import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
import base64
import os

# ✅ Update Google Sheet
def update_google_sheet(plate, status="enter", location="Section A"):
    try:
        scopes = [
            "https://www.googleapis.com/auth/spreadsheets",
        ]

        creds = Credentials.from_service_account_file("service_account.json", scopes=scopes)
        client = gspread.authorize(creds)

        # Define Google Sheet URLs
        sheet1_url = "https://docs.google.com/spreadsheets/d/19T6dYT7cOG1LN4vUJRad1fIOvtgv2mlzhYRy5rLUF50/edit?gid=0#gid=0"
        

        # Load worksheets
        sheet1 = client.open_by_url(sheet1_url).sheet1
        

        # Get current date and time
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H:%M:%S")

        # Determine next IDs
        id1 = len(sheet1.get_all_values())



        # Row format: [id, plate, date, time, status, location, image]
        new_row = [id1, plate, date_str, time_str, status.lower(), location]

        # Append to both sheets
        sheet1.append_row(new_row, value_input_option="USER_ENTERED")


        print(f"✅ Google Sheets updated: {plate} ({status}) at {date_str} {time_str}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ Google Sheet update failed: {e}")
