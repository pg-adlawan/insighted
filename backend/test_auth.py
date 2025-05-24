import requests

API_URL = "http://localhost:5000"

# ✅ 1. Register a new user
register_payload = {
    "name": "Teacher A",
    "email": "teachera@example.com",
    "password": "securepassword",
    "role": "teacher"
}

register_response = requests.post(f"{API_URL}/register", json=register_payload)
print("🔐 Register Response:", register_response.status_code, register_response.json())

# ✅ 2. Login with the same user
login_payload = {
    "email": "teachera@example.com",
    "password": "securepassword"
}

login_response = requests.post(f"{API_URL}/login", json=login_payload)
print("🔑 Login Response:", login_response.status_code)
print("Raw Text Response:", login_response.text)

# ✅ 3. Extract token (if successful)
if login_response.status_code == 200:
    token = login_response.json().get("access_token")
    print("✅ Received Token:", token)
else:
    print("❌ Login failed. Check credentials.")

# Step 3: Access Protected Route with Token
headers = {
    "Authorization": f"Bearer {token}"
}
protected_response = requests.get("http://127.0.0.1:5000/protected", headers=headers)
print("🛡️ Protected Response:", protected_response.status_code, protected_response.json())
