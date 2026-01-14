"""
Einstein360 LMS - Python Flask Backend
Connects to Google Sheets for data storage (same as original Code.gs)
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
import uuid
import os
import base64
import gspread
from google.oauth2.service_account import Credentials

app = Flask(__name__)
CORS(app)

# ============ GOOGLE SHEETS CONFIG ============
SPREADSHEET_ID = '18rxyKJpDj1jVC-W6_nS3fTPXSwT72d_5yfqz2B-_tLM'
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

# Sheet structure (same as Code.gs checkDatabase())
SHEET_STRUCTURE = {
    'Users': ['User ID', 'Name', 'Email', 'Password', 'Role', 'Timestamp'],
    'Batches': ['Batch Code', 'Batch Name', 'Trainer ID', 'Start Date', 'End Date', 'Max Capacity', 'Timestamp'],
    'Trainees': ['Trainee ID', 'Batch Code', 'Name', 'Mobile', 'Email', 'Timestamp'],
    'Attendance': ['Record ID', 'Batch Code', 'Trainee ID', 'Date', 'Status', 'Timestamp'],
    'Questions': ['Module ID', 'Module Name', 'Question Text'],
    'Results': ['Result ID', 'Trainee ID', 'Trainee Name', 'Module Number', 'Video Link', 'Audio Link', 'Attempt Count', 'Score', 'Timestamp']
}

# Global client
gc = None
spreadsheet = None

def get_sheets_client():
    """Initialize Google Sheets client with service account"""
    global gc, spreadsheet
    if gc is None:
        try:
            creds = Credentials.from_service_account_file('credentials.json', scopes=SCOPES)
            gc = gspread.authorize(creds)
            spreadsheet = gc.open_by_key(SPREADSHEET_ID)
        except FileNotFoundError:
            print("⚠️  credentials.json not found!")
            print("   Please add your Google Service Account credentials.")
            print("   See PYTHON_BACKEND_README.md for setup instructions.")
            raise Exception("Google credentials not configured")
    return spreadsheet

def get_sheet(sheet_name):
    """Get a specific sheet, create if not exists (like checkDatabase in Code.gs)"""
    ss = get_sheets_client()
    try:
        sheet = ss.worksheet(sheet_name)
        # Check if header exists
        if sheet.row_count == 0 or not sheet.row_values(1):
            if sheet_name in SHEET_STRUCTURE:
                sheet.append_row(SHEET_STRUCTURE[sheet_name])
    except gspread.WorksheetNotFound:
        sheet = ss.add_worksheet(title=sheet_name, rows=1000, cols=20)
        if sheet_name in SHEET_STRUCTURE:
            sheet.append_row(SHEET_STRUCTURE[sheet_name])
    return sheet

def check_database():
    """Ensure all sheets exist with headers (same as checkDatabase in Code.gs)"""
    ss = get_sheets_client()
    for sheet_name, headers in SHEET_STRUCTURE.items():
        try:
            sheet = ss.worksheet(sheet_name)
            if sheet.row_count == 0 or not sheet.row_values(1):
                sheet.append_row(headers)
        except gspread.WorksheetNotFound:
            sheet = ss.add_worksheet(title=sheet_name, rows=1000, cols=20)
            sheet.append_row(headers)

def generate_id(prefix=''):
    return f"{prefix}{uuid.uuid4().hex[:8]}"

# ==================== AUTHENTICATION ====================

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user - reads from Users sheet (same as loginUser in Code.gs)"""
    try:
        data = request.json
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        sheet = get_sheet('Users')
        rows = sheet.get_all_values()
        
        for i, row in enumerate(rows[1:], start=2):  # Skip header
            if len(row) >= 5 and row[2].lower().strip() == email:
                # Check for pending setup
                if row[3] == 'PENDING_SETUP':
                    return jsonify({
                        'status': 'error',
                        'message': 'Account pending. Please check your email to set a password.'
                    })
                # Check password
                if row[3] == password:
                    return jsonify({
                        'status': 'success',
                        'user': {
                            'id': row[0],
                            'name': row[1],
                            'email': row[2],
                            'role': row[4]
                        }
                    })
        
        return jsonify({'status': 'error', 'message': 'Invalid Credentials'})
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register new user - writes to Users sheet"""
    try:
        data = request.json
        email = data.get('email', '').lower().strip()
        
        sheet = get_sheet('Users')
        rows = sheet.get_all_values()
        
        # Check if email exists
        for row in rows[1:]:
            if len(row) >= 3 and row[2].lower().strip() == email:
                return jsonify({'status': 'error', 'message': 'Email already registered'})
        
        # Create new user
        user_id = generate_id('USR-')
        new_row = [
            user_id,
            data.get('name', ''),
            email,
            data.get('password', ''),
            data.get('role', 'Trainer'),
            datetime.now().isoformat()
        ]
        sheet.append_row(new_row)
        
        return jsonify({
            'status': 'success',
            'user': {
                'id': user_id,
                'name': data.get('name'),
                'email': email,
                'role': data.get('role')
            }
        })
    except Exception as e:
        print(f"Register error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/auth/setup', methods=['POST'])
def complete_setup():
    """Complete trainer setup - updates password (same as completeSetup in Code.gs)"""
    try:
        data = request.json
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        sheet = get_sheet('Users')
        rows = sheet.get_all_values()
        
        for i, row in enumerate(rows[1:], start=2):
            if len(row) >= 5 and row[2].lower().strip() == email:
                # Update password (column 4)
                sheet.update_cell(i, 4, password)
                return jsonify({
                    'status': 'success',
                    'user': {
                        'id': row[0],
                        'name': row[1],
                        'email': row[2],
                        'role': row[4]
                    }
                })
        
        return jsonify({'status': 'error', 'message': 'User not found'})
    except Exception as e:
        print(f"Setup error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ==================== TRAINERS ====================

@app.route('/api/trainers', methods=['GET'])
def get_trainers():
    """Get all trainers (same as getAllTrainers in Code.gs)"""
    try:
        sheet = get_sheet('Users')
        rows = sheet.get_all_values()
        
        trainers = []
        for row in rows[1:]:
            if len(row) >= 5 and row[4] == 'Trainer':
                trainers.append({'id': row[0], 'name': row[1]})
        
        return jsonify(trainers)
    except Exception as e:
        print(f"Get trainers error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/trainers/invite', methods=['POST'])
def invite_trainer():
    """Invite new trainer (same as inviteTrainer in Code.gs)"""
    try:
        data = request.json
        email = data.get('email', '').lower().strip()
        name = data.get('name', '')
        
        sheet = get_sheet('Users')
        rows = sheet.get_all_values()
        
        # Check if email exists
        for row in rows[1:]:
            if len(row) >= 3 and row[2].lower().strip() == email:
                return jsonify({'status': 'error', 'message': 'Email registered'})
        
        # Create new trainer with PENDING_SETUP
        user_id = generate_id('USR-')
        new_row = [
            user_id,
            name,
            email,
            'PENDING_SETUP',
            'Trainer',
            datetime.now().isoformat()
        ]
        sheet.append_row(new_row)
        
        # Note: Email sending requires SMTP setup
        # For now, return success with setup link info
        print(f"📧 Invitation for {email}: /auth?mode=setup&email={email}")
        
        return jsonify({'status': 'success'})
    except Exception as e:
        print(f"Invite trainer error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ==================== BATCHES ====================

@app.route('/api/batches', methods=['GET'])
def get_batches():
    """Get batches filtered by role (same as getMyBatches in Code.gs)"""
    try:
        user_id = request.args.get('userId')
        role = request.args.get('role')
        
        sheet = get_sheet('Batches')
        rows = sheet.get_all_values()
        
        batches = []
        for row in rows[1:]:
            if len(row) >= 4:
                # If not Owner, filter by trainer_id
                if role != 'Owner' and row[2].strip() != user_id:
                    continue
                batches.append({
                    'code': row[0],
                    'name': row[1],
                    'trainerId': row[2],
                    'startDate': row[3] if len(row) > 3 else '',
                    'endDate': row[4] if len(row) > 4 else '',
                    'maxCapacity': row[5] if len(row) > 5 else ''
                })
        
        return jsonify(batches)
    except Exception as e:
        print(f"Get batches error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/batches', methods=['POST'])
def create_batch():
    """Create new batch with trainees (same as createBatch in Code.gs)"""
    try:
        data = request.json
        
        batch_sheet = get_sheet('Batches')
        trainee_sheet = get_sheet('Trainees')
        
        # Add batch
        batch_row = [
            data.get('batch_code'),
            data.get('batch_name'),
            data.get('trainer_id'),
            data.get('start_date', ''),
            data.get('end_date', ''),
            data.get('max_capacity', 0),
            datetime.now().isoformat()
        ]
        batch_sheet.append_row(batch_row)
        
        # Add trainees
        trainees = data.get('trainees', [])
        for t in trainees:
            if t.get('name'):
                trainee_row = [
                    generate_id(),
                    data.get('batch_code'),
                    t.get('name', ''),
                    t.get('mobile', 'N/A'),
                    t.get('email', 'N/A'),
                    datetime.now().isoformat()
                ]
                trainee_sheet.append_row(trainee_row)
        
        return jsonify({'status': 'success'})
    except Exception as e:
        print(f"Create batch error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ==================== TRAINEES ====================

@app.route('/api/trainees', methods=['GET'])
def get_trainees():
    """Get trainees by batch (same as getTraineesByBatch in Code.gs)"""
    try:
        batch_code = request.args.get('batchCode')
        
        sheet = get_sheet('Trainees')
        rows = sheet.get_all_values()
        
        trainees = []
        for row in rows[1:]:
            if len(row) >= 4 and row[1] == batch_code:
                trainees.append({
                    'id': row[0],
                    'batchCode': row[1],
                    'name': row[2],
                    'mobile': row[3] if len(row) > 3 else '',
                    'email': row[4] if len(row) > 4 else ''
                })
        
        return jsonify(trainees)
    except Exception as e:
        print(f"Get trainees error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/trainees', methods=['POST'])
def add_trainee():
    """Add single trainee (same as addSingleTrainee in Code.gs)"""
    try:
        data = request.json
        
        sheet = get_sheet('Trainees')
        trainee_row = [
            generate_id(),
            data.get('batchCode'),
            data.get('name', ''),
            data.get('mobile', 'N/A'),
            data.get('email', 'N/A'),
            datetime.now().isoformat()
        ]
        sheet.append_row(trainee_row)
        
        return jsonify({'status': 'success'})
    except Exception as e:
        print(f"Add trainee error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/trainees/<trainee_id>', methods=['GET'])
def get_trainee_details(trainee_id):
    """Get trainee details with stats (same as getTraineeDetails in Code.gs)"""
    try:
        # 1. Get trainee info
        trainee_sheet = get_sheet('Trainees')
        trainee_rows = trainee_sheet.get_all_values()
        
        trainee_data = None
        for row in trainee_rows[1:]:
            if len(row) >= 5 and row[0] == trainee_id:
                trainee_data = row
                break
        
        if not trainee_data:
            return jsonify({'status': 'error', 'message': 'Trainee not found'})
        
        # 2. Calculate attendance stats
        att_sheet = get_sheet('Attendance')
        att_rows = att_sheet.get_all_values()
        
        total_att = 0
        present_count = 0
        for row in att_rows[1:]:
            if len(row) >= 5 and row[2] == trainee_id:
                total_att += 1
                if row[4] == 'P':
                    present_count += 1
        
        percentage = round((present_count / total_att * 100)) if total_att > 0 else 0
        
        # 3. Calculate module results
        results_sheet = get_sheet('Results')
        results_rows = results_sheet.get_all_values()
        
        mod_calc = {}
        for row in results_rows[1:]:
            if len(row) >= 8 and row[1] == trainee_id:
                mod_num = row[3]
                score = row[7]
                
                if mod_num not in mod_calc:
                    mod_calc[mod_num] = {'sum': 0, 'count': 0, 'total_attempts': 0}
                
                mod_calc[mod_num]['total_attempts'] += 1
                if score and score != '':
                    try:
                        mod_calc[mod_num]['sum'] += float(score)
                        mod_calc[mod_num]['count'] += 1
                    except ValueError:
                        pass
        
        modules = {}
        for k, v in mod_calc.items():
            if v['count'] > 0:
                modules[k] = {
                    'score': str(round(v['sum'] / v['count'], 1)),
                    'attempts': v['total_attempts']
                }
            else:
                modules[k] = {'score': 'Pending', 'attempts': v['total_attempts']}
        
        # 4. Build curriculum from Questions sheet (dynamic like Code.gs)
        questions_sheet = get_sheet('Questions')
        q_rows = questions_sheet.get_all_values()
        
        cat_map = {}
        for row in q_rows[1:]:
            if len(row) >= 2 and row[0] and row[1]:
                mod_id = row[0]
                cat_name = row[1]
                
                if cat_name not in cat_map:
                    cat_map[cat_name] = set()
                cat_map[cat_name].add(mod_id)
        
        curriculum = []
        for cat_name, mod_set in cat_map.items():
            sorted_mods = sorted(list(mod_set), key=lambda x: (int(x) if x.isdigit() else float('inf'), x))
            curriculum.append({'name': cat_name, 'modules': sorted_mods})
        
        return jsonify({
            'status': 'success',
            'info': {
                'id': trainee_data[0],
                'batch': trainee_data[1],
                'name': trainee_data[2],
                'mobile': trainee_data[3] if len(trainee_data) > 3 else '',
                'email': trainee_data[4] if len(trainee_data) > 4 else ''
            },
            'stats': {'total': total_att, 'percentage': percentage},
            'modules': modules,
            'curriculum': curriculum
        })
    except Exception as e:
        print(f"Get trainee details error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ==================== ATTENDANCE ====================

@app.route('/api/attendance', methods=['POST'])
def save_attendance():
    """Save attendance records (same as saveAttendance in Code.gs)"""
    try:
        data = request.json
        batch_code = data.get('batch_code')
        date = data.get('date')
        records = data.get('records', [])
        
        sheet = get_sheet('Attendance')
        
        for record in records:
            att_row = [
                generate_id(),
                batch_code,
                record.get('trainee_id'),
                date,
                record.get('status'),
                datetime.now().isoformat()
            ]
            sheet.append_row(att_row)
        
        return jsonify({'status': 'success'})
    except Exception as e:
        print(f"Save attendance error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ==================== ASSESSMENTS ====================

@app.route('/api/assessments/questions/<module_index>', methods=['GET'])
def get_questions(module_index):
    """Get questions for a module (same as getTestSetupData in Code.gs)"""
    try:
        sheet = get_sheet('Questions')
        rows = sheet.get_all_values()
        
        questions = []
        for row in rows[1:]:
            if len(row) >= 3 and str(row[0]) == str(module_index):
                questions.append({'question': row[2]})
        
        if not questions:
            questions = [{'question': f'No questions found for Module {module_index}'}]
        
        return jsonify({'questions': questions})
    except Exception as e:
        print(f"Get questions error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/assessments/results', methods=['POST'])
def save_result():
    """Save assessment result (same as saveAssessmentResult in Code.gs)"""
    try:
        data = request.json
        trainee_id = data.get('traineeId')
        trainee_name = data.get('traineeName')
        module_num = data.get('moduleNum')
        
        # Get existing attempts
        results_sheet = get_sheet('Results')
        results_rows = results_sheet.get_all_values()
        
        attempts = 1
        for row in results_rows[1:]:
            if len(row) >= 4 and row[1] == trainee_id and str(row[3]) == str(module_num):
                attempts += 1
        
        # Handle file uploads (save locally like uploadToDrive in Code.gs)
        video_link = 'Skipped'
        audio_link = 'Skipped'
        
        upload_dir = 'uploads'
        os.makedirs(upload_dir, exist_ok=True)
        
        if data.get('videoData') and data['videoData'].get('data'):
            video_filename = f"{trainee_name}_M{module_num}_Vid_{attempts}.webm"
            video_path = os.path.join(upload_dir, video_filename)
            with open(video_path, 'wb') as f:
                f.write(base64.b64decode(data['videoData']['data']))
            video_link = f"/uploads/{video_filename}"
        
        if data.get('audioData') and data['audioData'].get('data'):
            audio_filename = f"{trainee_name}_M{module_num}_Aud_{attempts}.webm"
            audio_path = os.path.join(upload_dir, audio_filename)
            with open(audio_path, 'wb') as f:
                f.write(base64.b64decode(data['audioData']['data']))
            audio_link = f"/uploads/{audio_filename}"
        
        # Add result to sheet
        result_row = [
            generate_id('RES-'),
            trainee_id,
            trainee_name,
            module_num,
            video_link,
            audio_link,
            attempts,
            '',  # Score (empty until graded)
            datetime.now().isoformat()
        ]
        results_sheet.append_row(result_row)
        
        return jsonify({'status': 'success', 'attemptCount': attempts})
    except Exception as e:
        print(f"Save result error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ==================== REVIEWS/GRADING ====================

@app.route('/api/reviews/pending', methods=['GET'])
def get_pending_reviews():
    """Get pending reviews (same as getPendingReviews in Code.gs)"""
    try:
        user_id = request.args.get('userId')
        role = request.args.get('role')
        
        results_sheet = get_sheet('Results')
        results_rows = results_sheet.get_all_values()
        
        # Filter ungraded results (empty score)
        pending = []
        for row in results_rows[1:]:
            if len(row) >= 9 and (len(row) < 8 or row[7] == '' or row[7] is None):
                pending.append(row)
        
        # If Trainer, filter by their batches
        if role == 'Trainer':
            # Get trainer's batches
            batch_sheet = get_sheet('Batches')
            batch_rows = batch_sheet.get_all_values()
            my_batches = [r[0] for r in batch_rows[1:] if len(r) >= 3 and r[2].strip() == user_id]
            
            # Get trainees in those batches
            trainee_sheet = get_sheet('Trainees')
            trainee_rows = trainee_sheet.get_all_values()
            my_trainees = [r[0] for r in trainee_rows[1:] if len(r) >= 2 and r[1] in my_batches]
            
            # Filter pending results
            pending = [r for r in pending if r[1] in my_trainees]
        
        reviews = []
        for row in pending:
            reviews.append({
                'resultId': row[0],
                'traineeName': row[2] if len(row) > 2 else '',
                'moduleNum': row[3] if len(row) > 3 else '',
                'videoLink': row[4] if len(row) > 4 else '',
                'audioLink': row[5] if len(row) > 5 else '',
                'attempt': row[6] if len(row) > 6 else 1,
                'date': row[8][:10] if len(row) > 8 and row[8] else ''
            })
        
        return jsonify(reviews)
    except Exception as e:
        print(f"Get pending reviews error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/reviews/grade', methods=['POST'])
def submit_grade():
    """Submit grade (same as submitGrade in Code.gs)"""
    try:
        data = request.json
        result_id = data.get('resultId')
        score = data.get('score')
        
        sheet = get_sheet('Results')
        rows = sheet.get_all_values()
        
        for i, row in enumerate(rows[1:], start=2):
            if row[0] == result_id:
                # Update score (column 8)
                sheet.update_cell(i, 8, score)
                return jsonify({'status': 'success'})
        
        return jsonify({'status': 'error', 'message': 'ID Not Found'})
    except Exception as e:
        print(f"Submit grade error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ==================== STATIC FILES ====================

@app.route('/uploads/<filename>')
def serve_upload(filename):
    return send_from_directory('uploads', filename)

# ==================== HEALTH CHECK ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Check if API and Google Sheets connection is working"""
    try:
        get_sheets_client()
        return jsonify({'status': 'ok', 'message': 'Connected to Google Sheets', 'spreadsheet_id': SPREADSHEET_ID})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    print("=" * 60)
    print("🦉 Einstein360 LMS Backend")
    print("=" * 60)
    print(f"📊 Spreadsheet ID: {SPREADSHEET_ID}")
    print("")
    
    try:
        print("Connecting to Google Sheets...")
        check_database()
        print("✅ Connected successfully!")
    except Exception as e:
        print(f"⚠️  Could not connect to Google Sheets: {e}")
        print("")
        print("To fix this:")
        print("1. Download credentials.json from Google Cloud Console")
        print("2. Place it in the backend/ folder")
        print("3. Share your Google Sheet with the service account email")
        print("")
        print("See PYTHON_BACKEND_README.md for detailed instructions")
    
    print("")
    print("🚀 Starting server at http://localhost:5000")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
