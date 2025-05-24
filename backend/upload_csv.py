import requests

# API endpoint for file upload
UPLOAD_URL = "http://127.0.0.1:5000/upload"

# Path to the CSV file you want to upload
CSV_FILE_PATH = "your_file.csv"  # Change this to your actual file path

# Open the file and send it
with open(CSV_FILE_PATH, 'rb') as file:
    files = {'file': file}
    response = requests.post(UPLOAD_URL, files=files)

# Print the response from the server
print(response.json())
