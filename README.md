
# InsightEd 🧠📊  
**A Progressive Web Application for Student Personality Classification and AI-Powered Learning Recommendations**

## 📌 Project Overview

**InsightEd** is a capstone project developed to support educators in understanding student personality profiles through psychometric assessments and AI-generated teaching interventions. It utilizes the **Big Five Personality Model (IPIP-BFFM)** to classify student traits and generate tailored learning suggestions using LLMs (Large Language Models).  

The platform is designed as a **Progressive Web App (PWA)** for accessibility on both desktop and mobile, with role-based dashboards for **Admins** (e.g., Guidance Office) and **Teachers**.

---

## 🛠️ Tech Stack

- **Frontend**: React.js / Laravel Blade + Tailwind CSS + Flowbite  
- **Backend**: Flask (Python), OpenAI API / Ollama (LLM-based)  
- **Database**: MySQL  
- **Authentication**: JWT (flask-jwt-extended)  
- **Deployment**: Localhost / PWA-supported

---

## ⚙️ Features

### ✅ Core Functionalities
- 📥 Upload and process **CSV-based psychometric assessments** (IPIP-BFFM 50-item test)
- 🔢 **Rule-based scoring algorithm** to compute Big Five trait scores (OCEAN)
- 🧠 **AI-generated student recommendations** based on dominant trait(s)
- 📊 Visual dashboards showing trait distribution and class trends
- 🔍 Teacher-side filters: subject, academic year, year level
- 🧾 Admin upload for psychometric profiling per semester
- 🗂️ Group students by dominant trait for batch recommendations

### 🔐 Roles and Access
- **Admin**: Upload psychometric data, manage teachers/students, view institutional insights  
- **Teacher**: Upload class masterlist, generate AI insights, view personalized dashboards

---

## 📈 System Modules

| Module | Description |
|--------|-------------|
| **CSV Intake Module** | Accepts batch uploads of psychometric responses and student masterlists |
| **Trait Scoring Engine** | Applies reverse scoring logic and computes OCEAN scores |
| **LLM Recommendation Engine** | Uses GPT / Ollama models to generate AI suggestions |
| **Teacher Dashboard** | Displays class stats, filters, and student-specific recommendations |
| **Admin Dashboard** | Centralized psychometric uploads, user management, and records tracking |

---

## 📂 Folder Structure (React + Flask Sample)

```
InsightEd/
│
├── client/                  # React frontend
│   ├── src/
│   ├── public/
│   └── ...
│
├── server/                  # Flask backend
│   ├── routes/
│   ├── models/
│   ├── utils/
│   └── app.py
│
├── database/                # MySQL setup scripts
│
├── README.md
└── requirements.txt
```

---

## 🧪 Installation & Setup

### 🖥️ Backend (Flask)
```bash
cd server/
pip install -r requirements.txt
python app.py
```

### 🌐 Frontend (React or Laravel Blade)
```bash
cd client/
npm install
npm run dev
```

---

## 📊 Sample Data Format

### Student Psychometric CSV

| Student ID | Q1 | Q2 | ... | Q50 |
|------------|----|----|-----|-----|
| 2021001    | 3  | 4  | ... | 2   |

### Masterlist Upload

| Student ID | Name          | Email             |
|------------|---------------|-------------------|
| 2021001    | Juan Dela Cruz| juan@email.com    |

---

## 📘 Research Basis

- Based on the **International Personality Item Pool (IPIP)** and **Big Five Factor Model**
- Uses rule-based classification (Low: 10–23, Moderate: 24–36, High: 37–50)
- AI recommendations generated per trait, aligned with behavioral science literature

---

## 📎 License

This project was developed as part of a **capstone requirement** for the **Bachelor of Science in Information Technology, major in Business Technology Management**.  

© 2025 InsightEd Team — All rights reserved.
