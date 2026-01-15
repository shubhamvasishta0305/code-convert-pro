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
import io
import csv
import gspread
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

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

# Global clients
gc = None
spreadsheet = None
drive_service = None
DRIVE_FOLDER_NAME = "LMS_Uploads"

def get_sheets_client():
    """Initialize Google Sheets client with service account.

    Important: if a previous init partially succeeded (e.g. authorized but couldn't open the sheet),
    `gc` may be set while `spreadsheet` is still None. So we re-init when either is missing.
    """
    global gc, spreadsheet

    if gc is None or spreadsheet is None:
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            creds_path = os.path.join(base_dir, 'credentials.json')
            creds = Credentials.from_service_account_file(creds_path, scopes=SCOPES)
            gc = gspread.authorize(creds)
            spreadsheet = gc.open_by_key(SPREADSHEET_ID)
        except FileNotFoundError:
            gc = None
            spreadsheet = None
            print("⚠️  credentials.json not found!")
            print("   Please add your Google Service Account credentials.")
            print("   See PYTHON_BACKEND_README.md for setup instructions.")
            raise Exception("Google credentials not configured")
        except Exception as e:
            # Reset so the next request can retry after the user fixes permissions/APIs.
            gc = None
            spreadsheet = None
            raise Exception(
                "Google Sheets connection failed. "
                "Make sure: (1) Sheet is shared with service account email as Editor, "
                "(2) Google Sheets API + Drive API enabled, (3) Spreadsheet ID is correct. "
                f"Original error: {e}"
            )

    return spreadsheet

def get_drive_service():
    """Initialize Google Drive service for file uploads"""
    global drive_service
    
    if drive_service is None:
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            creds_path = os.path.join(base_dir, 'credentials.json')
            creds = Credentials.from_service_account_file(creds_path, scopes=SCOPES)
            drive_service = build('drive', 'v3', credentials=creds)
        except Exception as e:
            print(f"Drive service init error: {e}")
            raise Exception(f"Google Drive connection failed: {e}")
    
    return drive_service

def get_or_create_drive_folder():
    """Get or create the LMS_Uploads folder in Google Drive"""
    try:
        service = get_drive_service()
        
        # Search for existing folder
        query = f"name='{DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        results = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
        folders = results.get('files', [])
        
        if folders:
            return folders[0]['id']
        
        # Create folder if not exists
        folder_metadata = {
            'name': DRIVE_FOLDER_NAME,
            'mimeType': 'application/vnd.google-apps.folder'
        }
        folder = service.files().create(body=folder_metadata, fields='id').execute()
        return folder.get('id')
    except Exception as e:
        print(f"Drive folder error: {e}")
        raise Exception(f"Failed to get/create Drive folder: {e}")

def upload_to_drive(base64_data, filename, mime_type):
    """Upload file to Google Drive and return shareable link (like uploadToDrive in Code.gs)"""
    try:
        service = get_drive_service()
        folder_id = get_or_create_drive_folder()
        
        # Decode base64 data
        file_data = base64.b64decode(base64_data)
        
        # Create file metadata
        file_metadata = {
            'name': filename,
            'parents': [folder_id]
        }
        
        # Upload file
        media = MediaIoBaseUpload(io.BytesIO(file_data), mimetype=mime_type)
        file = service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
        
        # Make file accessible to anyone with link
        permission = {
            'type': 'anyone',
            'role': 'reader'
        }
        service.permissions().create(fileId=file.get('id'), body=permission).execute()
        
        return file.get('webViewLink')
    except Exception as e:
        print(f"Drive upload error: {e}")
        return f"Error: {e}"

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

@app.route('/api/trainees/bulk', methods=['POST'])
def bulk_add_trainees():
    """Bulk add trainees from CSV data"""
    try:
        data = request.json
        batch_code = data.get('batchCode')
        trainees_data = data.get('trainees', [])
        
        if not batch_code:
            return jsonify({'status': 'error', 'message': 'Batch code is required'}), 400
        
        if not trainees_data:
            return jsonify({'status': 'error', 'message': 'No trainees data provided'}), 400
        
        sheet = get_sheet('Trainees')
        added_count = 0
        
        for t in trainees_data:
            name = t.get('name', '').strip()
            if name:  # Only add if name is not empty
                trainee_row = [
                    generate_id(),
                    batch_code,
                    name,
                    t.get('mobile', 'N/A').strip() or 'N/A',
                    t.get('email', 'N/A').strip() or 'N/A',
                    datetime.now().isoformat()
                ]
                sheet.append_row(trainee_row)
                added_count += 1
        
        return jsonify({'status': 'success', 'added': added_count})
    except Exception as e:
        print(f"Bulk add trainees error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/trainees/parse-csv', methods=['POST'])
def parse_csv():
    """Parse CSV file and return trainees data"""
    try:
        if 'file' not in request.files:
            return jsonify({'status': 'error', 'message': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'status': 'error', 'message': 'No file selected'}), 400
        
        # Read CSV content
        content = file.read().decode('utf-8')
        reader = csv.DictReader(io.StringIO(content))
        
        trainees = []
        for row in reader:
            # Handle different possible column names
            name = row.get('student name') or row.get('Student Name') or row.get('name') or row.get('Name') or ''
            mobile = row.get('Mobile number') or row.get('mobile number') or row.get('Mobile') or row.get('mobile') or row.get('Phone') or row.get('phone') or ''
            email = row.get('E-mail id') or row.get('e-mail id') or row.get('Email') or row.get('email') or row.get('E-mail') or row.get('e-mail') or ''
            
            if name.strip():
                trainees.append({
                    'name': name.strip(),
                    'mobile': mobile.strip(),
                    'email': email.strip()
                })
        
        return jsonify({'status': 'success', 'trainees': trainees})
    except Exception as e:
        print(f"Parse CSV error: {e}")
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
    """Save assessment result with Google Drive upload (same as saveAssessmentResult in Code.gs)"""
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
        
        # Upload to Google Drive (same as uploadToDrive in Code.gs)
        video_link = 'Skipped'
        audio_link = 'Skipped'
        
        if data.get('videoData') and data['videoData'].get('data'):
            video_filename = f"{trainee_name}_M{module_num}_Vid.webm"
            video_link = upload_to_drive(data['videoData']['data'], video_filename, 'video/webm')
            print(f"Video uploaded: {video_link}")
        
        if data.get('audioData') and data['audioData'].get('data'):
            audio_filename = f"{trainee_name}_M{module_num}_Aud.webm"
            audio_link = upload_to_drive(data['audioData']['data'], audio_filename, 'audio/webm')
            print(f"Audio uploaded: {audio_link}")
        
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
        ss = get_sheets_client()
        # Touch the API to ensure it's not a half-initialized None.
        title = ss.title
        return jsonify({'status': 'ok', 'message': 'Connected to Google Sheets', 'spreadsheet_id': SPREADSHEET_ID, 'spreadsheet_title': title})
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
