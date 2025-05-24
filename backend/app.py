from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import os
from dotenv import load_dotenv
import openai
import requests
import json
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_mysqldb import MySQL
import MySQLdb.cursors
from flask import Flask, request, jsonify, session
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity


# Load environment variables from .env
load_dotenv()

# Initialize OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")
client = openai.OpenAI()


# Initialize Flask app

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

# Setup Flask-Login
# SQL Configuration
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = ''
app.config['MYSQL_DB'] = 'insighted'

# Initialize MySQL and Flask-Login
mysql = MySQL(app)
login_manager = LoginManager()
login_manager.init_app(app)

# Initialize JWT + Bcrypt
app.config['JWT_SECRET_KEY'] = 'super-secret-key'  # Change to a strong secret in production
bcrypt = Bcrypt(app)
jwt = JWTManager(app)


def process_csv(file_path):
    try:
        df = pd.read_csv(file_path, dtype=str)
        student_data = []

        for _, row in df.iterrows():
            student = {
                'STUDENT ID': row['STUDENT ID'],
                'STUDENT NAME': row['STUDENT NAME'],
                'AGE': row['AGE'],
                'GENDER': row['GENDER'],
                'YEAR LEVEL': row['YEAR LEVEL'],
                'Section': row['Section'],
                'Date': row['Date'],
            }
            for i in range(1, 51):
                student[f"Answer_{i}"] = int(row[str(i)]) if row[str(i)].isdigit() else 0
            student_data.append(student)

        return student_data
    except Exception as e:
        return [{"error": str(e)}]

def generate_ai_recommendations(dominant_trait):
    prompt = f"""
    A student has a dominant personality trait of {dominant_trait}.
    1. Give a personalized learning recommendation for the student.
    2. Suggest an appropriate teaching strategy for the teacher.
    Format your response like this:

    Student Recommendation: ...
    Teacher Strategy: ...
    """

    try:
        # Use client to call OpenAI
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300
        )

        text = response.choices[0].message.content.strip()
        student_part, _, teacher_part = text.partition("Teacher Strategy:")

        return {
            "student": student_part.replace("Student Recommendation:", "").strip(),
            "teacher": teacher_part.strip() or "No teacher strategy provided."
        }

    except Exception as e:
        print("🔴 OpenAI error:", e)
        return {
            "student": "Error generating student recommendation.",
            "teacher": "Error generating teacher strategy."
        }

# Upload Class List CSV file

@app.route('/teacher/upload-masterlist', methods=['POST'])
@jwt_required()
def upload_masterlist():
    identity = json.loads(get_jwt_identity())
    teacher_id = identity["id"]

    if identity["role"] != "teacher":
        return jsonify({"error": "Only teachers can upload rosters."}), 403

    file = request.files.get('file')
    if not file:
        return jsonify({"error": "No file uploaded."}), 400

    try:
        df = pd.read_csv(file)
        expected_cols = {"STUDENT ID", "STUDENT NAME", "SUBJECT", "ACADEMIC YEAR", "YEAR LEVEL"}
        if not expected_cols.issubset(set(df.columns)):
            return jsonify({"error": "Missing required columns in CSV."}), 400

        cursor = mysql.connection.cursor()
        matched = 0
        unmatched = 0
        unmatched_students = []

        for _, row in df.iterrows():
            student_id = str(row["STUDENT ID"]).strip()
            subject = str(row["SUBJECT"]).strip()
            academic_year = str(row["ACADEMIC YEAR"]).strip()
            year_level = str(row["YEAR LEVEL"]).strip()

            # Check if student exists in psychometric profiles
            cursor.execute("SELECT 1 FROM student_profiles WHERE student_id = %s", (student_id,))
            if cursor.fetchone():
                matched += 1

                # Prevent duplicate student-subject mapping
                cursor.execute("""
                    SELECT 1 FROM student_subjects
                    WHERE student_id = %s AND teacher_id = %s AND subject = %s AND academic_year = %s
                """, (student_id, teacher_id, subject, academic_year))

                if not cursor.fetchone():
                    cursor.execute("""
                        INSERT INTO student_subjects (student_id, teacher_id, subject, academic_year, year_level)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (student_id, teacher_id, subject, academic_year, year_level))
            else:
                unmatched += 1
                unmatched_students.append(student_id)

        mysql.connection.commit()
        cursor.close()

        return jsonify({
            "matched": matched,
            "unmatched": unmatched,
            "unmatched_students": unmatched_students
        })

    except Exception as e:
        print("Error processing masterlist upload:", e)
        return jsonify({"error": "Server error. Please check the CSV and try again."}), 500



# Delete a student from teacher's subject by teacher

@app.route('/teacher/student/<student_id>/delete', methods=['DELETE'])
@jwt_required()
def delete_teacher_student(student_id):
    identity = json.loads(get_jwt_identity())
    teacher_id = identity["id"]

    if identity["role"] != "teacher":
        return jsonify({"error": "Unauthorsized"}), 403

    subject_code = request.args.get("subject_code")
    academic_year = request.args.get("academic_year")

    if not subject_code or not academic_year:
        return jsonify({"error": "Missing parameters"}), 400

    cursor = mysql.connection.cursor()
    cursor.execute("""
        DELETE FROM student_subjects
        WHERE student_id = %s AND teacher_id = %s AND subject_code = %s AND academic_year = %s
    """, (student_id, teacher_id, subject_code, academic_year))

    mysql.connection.commit()
    cursor.close()

    return jsonify({"message": "Student removed from your list."})

# Update (edit) student info by teacher

@app.route('/teacher/student/<student_id>/update', methods=['PUT'])
@jwt_required()
def update_teacher_student(student_id):
    identity = json.loads(get_jwt_identity())
    teacher_id = identity["id"]

    if identity["role"] != "teacher":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    subject_code = data.get("subject_code")
    academic_year = data.get("academic_year")
    new_name = data.get("name")
    new_email = data.get("email")

    if not all([subject_code, academic_year, new_name, new_email]):
        return jsonify({"error": "Missing required fields."}), 400

    cursor = mysql.connection.cursor()
    cursor.execute("""
        UPDATE student_subjects
        SET name = %s, email = %s
        WHERE student_id = %s AND teacher_id = %s AND subject_code = %s AND academic_year = %s
    """, (new_name, new_email, student_id, teacher_id, subject_code, academic_year))

    mysql.connection.commit()
    cursor.close()

    return jsonify({"message": "Student information updated."})


# Upload Assessment Responses (To be Replaced by: /teacher/upload-roster)

@app.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    identity = json.loads(get_jwt_identity())
    user_id = identity['id']
    file_name = file.filename

    # Save with user-specific file name
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"user_{user_id}_latest.csv")
    file.save(file_path)

    # Log in DB
    cursor = mysql.connection.cursor()
    cursor.execute("""
        INSERT INTO processed_files (user_id, file_name)
        VALUES (%s, %s)
    """, (user_id, file_name))
    mysql.connection.commit()
    cursor.close()

    return jsonify({"message": "File uploaded and saved per user."}), 200

# Teacher Dashboard - Student List

@app.route('/students', methods=['GET'])
@jwt_required()
def get_students():
    identity = json.loads(get_jwt_identity())
    teacher_id = identity['id']
    subject = request.args.get('subject')

    cursor = mysql.connection.cursor()

    # Build query to get students linked to this teacher (filtered by subject if present)
    query = "SELECT student_id FROM student_subjects WHERE teacher_id = %s"
    params = [teacher_id]

    if subject:
        query += " AND subject = %s"
        params.append(subject)

    cursor.execute(query, tuple(params))
    student_ids = [row[0] for row in cursor.fetchall()]

    if not student_ids:
        cursor.close()
        return jsonify([])

    # Get student names (from student_profiles or fallback table)
    format_ids = ",".join(["%s"] * len(student_ids))
    cursor.execute(f"""
        SELECT student_id, name
        FROM student_profiles
        WHERE student_id IN ({format_ids})
    """, tuple(student_ids))

    students = [{"student_id": row[0], "name": row[1]} for row in cursor.fetchall()]
    cursor.close()

    return jsonify(students)


# Assess Individual Algorightm

@app.route('/assess/individual', methods=['GET'])
@jwt_required()
def assess_individual():
    student_id = request.args.get('student_id')
    identity = json.loads(get_jwt_identity())
    teacher_id = identity["id"]

    # Confirm that the student is linked to this teacher
    cursor = mysql.connection.cursor()
    cursor.execute("""
        SELECT 1 FROM student_subjects
        WHERE teacher_id = %s AND student_id = %s
    """, (teacher_id, student_id))
    link_exists = cursor.fetchone()

    if not link_exists:
        return jsonify({"error": "This student is not linked to you."}), 403

    # Get the student's trait scores
    cursor.execute("""
        SELECT trait_scores, dominant_trait
        FROM student_profiles
        WHERE student_id = %s
    """, (student_id,))
    profile = cursor.fetchone()
    cursor.close()

    if not profile:
        return jsonify({"error": "Student profile not found"}), 404

    try:
        trait_scores = json.loads(profile[0])
        dominant_trait = profile[1]

        # Score analysis
        highest_score = max(trait_scores.values())
        lowest_score = min(trait_scores.values())

        highest_traits = [trait for trait, score in trait_scores.items() if score == highest_score]
        lowest_traits = [trait for trait, score in trait_scores.items() if score == lowest_score]

        return jsonify({
            "student_id": student_id,
            "dominant_trait": dominant_trait,
            "average_scores": trait_scores,
            "highest_trait": highest_traits[0] if len(highest_traits) == 1 else highest_traits,
            "lowest_trait": lowest_traits[0] if len(lowest_traits) == 1 else lowest_traits
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to parse scores: {str(e)}"}), 500


# Generate AI-Based Individual Insights 

@app.route('/assess/individual-insights', methods=['GET'])
@jwt_required()
def individual_traite_insights():
    import openai
    import os
    import json
    from dotenv import load_dotenv

    load_dotenv()
    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    student_id = request.args.get('student_id')
    identity = json.loads(get_jwt_identity())
    teacher_id = identity['id']

    cursor = mysql.connection.cursor()

    # Confirm student is linked to this teacher
    cursor.execute("""
        SELECT 1 FROM student_subjects
        WHERE student_id = %s AND teacher_id = %s
    """, (student_id, teacher_id))
    if not cursor.fetchone():
        return jsonify({"error": "This student is not linked to you."}), 403

    # Fetch trait_scores from DB
    cursor.execute("""
        SELECT trait_scores FROM student_profiles
        WHERE student_id = %s
    """, (student_id,))
    result = cursor.fetchone()
    cursor.close()

    if not result:
        return jsonify({"error": "Student profile not found"}), 404

    try:
        trait_scores = json.loads(result[0])

        prompt = (
            "You are a psychology-based teaching support AI.\n"
            "Based on the following Big Five trait scores of a student, generate for each trait:\n"
            "1. A one-sentence interpretation of what this score might say about the student's personality.\n"
            "2. A one-sentence teaching recommendation to help teachers handle this student more effectively.\n"
            "Just return a JSON object like this:\n"
            "{ \"TraitName\": { \"interpretation\": \"...\", \"recommendation\": \"...\" } }\n\n"
            f"Scores: {json.dumps(trait_scores)}"
        )

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300
        )

        ai_output = response.choices[0].message.content.strip()
        parsed = json.loads(ai_output)
        return jsonify(parsed), 200

    except Exception as e:
        print("AI insight generation failed:", e)
        return jsonify({"error": "AI failed to generate valid insights."}), 500


# AI-Based Individual Teaching & Learning Recommendations

@app.route('/assess/recommendations', methods=['GET'])
@jwt_required()
def get_recommendations():
    student_id = request.args.get('student_id')

    identity = json.loads(get_jwt_identity())
    user_id = identity['id']
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"user_{user_id}_latest.csv")

    if not os.path.exists(file_path):
        return jsonify({"error": "No data available. Upload a CSV first."}), 400

    results = process_csv(file_path)
    student_data = next((student for student in results if str(student["STUDENT ID"]) == student_id), None)

    if student_data:
        # Calculate trait scores again
        trait_names = {
            "Extraversion": (1, 10),
            "Neuroticism": (11, 20),
            "Agreeableness": (21, 30),
            "Conscientiousness": (31, 40),
            "Openness": (41, 50),
        }

        trait_scores = {}
        max_score = 0
        dominant_traits = []

        for trait, (start, end) in trait_names.items():
            scores = [student_data.get(f"Answer_{i}", 0) for i in range(start, end + 1)]
            avg_score = round(sum(scores) / len(scores), 2)
            trait_scores[trait] = avg_score
            if avg_score > max_score:
                max_score = avg_score
                dominant_traits = [trait]
            elif avg_score == max_score:
                dominant_traits.append(trait)

        dominant_trait = " & ".join(dominant_traits)
        student_data["dominant_trait"] = dominant_trait

        # Now use it for AI generation
        recommendations = generate_ai_recommendations(dominant_trait)

        return jsonify({
            "dominant_trait": dominant_trait,
            "student_recommendation": recommendations.get("student"),
            "teacher_strategy": recommendations.get("teacher")
        })

    return jsonify({"error": f"Student ID {student_id} not found"}), 404


# AI-Based General/Class Teaching Recommendation

@app.route('/get-recommendation', methods=['POST'])
def get_class_recommendation():
    data = request.get_json()
    trait = data.get("dominant_trait", "").lower()

    if not trait:
        return jsonify({"error": "Dominant trait not provided"}), 400

    result = generate_ai_recommendations(trait)

    return jsonify({
        "teacher_strategy": result["teacher"]
    }), 200

def generate_class_recommendation(dominant_trait):
    prompt = f"Based on the class-wide dominant personality trait: {dominant_trait}, provide general study recommendations for students and teaching strategies for educators."

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=300
    )

    text = response.choices[0].message.content.strip()
    student_part, _, teacher_part = text.partition("Teacher Strategy:")
    return {
        "student": student_part.strip(),
        "teacher": teacher_part.strip() if teacher_part else "No teacher strategy found."
    }


# Assess 5 personality trait and display on chart

@app.route('/assess/ocean-averages', methods=['GET'])
@jwt_required()
def get_ocean_averages():
    identity = json.loads(get_jwt_identity())
    teacher_id = identity["id"]
    subject = request.args.get("subject")
    if subject == "All":
        subject = None 

    cursor = mysql.connection.cursor()

    query = "SELECT student_id FROM student_subjects WHERE teacher_id = %s"
    params = [teacher_id]

    if subject:
        query += " AND subject = %s"
        params.append(subject)

    cursor.execute(query, tuple(params))
    student_ids = [row[0] for row in cursor.fetchall()]

    if not student_ids:
        cursor.close()
        return jsonify([])

    format_ids = ",".join(["%s"] * len(student_ids))
    cursor.execute(f"""
        SELECT trait_scores FROM student_profiles
        WHERE student_id IN ({format_ids})
    """, tuple(student_ids))

    rows = cursor.fetchall()
    cursor.close()

    trait_totals = {
        "Openness": 0,
        "Conscientiousness": 0,
        "Extraversion": 0,
        "Agreeableness": 0,
        "Neuroticism": 0
    }
    count = 0

    for row in rows:
        try:
            scores = json.loads(row[0])
            for trait in trait_totals:
                trait_totals[trait] += scores.get(trait, 0)
            count += 1
        except Exception as e:
            print("Error parsing trait_scores:", e)

    if count == 0:
        return jsonify([])

    averages = [
        {"trait": trait, "score": round(total / count, 2)}
        for trait, total in trait_totals.items()
    ]

    return jsonify(averages), 200



#  

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/', methods=['GET'])
def root():
    return jsonify({"message": "Flask backend is running."})


# Teacher Dashboard Stats

@app.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def dashboard_stats():
    identity = json.loads(get_jwt_identity())
    teacher_id = identity["id"]

    subject = request.args.get('subject')
    if subject == "All":
        subject = None

    cursor = mysql.connection.cursor()

    # Get student IDs linked to this teacher and subject
    query = "SELECT student_id FROM student_subjects WHERE teacher_id = %s"
    params = [teacher_id]

    if subject:
        query += " AND subject = %s"
        params.append(subject)
    
    cursor.execute(query, tuple(params))
    student_ids = [row[0] for row in cursor.fetchall()]

    if not student_ids:
        return jsonify({
            "total_students": 0,
            "distinct_traits": 0,
            "most_common_trait": None,
            "last_upload": None
        })

    format_ids = ",".join(["%s"] * len(student_ids))
    cursor.execute(f"""
        SELECT dominant_trait, created_at
        FROM student_profiles
        WHERE student_id IN ({format_ids})
    """, tuple(student_ids))

    rows = cursor.fetchall()
    cursor.close()

    trait_counts = {}
    latest_timestamp = None

    for trait, created_at in rows:
        # Count each trait
        if trait not in trait_counts:
            trait_counts[trait] = 0
        trait_counts[trait] += 1

        # Track latest timestamp
        if not latest_timestamp or created_at > latest_timestamp:
            latest_timestamp = created_at

    most_common_trait = max(trait_counts, key=trait_counts.get)
    distinct_traits = len(trait_counts)

    return jsonify({
        "total_students": len(rows),
        "distinct_traits": distinct_traits,
        "most_common_trait": most_common_trait,
        "last_upload": latest_timestamp.strftime("%Y-%m-%d %H:%M:%S") if latest_timestamp else None
    })


# Get teacher's subject/s

@app.route('/teacher/subjects', methods=['GET'])
@jwt_required()
def get_teacher_subjects():
    identity = json.loads(get_jwt_identity())
    teacher_id = identity["id"]

    cursor = mysql.connection.cursor()
    cursor.execute("""
        SELECT DISTINCT subject
        FROM student_subjects
        WHERE teacher_id = %s
    """, (teacher_id,))
    subjects = [row[0] for row in cursor.fetchall()]
    cursor.close()

    return jsonify(subjects)

@app.route('/assess/dominant-distribution', methods=['GET'])
@jwt_required()
def dominant_trait_distribution():
    identity = json.loads(get_jwt_identity())
    teacher_id = identity["id"]
    subject = request.args.get("subject")
    if subject == "All":
        subject = None

    cursor = mysql.connection.cursor()

    query = "SELECT student_id FROM student_subjects WHERE teacher_id = %s"
    params = [teacher_id]

    if subject:
        query += " AND subject = %s"
        params.append(subject)

    cursor.execute(query, tuple(params))
    student_ids = [row[0] for row in cursor.fetchall()]

    if not student_ids:
        cursor.close()
        return jsonify([])

    format_ids = ",".join(["%s"] * len(student_ids))
    cursor.execute(f"""
        SELECT dominant_trait FROM student_profiles
        WHERE student_id IN ({format_ids})
    """, tuple(student_ids))

    rows = cursor.fetchall()
    cursor.close()

    trait_counts = {}
    for (trait,) in rows:
        if not trait:
            continue
        traits = [t.strip() for t in trait.split("&")]
        for t in traits:
            if t not in trait_counts:
                trait_counts[t] = 0
            trait_counts[t] += 1

    return jsonify([
        { "trait": trait, "count": count }
        for trait, count in trait_counts.items()
    ])


# Assess All Entries

@app.route('/assess/all', methods=['GET'])
@jwt_required()
def assess_all_students():
    identity = json.loads(get_jwt_identity())
    user_id = identity['id']
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"user_{user_id}_latest.csv")

    if not os.path.exists(file_path):
        return jsonify({"error": "No data available. Upload a CSV first."}), 400

    results = process_csv(file_path)
    total_students = len(results)

    # Trait mappings and reverse scoring
    assessment = [
        {"number": 1, "type": 2, "math": "-"},
        {"number": 2, "type": 5, "math": "+"},
        {"number": 3, "type": 1, "math": "-"},
        {"number": 4, "type": 3, "math": "+"},
        {"number": 5, "type": 4, "math": "+"},
        {"number": 6, "type": 2, "math": "+"},
        {"number": 7, "type": 5, "math": "-"},
        {"number": 8, "type": 1, "math": "+"},
        {"number": 9, "type": 3, "math": "-"},
        {"number": 10, "type": 4, "math": "-"},
        {"number": 11, "type": 2, "math": "-"},
        {"number": 12, "type": 5, "math": "+"},
        {"number": 13, "type": 1, "math": "-"},
        {"number": 14, "type": 3, "math": "+"},
        {"number": 15, "type": 4, "math": "+"},
        {"number": 16, "type": 2, "math": "+"},
        {"number": 17, "type": 5, "math": "-"},
        {"number": 18, "type": 1, "math": "+"},
        {"number": 19, "type": 3, "math": "-"},
        {"number": 20, "type": 4, "math": "-"},
        {"number": 21, "type": 2, "math": "-"},
        {"number": 22, "type": 5, "math": "+"},
        {"number": 23, "type": 1, "math": "-"},
        {"number": 24, "type": 3, "math": "+"},
        {"number": 25, "type": 4, "math": "+"},
        {"number": 26, "type": 2, "math": "+"},
        {"number": 27, "type": 5, "math": "-"},
        {"number": 28, "type": 1, "math": "+"},
        {"number": 29, "type": 3, "math": "-"},
        {"number": 30, "type": 4, "math": "-"},
        {"number": 31, "type": 2, "math": "-"},
        {"number": 32, "type": 5, "math": "+"},
        {"number": 33, "type": 1, "math": "-"},
        {"number": 34, "type": 3, "math": "+"},
        {"number": 35, "type": 4, "math": "+"},
        {"number": 36, "type": 2, "math": "+"},
        {"number": 37, "type": 5, "math": "-"},
        {"number": 38, "type": 1, "math": "+"},
        {"number": 39, "type": 3, "math": "-"},
        {"number": 40, "type": 4, "math": "-"},
        {"number": 41, "type": 2, "math": "-"},
        {"number": 42, "type": 5, "math": "+"},
        {"number": 43, "type": 1, "math": "-"},
        {"number": 44, "type": 3, "math": "+"},
        {"number": 45, "type": 4, "math": "+"},
        {"number": 46, "type": 2, "math": "+"},
        {"number": 47, "type": 5, "math": "-"},
        {"number": 48, "type": 1, "math": "+"},
        {"number": 49, "type": 3, "math": "-"},
        {"number": 50, "type": 4, "math": "-"}
    ]

    trait_map = {
        1: "Extraversion",
        2: "Neuroticism",
        3: "Agreeableness",
        4: "Conscientiousness",
        5: "Openness"
    }

    trait_averages = {trait: [] for trait in trait_map.values()}

    for student in results:
        student_trait_scores = {trait: [] for trait in trait_map.values()}

        for i, item in enumerate(assessment):
            raw = int(student.get(f"Answer_{i+1}", 0))
            if item["math"] == "-":
                if raw == 1:
                    score = 5
                elif raw == 2:
                    score = 4
                elif raw == 3:
                    score = 3
                elif raw == 4:
                    score = 2
                elif raw == 5:
                    score = 1
                else:
                    score = 0  # fallback for invalid input
            else:
                score = raw

            trait = trait_map[item["type"]]
            student_trait_scores[trait].append(score)

        for trait, scores in student_trait_scores.items():
            total = sum(scores)
            trait_averages[trait].append(total)


    # Prepare formatted results
    formatted_result = f"<h3>Total Surveys: {total_students}</h3><h3>Trait Analysis:</h3>"
    trait_average_scores = {}
    for trait, scores in trait_averages.items():
        total_score = round(sum(scores) / len(scores))
        trait_average_scores[trait] = total_score

        if total_score <= 30:
            classification = "Low"
            color = "red"
        elif total_score <= 40:
            classification = "Moderate"
            color = "orange"
        else:
            classification = "High"
            color = "green"

        formatted_result += f"<h4>{trait}: <span style='color:{color};'>{total_score} ({classification})</span></h4>"

    dominant_trait = max(trait_average_scores.items(), key=lambda x: x[1])[0]
    class_insight = generate_class_recommendation(dominant_trait)

    return jsonify({
        "result": formatted_result,
        "dominant_trait": dominant_trait,
        "trait_scores": trait_average_scores,
        "total_students": total_students,
        "class_recommendation": class_insight
    }), 200


# Generate AI-powered Insights

@app.route('/get-insights', methods=['GET'])
def get_insights():
    teacher_id = request.args.get('teacher_id')
    subject = request.args.get('subject')

    print("🔍 GET Insights called with:", teacher_id, subject)

    if not teacher_id or subject is None:
        return jsonify({"error": "Missing teacher_id or subject"}), 400

    if subject == "All":
        subject = "General"

    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("""
        SELECT key_findings, recommendations, created_at
        FROM insights
        WHERE teacher_id = %s AND subject = %s
        ORDER BY created_at DESC
        LIMIT 1
    """, (teacher_id, subject))

    row = cursor.fetchone()
    cursor.close()

    if not row:
        return jsonify({"key_findings": [], "recommendations": [], "last_updated": None})

    return jsonify({
        "key_findings": json.loads(row['key_findings']),
        "recommendations": json.loads(row['recommendations']),
        "last_updated": row['created_at'].strftime("%Y-%m-%d %H:%M:%S")
    })

#Student Grouped by dominant trait
@app.route("/teacher/clustered-students", methods=["GET"])
@jwt_required()
def get_clustered_students():
    identity = json.loads(get_jwt_identity())
    teacher_id = identity["id"]
    subject = request.args.get("subject")
    academic_year = request.args.get("academic_year")

    if identity["role"] != "teacher":
        return jsonify({"error": "Unauthorized"}), 403

    cursor = mysql.connection.cursor()

    sql = """
        SELECT s.student_id, sp.name, sp.dominant_trait
        FROM student_subjects s
        JOIN student_profiles sp ON s.student_id = sp.student_id
        WHERE s.teacher_id = %s
    """
    params = [teacher_id]

    if academic_year and academic_year != "All":
        sql += " AND s.academic_year = %s"
        params.append(academic_year)

    if subject and subject != "All":
        sql += " AND s.subject = %s"
        params.append(subject)

    cursor.execute(sql, tuple(params))
    rows = cursor.fetchall()
    cursor.close()

    clusters = {}
    for student_id, name, dominant_trait in rows:
        traits = dominant_trait.split(" & ")
        for trait in traits:
            clusters.setdefault(trait, []).append({"id": student_id, "name": name})

    return jsonify(clusters)


# Cont: AI-powered teaching recommendation per trait for TraitCluster
@app.route("/teacher/trait-intervention", methods=["GET"])
@jwt_required()
def trait_intervention():
    trait = request.args.get("trait")

    if not trait:
        return jsonify({"error": "Missing trait"}), 400

    prompt = (
        f"Based on the Big Five Personality Trait model, provide a JSON object with a single key "
        f"called 'recommendation' that describes classroom teaching strategies suitable for students "
        f"with dominant '{trait}' personality. Be concise and actionable."
    )

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300
        )

        ai_output = response.choices[0].message.content.strip()
        print("🔍 Raw AI output:", ai_output)  # Optional: for debugging

        parsed = json.loads(ai_output)  # Must be a valid JSON object

        return jsonify({
            "trait": trait,
            "recommendation": parsed.get("recommendation", "No recommendation provided.")
        }), 200

    except Exception as e:
        print("❌ AI generation failed:", e)
        return jsonify({"error": "Failed to generate teaching recommendation."}), 500


# Class Profile for generate-key-findings route

@app.route('/class-profile-summary', methods=['GET'])
@jwt_required()
def class_profile_summary():
    identity = json.loads(get_jwt_identity())
    teacher_id = identity['id']
    subject = request.args.get('subject')

    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)

    if subject == "All" or subject is None or subject == "General":
        cursor.execute("""
            SELECT sp.trait_scores, sp.dominant_trait
            FROM student_profiles sp
            JOIN student_subjects ss ON sp.student_id = ss.student_id
            WHERE ss.teacher_id = %s
        """, (teacher_id,))
    else:
        cursor.execute("""
            SELECT sp.trait_scores, sp.dominant_trait
            FROM student_profiles sp
            JOIN student_subjects ss ON sp.student_id = ss.student_id
            WHERE ss.teacher_id = %s AND ss.subject = %s
        """, (teacher_id, subject))

    rows = cursor.fetchall()
    cursor.close()

    if not rows:
        return jsonify({"error": "No student data found."}), 404

    trait_totals = {}
    trait_counts = {}
    dominant_tracker = {}

    for row in rows:
        traits = json.loads(row['trait_scores'])
        for trait, value in traits.items():
            trait_totals[trait] = trait_totals.get(trait, 0) + value
            trait_counts[trait] = trait_counts.get(trait, 0) + 1

        # Track dominant traits
        dom = row['dominant_trait']
        for t in dom.split(" & "):
            dominant_tracker[t] = dominant_tracker.get(t, 0) + 1

    # Compute averages
    average_scores = {
        trait: round(trait_totals[trait] / trait_counts[trait], 2)
        for trait in trait_totals
    }

    # Find highest & lowest scoring traits
    sorted_traits = sorted(average_scores.items(), key=lambda x: x[1], reverse=True)
    highest_trait = sorted_traits[0][0]
    lowest_trait = sorted_traits[-1][0]

    # Most common dominant trait
    most_common_trait = max(dominant_tracker.items(), key=lambda x: x[1])[0]

    return jsonify({
        "average_scores": average_scores,
        "highest_trait": highest_trait,
        "lowest_trait": lowest_trait,
        "most_common_trait": most_common_trait
    })


# Insight Tab: Generate AI-powered Key Finding & Recommendations

@app.route('/generate-key-findings', methods=['POST'])
def generate_key_findings():
    data = request.get_json()
    class_profile = data.get("class_profile", {})
    teacher_id = data.get("teacher_id")
    subject = data.get("subject")

    print("📌 Received payload:", data)

    # Explicit validation
    if not class_profile:
        return jsonify({"error": "Missing class profile"}), 400
    if not teacher_id:
        return jsonify({"error": "Missing teacher_id"}), 400
    if subject is None:
        return jsonify({"error": "Missing subject"}), 400

    if subject == "All":
        subject = "General"

    prompt = (
        f"You are given a class personality analysis. Here are the stats:\n"
        f"- Average Trait Scores: {class_profile.get('average_scores', {})}\n"
        f"- Most Common Dominant Trait: {class_profile.get('most_common_dominant_trait', 'Unknown')}\n"
        f"- Highest Scoring Trait: {class_profile.get('highest_trait', 'Unknown')}\n"
        f"- Lowest Scoring Trait: {class_profile.get('lowest_trait', 'Unknown')}\n\n"
        f"Generate:\n"
        f"1. 3–5 Key Findings summarizing the student group's personality profile.\n"
        f"2. 3–5 Specific Teaching Recommendations.\n\n"
        f"Use bullet points. Be specific. Do not repeat generic traits. Prioritize what’s unique to this group.\n"
        f"Respond in this format:\n"
        f"Key Findings:\n- ...\nRecommendations:\n- ..."
    )

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500
    )

    content = response.choices[0].message.content.strip()
    sections = content.split("Recommendations:")

    key_findings = sections[0].replace("Key Findings:", "").strip().split("\n")
    recommendations = sections[1].strip().split("\n") if len(sections) > 1 else []

    cleaned_findings = [kf.strip("- ").strip() for kf in key_findings if kf.strip()]
    cleaned_recommendations = [r.strip("- ").strip() for r in recommendations if r.strip()]

    # Save to DB
    cursor = mysql.connection.cursor()
    cursor.execute("""
        INSERT INTO insights (teacher_id, subject, key_findings, recommendations)
        VALUES (%s, %s, %s, %s)
    """, (
        teacher_id,
        subject,
        json.dumps(cleaned_findings),
        json.dumps(cleaned_recommendations)
    ))
    mysql.connection.commit()
    cursor.close()

    return jsonify({
        "key_findings": cleaned_findings,
        "recommendations": cleaned_recommendations
    })


# User Class

class User(UserMixin):
    def __init__(self, id, name, email, password):
        self.id = id
        self.name = name
        self.email = email
        self.password = password

@login_manager.user_loader
def load_user(user_id):
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    if user:
        return User(user["id"], user["name"], user["email"], user["password"])
    return None


# Register Endpoint

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'teacher')  # Default role

    if not all([name, email, password]):
        return jsonify({'error': 'Missing fields'}), 400

    cursor = mysql.connection.cursor()
    cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
    if cursor.fetchone():
        return jsonify({'error': 'User already exists'}), 409

    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
    cursor.execute("INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
                   (name, email, hashed_pw, role))
    mysql.connection.commit()
    cursor.close()

    return jsonify({'message': 'User registered successfully'}), 201


# Login Endpoint

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not all([email, password]):
        return jsonify({'error': 'Missing credentials'}), 400

    cursor = mysql.connection.cursor()
    cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
    result = cursor.fetchone()

    if result:
        columns = [col[0] for col in cursor.description]
        user = dict(zip(columns, result))
    else:
        user = None

    cursor.close()

    if user and bcrypt.check_password_hash(user['password'], password):
        access_token = create_access_token(identity=json.dumps({
            "id": user["id"],
            "role": user["role"],
            "name": user["name"]
        }))
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'role': user['role']
            }
        }), 200


    return jsonify({'error': 'Invalid credentials'}), 401


# Logout Endpoint

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out"}), 200

# Test Database
@app.route('/db-test')
def db_test():
    try:
        cursor = mysql.connection.cursor()
        cursor.execute("SELECT DATABASE();")
        result = cursor.fetchone()
        return jsonify({"message": f"✅ Connected to database: {result[0]}"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    current_user = get_jwt_identity()
    return jsonify({
        "message": "This is a protected route.",
        "user": current_user
    }), 200

@app.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    identity = get_jwt_identity()  # This returns the stringified JSON
    try:
        user_info = eval(identity) if isinstance(identity, str) else identity
        return jsonify({
            "id": user_info["id"],
            "role": user_info["role"],
            "name": user_info.get("name", "Unknown")
        }), 200
    except Exception as e:
        return jsonify({"error": "Invalid token structure", "details": str(e)}), 400


################### ADMIN SIDE #############################

# fetch all logged file uploads from all teachers.
@app.route('/admin/processed-files', methods=['GET'])
@jwt_required()
def get_processed_files():
    identity = json.loads(get_jwt_identity())
    if identity["role"] != "admin":
        return jsonify({"error": "Access denied"}), 403

    cursor = mysql.connection.cursor()
    cursor.execute("""
        SELECT 
            f.file_name,
            f.academic_year,
            f.year_level,
            f.date_uploaded,
            u.name AS teacher_name
        FROM uploaded_files f
        JOIN users u ON f.user_id = u.id
        ORDER BY f.date_uploaded DESC
    """)
    results = cursor.fetchall()
    cursor.close()

    data = [
        {
            "file_name": row[0],
            "academic_year": row[1],
            "year_level": row[2],
            "date_uploaded": row[3].strftime("%Y-%m-%d %H:%M:%S"),
            "teacher_name": row[4]
        }
        for row in results
    ]

    return jsonify(data), 200


@app.route('/admin/users', methods=['GET'])
@jwt_required()
def get_all_users():
    identity = json.loads(get_jwt_identity())
    if identity["role"] != "admin":
        return jsonify({"error": "Access forbidden"}), 403

    try:
        cursor = mysql.connection.cursor()
        cursor.execute("""
            SELECT u.id, u.name, u.email, u.role, u.created_at,
                   COUNT(pf.id) AS upload_count
            FROM users u
            LEFT JOIN processed_files pf ON u.id = pf.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        """)
        results = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        users = [dict(zip(columns, row)) for row in results]
        cursor.close()

        return jsonify(users), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Admin Dashboard Stats
@app.route('/admin/stats', methods=['GET'])
@jwt_required()
def get_admin_stats():
    identity = json.loads(get_jwt_identity())
    if identity["role"] != "admin":
        return jsonify({'error': 'Access denied'}), 403

    cursor = mysql.connection.cursor()

    # 1. Total students in student_subjects
    cursor.execute("SELECT COUNT(DISTINCT student_id) FROM student_subjects")
    total_students = cursor.fetchone()[0]

    # 2. Profiles completed this term (assuming current AY is 2024–2025)
    cursor.execute("""
        SELECT COUNT(*) FROM student_profiles
        WHERE created_at >= STR_TO_DATE('2024-06-01', '%Y-%m-%d')
    """)
    completed_this_term = cursor.fetchone()[0]

    # 3. Survey files uploaded
    cursor.execute("SELECT COUNT(*) FROM uploaded_files")
    total_files_uploaded = cursor.fetchone()[0]

    # 4. Active teachers who uploaded at least 1 file
    cursor.execute("""
        SELECT COUNT(DISTINCT user_id)
        FROM uploaded_files
    """)
    active_teachers = cursor.fetchone()[0]

    # 5. Last upload timestamp
    cursor.execute("SELECT MAX(date_uploaded) FROM uploaded_files")
    last_upload = cursor.fetchone()[0]
    last_upload_str = last_upload.strftime('%Y-%m-%d %H:%M:%S') if last_upload else "No uploads yet"

    cursor.close()

    return jsonify({
        "total_students": total_students,
        "profiles_completed": completed_this_term,
        "files_uploaded": total_files_uploaded,
        "active_teachers": active_teachers,
        "last_upload": last_upload_str
    }), 200


# Admin Dashboard - Trait Distribution
@app.route('/admin/trait-distribution', methods=['GET'])
@jwt_required()
def get_trait_distribution():
    identity = json.loads(get_jwt_identity())

    if identity["role"] != "admin":
        return jsonify({"error": "Forbidden"}), 403

    cursor = mysql.connection.cursor()
    cursor.execute("""
        SELECT dominant_trait, COUNT(*) as count
        FROM student_profiles
        GROUP BY dominant_trait
    """)
    results = cursor.fetchall()
    cursor.close()

    # Return data in format suitable for charting
    data = [{"trait": row[0], "count": row[1]} for row in results]
    return jsonify(data), 200

# Admin Dashboard - Student Profie List
@app.route('/admin/student-profiles', methods=['GET'])
@jwt_required()
def get_all_student_profiles():
    identity = json.loads(get_jwt_identity())
    if identity["role"] != "admin":
        return jsonify({"error": "Access denied"}), 403

    cursor = mysql.connection.cursor()
    cursor.execute("""
        SELECT student_id, name, dominant_trait, academic_year, year_level, created_at
        FROM student_profiles
        ORDER BY created_at DESC
    """)
    results = cursor.fetchall()
    cursor.close()

    data = [
        {
            "student_id": row[0],
            "name": row[1],
            "dominant_trait": row[2],
            "academic_year": row[3],
            "year_level": row[4],
            "created_at": row[5].strftime("%Y-%m-%d %H:%M:%S")
        }
        for row in results
    ]

    return jsonify(data), 200

@app.route('/admin/student/<student_id>', methods=['PUT'])
@jwt_required()
def update_student_profile(student_id):
    identity = json.loads(get_jwt_identity())
    if identity["role"] != "admin":
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    name = data.get("name")
    year_level = data.get("year_level")

    if not name or not year_level:
        return jsonify({"error": "Missing name or year level"}), 400

    try:
        cursor = mysql.connection.cursor()
        cursor.execute("""
            UPDATE student_profiles
            SET name = %s, year_level = %s
            WHERE student_id = %s
        """, (name, year_level, student_id))
        mysql.connection.commit()
        cursor.close()
        return jsonify({"message": "Student profile updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admin/student/<student_id>', methods=['DELETE'])
@jwt_required()
def delete_student_profile(student_id):
    identity = json.loads(get_jwt_identity())
    if identity["role"] != "admin":
        return jsonify({"error": "Access denied"}), 403

    try:
        cursor = mysql.connection.cursor()
        cursor.execute("DELETE FROM student_profiles WHERE student_id = %s", (student_id,))
        mysql.connection.commit()
        cursor.close()
        return jsonify({"message": "Student profile deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Admin Psychometric Upload 
@app.route('/admin/upload-psychometric', methods=['POST'])
@jwt_required()
def upload_psychometric_file():
    identity = json.loads(get_jwt_identity())

    if identity["role"] != "admin":
        return jsonify({"error": "Access denied"}), 403

    file = request.files.get('file')
    academic_year = request.form.get('academic_year')

    if not file or not academic_year:
        return jsonify({"error": "Missing file or metadata."}), 400

    try:
        df = pd.read_csv(file)

        # File validation check
        expected_columns = [f"Answer_{i+1}" for i in range(50)] + ["STUDENT ID", "STUDENT NAME", "YEAR LEVEL"]
        for col in expected_columns:
            if col not in df.columns:
                return jsonify({"error": f"Missing column: {col}"}), 400

        # Algorithm Setup
        assessment = [
            {"number": 1, "type": 2, "math": "-"},
            {"number": 2, "type": 5, "math": "+"},
            {"number": 3, "type": 1, "math": "-"},
            {"number": 4, "type": 3, "math": "+"},
            {"number": 5, "type": 4, "math": "+"},
            {"number": 6, "type": 2, "math": "+"},
            {"number": 7, "type": 5, "math": "-"},
            {"number": 8, "type": 1, "math": "+"},
            {"number": 9, "type": 3, "math": "-"},
            {"number": 10, "type": 4, "math": "-"},
            {"number": 11, "type": 2, "math": "-"},
            {"number": 12, "type": 5, "math": "+"},
            {"number": 13, "type": 1, "math": "-"},
            {"number": 14, "type": 3, "math": "+"},
            {"number": 15, "type": 4, "math": "+"},
            {"number": 16, "type": 2, "math": "+"},
            {"number": 17, "type": 5, "math": "-"},
            {"number": 18, "type": 1, "math": "+"},
            {"number": 19, "type": 3, "math": "-"},
            {"number": 20, "type": 4, "math": "-"},
            {"number": 21, "type": 2, "math": "-"},
            {"number": 22, "type": 5, "math": "+"},
            {"number": 23, "type": 1, "math": "-"},
            {"number": 24, "type": 3, "math": "+"},
            {"number": 25, "type": 4, "math": "+"},
            {"number": 26, "type": 2, "math": "+"},
            {"number": 27, "type": 5, "math": "-"},
            {"number": 28, "type": 1, "math": "+"},
            {"number": 29, "type": 3, "math": "-"},
            {"number": 30, "type": 4, "math": "-"},
            {"number": 31, "type": 2, "math": "-"},
            {"number": 32, "type": 5, "math": "+"},
            {"number": 33, "type": 1, "math": "-"},
            {"number": 34, "type": 3, "math": "+"},
            {"number": 35, "type": 4, "math": "+"},
            {"number": 36, "type": 2, "math": "+"},
            {"number": 37, "type": 5, "math": "-"},
            {"number": 38, "type": 1, "math": "+"},
            {"number": 39, "type": 3, "math": "-"},
            {"number": 40, "type": 4, "math": "-"},
            {"number": 41, "type": 2, "math": "-"},
            {"number": 42, "type": 5, "math": "+"},
            {"number": 43, "type": 1, "math": "-"},
            {"number": 44, "type": 3, "math": "+"},
            {"number": 45, "type": 4, "math": "+"},
            {"number": 46, "type": 2, "math": "+"},
            {"number": 47, "type": 5, "math": "-"},
            {"number": 48, "type": 1, "math": "+"},
            {"number": 49, "type": 3, "math": "-"},
            {"number": 50, "type": 4, "math": "-"}
        ]

        trait_map = {
            1: "Extraversion",
            2: "Neuroticism",
            3: "Agreeableness",
            4: "Conscientiousness",
            5: "Openness"
        }
        inserted_count = 0
        skipped_count = 0

        cursor = mysql.connection.cursor()

        skipped_students = []

        for _, row in df.iterrows():
            student_id = str(row["STUDENT ID"]).strip()
            name = str(row["STUDENT NAME"]).strip()
            year_level = str(row["YEAR LEVEL"]).strip()

            # Skip if student profile already exists
            cursor.execute("SELECT 1 FROM student_profiles WHERE student_id = %s AND academic_year = %s", (student_id, academic_year))
            if cursor.fetchone():
                skipped_count += 1
                skipped_students.append(student_id)
                continue

            trait_scores = {trait: [] for trait in trait_map.values()}
            max_score = 0
            dominant_traits = []

            for i, item in enumerate(assessment):
                answer = int(row.get(f"Answer_{i+1}", 0))
                if item["math"] == "-":
                    if answer == 1:
                        score = 5
                    elif answer == 2:
                        score = 4
                    elif answer == 3:
                        score = 3
                    elif answer == 4:
                        score = 2
                    elif answer == 5:
                        score = 1
                    else:
                        score = 0  # fallback for invalid response
                else:
                    score = answer

                trait = trait_map[item["type"]]
                trait_scores[trait].append(score)

            scores_total = {k: sum(v) for k, v in trait_scores.items()}

            for trait, score in scores_total.items():
                if score > max_score:
                    max_score = score
                    dominant_traits = [trait]
                elif score == max_score:
                    dominant_traits.append(trait)

            dominant = " & ".join(dominant_traits)

            # Insert into student_profiles
            cursor.execute("""
                INSERT INTO student_profiles (
                    student_id, name, trait_scores, dominant_trait,
                    academic_year, year_level
                )
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                student_id,
                name,
                json.dumps(scores_total),
                dominant,
                academic_year,
                year_level
            ))
            inserted_count += 1

        mysql.connection.commit()
        cursor.close()

        return jsonify({
            "message": f"Upload complete.",
            "inserted": inserted_count,
            "skipped": skipped_count,
            "skipped_students": skipped_students
        })

    except Exception as e:
        print("Error uploading psychometric file:", e)
        return jsonify({"error": "Upload failed. Check file format or try again."}), 500


@app.route("/generate-password/<pw>")
def generate_password(pw):
    hashed = bcrypt.generate_password_hash(pw).decode("utf-8")
    return jsonify({"hashed_password": hashed})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)