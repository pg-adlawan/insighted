import requests

# API endpoint for getting an individual student's results
STUDENT_ID = "123456"  # Change this to an actual Student ID from the CSV
INDIVIDUAL_URL = f"http://127.0.0.1:5000/assess/individual?student_id={STUDENT_ID}"

# Send GET request
response = requests.get(INDIVIDUAL_URL)

# Print the response
print(response.json())
