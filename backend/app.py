"""
Einstein360 LMS - Flask Backend
Run with: python app.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
from datetime import datetime
import os
import base64

app = Flask(__name__)
CORS(app)

# In-memory database (replace with actual database in production)
db = {
    'users': [],
    'batches': [],
    'trainees': [],
    'attendance': [],
    'questions': [],
    'results': []
}

# Initialize with default owner
db['users'].append({
    'id': 'USR-owner001',
    'name': 'Admin Owner',
    'email': 'admin@einstein360.com',
    'password': 'admin123',
    'role': 'Owner',
    'timestamp': datetime.now().isoformat()
})

# Sample questions
db['questions'] = [
    {'module_id': '1', 'module_name': 'Programming Basics', 'question': 'Explain the concept of variables in programming.'},
    {'module_id': '1', 'module_name': 'Programming Basics', 'question': 'What is the difference between a function and a method?'},
    {'module_id': '2', 'module_name': 'Data Structures', 'question': 'Describe the difference between arrays and linked lists.'},
    {'module_id': '2', 'module_name': 'Data Structures', 'question': 'What is a hash table and when would you use it?'},
    {'module_id': '3', 'module_name': 'Algorithms', 'question': 'Explain the concept of Big O notation.'},
]

def generate_id(prefix=''):
    return f"{prefix}{str(uuid.uuid4())[:8]}"

# ==================== AUTHENTICATION ====================

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email', '').lower()
    password = data.get('password', '')
    
    for user in db['users']:
        if user['email'].lower() == email:
            if user['password'] == 'PENDING_SETUP':
                return jsonify({
                    'status': 'error',
                    'message': 'Account pending. Please check your email to set a password.'
                })
            if user['password'] == password:
                return jsonify({
                    'status': 'success',
                    'user': {
                        'id': user['id'],
                        'name': user['name'],
                        'email': user['email'],
                        'role': user['role']
                    }
                })
    
    return jsonify({'status': 'error', 'message': 'Invalid Credentials'})

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email', '').lower()
    
    # Check if email exists
    for user in db['users']:
        if user['email'].lower() == email:
            return jsonify({'status': 'error', 'message': 'Email already registered'})
    
    new_user = {
        'id': generate_id('USR-'),
        'name': data.get('name'),
        'email': email,
        'password': data.get('password'),
        'role': data.get('role'),
        'timestamp': datetime.now().isoformat()
    }
    db['users'].append(new_user)
    
    return jsonify({
        'status': 'success',
        'user': {
            'id': new_user['id'],
            'name': new_user['name'],
            'email': new_user['email'],
            'role': new_user['role']
        }
    })

@app.route('/api/auth/setup', methods=['POST'])
def complete_setup():
    data = request.json
    email = data.get('email', '').lower()
    password = data.get('password')
    
    for user in db['users']:
        if user['email'].lower() == email:
            user['password'] = password
            return jsonify({
                'status': 'success',
                'user': {
                    'id': user['id'],
                    'name': user['name'],
                    'email': user['email'],
                    'role': user['role']
                }
            })
    
    return jsonify({'status': 'error', 'message': 'User not found'})

# ==================== TRAINERS ====================

@app.route('/api/trainers', methods=['GET'])
def get_trainers():
    trainers = [
        {'id': u['id'], 'name': u['name']}
        for u in db['users'] if u['role'] == 'Trainer'
    ]
    return jsonify(trainers)

@app.route('/api/trainers/invite', methods=['POST'])
def invite_trainer():
    data = request.json
    email = data.get('email', '').lower()
    
    # Check if email exists
    for user in db['users']:
        if user['email'].lower() == email:
            return jsonify({'status': 'error', 'message': 'Email already registered'})
    
    new_user = {
        'id': generate_id('USR-'),
        'name': data.get('name'),
        'email': email,
        'password': 'PENDING_SETUP',
        'role': 'Trainer',
        'timestamp': datetime.now().isoformat()
    }
    db['users'].append(new_user)
    
    # In production, send email here
    print(f"Invitation sent to {email}")
    
    return jsonify({'status': 'success'})

# ==================== BATCHES ====================

@app.route('/api/batches', methods=['GET'])
def get_batches():
    user_id = request.args.get('userId')
    role = request.args.get('role')
    
    if role == 'Owner':
        batches = db['batches']
    else:
        batches = [b for b in db['batches'] if b['trainer_id'] == user_id]
    
    return jsonify([{
        'code': b['code'],
        'name': b['name'],
        'trainerId': b['trainer_id'],
        'startDate': b['start_date'],
        'endDate': b['end_date'],
        'maxCapacity': b['max_capacity']
    } for b in batches])

@app.route('/api/batches', methods=['POST'])
def create_batch():
    data = request.json
    
    new_batch = {
        'code': data['batch_code'],
        'name': data['batch_name'],
        'trainer_id': data['trainer_id'],
        'start_date': data['start_date'],
        'end_date': data['end_date'],
        'max_capacity': data['max_capacity'],
        'timestamp': datetime.now().isoformat()
    }
    db['batches'].append(new_batch)
    
    # Add trainees
    for trainee in data.get('trainees', []):
        if trainee.get('name'):
            db['trainees'].append({
                'id': generate_id('TRN-'),
                'batch_code': data['batch_code'],
                'name': trainee['name'],
                'mobile': trainee.get('mobile', 'N/A'),
                'email': trainee.get('email', 'N/A'),
                'timestamp': datetime.now().isoformat()
            })
    
    return jsonify({'status': 'success'})

# ==================== TRAINEES ====================

@app.route('/api/trainees', methods=['GET'])
def get_trainees():
    batch_code = request.args.get('batchCode')
    trainees = [
        {'id': t['id'], 'batchCode': t['batch_code'], 'name': t['name'], 'mobile': t['mobile'], 'email': t['email']}
        for t in db['trainees'] if t['batch_code'] == batch_code
    ]
    return jsonify(trainees)

@app.route('/api/trainees', methods=['POST'])
def add_trainee():
    data = request.json
    
    db['trainees'].append({
        'id': generate_id('TRN-'),
        'batch_code': data['batchCode'],
        'name': data['name'],
        'mobile': data.get('mobile', 'N/A'),
        'email': data.get('email', 'N/A'),
        'timestamp': datetime.now().isoformat()
    })
    
    return jsonify({'status': 'success'})

@app.route('/api/trainees/<trainee_id>', methods=['GET'])
def get_trainee_details(trainee_id):
    # Find trainee
    trainee = next((t for t in db['trainees'] if t['id'] == trainee_id), None)
    if not trainee:
        return jsonify({'status': 'error', 'message': 'Trainee not found'})
    
    # Calculate attendance
    attendance_records = [a for a in db['attendance'] if a['trainee_id'] == trainee_id]
    total = len(attendance_records)
    present = len([a for a in attendance_records if a['status'] == 'P'])
    percentage = round((present / total * 100)) if total > 0 else 0
    
    # Get module results
    results = [r for r in db['results'] if r['trainee_id'] == trainee_id]
    modules = {}
    for r in results:
        mod_num = r['module_num']
        if mod_num not in modules:
            modules[mod_num] = {'sum': 0, 'count': 0, 'attempts': 0}
        modules[mod_num]['attempts'] += 1
        if r['score'] != '':
            modules[mod_num]['sum'] += float(r['score'])
            modules[mod_num]['count'] += 1
    
    formatted_modules = {}
    for mod, data in modules.items():
        if data['count'] > 0:
            formatted_modules[mod] = {
                'score': str(round(data['sum'] / data['count'], 1)),
                'attempts': data['attempts']
            }
        else:
            formatted_modules[mod] = {'score': 'Pending', 'attempts': data['attempts']}
    
    # Build curriculum from questions
    curriculum = []
    cat_map = {}
    for q in db['questions']:
        cat_name = q['module_name']
        mod_id = q['module_id']
        if cat_name not in cat_map:
            cat_map[cat_name] = set()
        cat_map[cat_name].add(mod_id)
    
    for cat_name, mods in cat_map.items():
        curriculum.append({
            'name': cat_name,
            'modules': sorted(list(mods), key=lambda x: int(x) if x.isdigit() else x)
        })
    
    return jsonify({
        'status': 'success',
        'info': {
            'id': trainee['id'],
            'batch': trainee['batch_code'],
            'name': trainee['name'],
            'mobile': trainee['mobile'],
            'email': trainee['email']
        },
        'stats': {
            'total': total,
            'percentage': percentage
        },
        'modules': formatted_modules,
        'curriculum': curriculum
    })

# ==================== ATTENDANCE ====================

@app.route('/api/attendance', methods=['POST'])
def save_attendance():
    data = request.json
    
    for record in data['records']:
        db['attendance'].append({
            'record_id': generate_id('ATT-'),
            'batch_code': data['batch_code'],
            'trainee_id': record['trainee_id'],
            'date': data['date'],
            'status': record['status'],
            'timestamp': datetime.now().isoformat()
        })
    
    return jsonify({'status': 'success'})

# ==================== ASSESSMENTS ====================

@app.route('/api/assessments/questions/<module_index>', methods=['GET'])
def get_questions(module_index):
    questions = [
        {'question': q['question']}
        for q in db['questions'] if q['module_id'] == module_index
    ]
    
    if not questions:
        questions = [{'question': f'Default Question for Module {module_index}'}]
    
    return jsonify({'questions': questions})

@app.route('/api/assessments/results', methods=['POST'])
def save_result():
    data = request.json
    
    # Count attempts
    attempts = len([r for r in db['results'] 
                   if r['trainee_id'] == data['traineeId'] 
                   and r['module_num'] == data['moduleNum']]) + 1
    
    # Save files (in production, upload to cloud storage)
    video_link = 'Skipped'
    audio_link = 'Skipped'
    
    upload_dir = 'uploads'
    os.makedirs(upload_dir, exist_ok=True)
    
    if data.get('videoData') and data['videoData'].get('data'):
        video_filename = f"{data['traineeName']}_M{data['moduleNum']}_Vid_{attempts}.webm"
        video_path = os.path.join(upload_dir, video_filename)
        with open(video_path, 'wb') as f:
            f.write(base64.b64decode(data['videoData']['data']))
        video_link = f"/uploads/{video_filename}"
    
    if data.get('audioData') and data['audioData'].get('data'):
        audio_filename = f"{data['traineeName']}_M{data['moduleNum']}_Aud_{attempts}.webm"
        audio_path = os.path.join(upload_dir, audio_filename)
        with open(audio_path, 'wb') as f:
            f.write(base64.b64decode(data['audioData']['data']))
        audio_link = f"/uploads/{audio_filename}"
    
    db['results'].append({
        'result_id': generate_id('RES-'),
        'trainee_id': data['traineeId'],
        'trainee_name': data['traineeName'],
        'module_num': data['moduleNum'],
        'video_link': video_link,
        'audio_link': audio_link,
        'attempt_count': attempts,
        'score': '',
        'timestamp': datetime.now().isoformat()
    })
    
    return jsonify({'status': 'success', 'attemptCount': attempts})

# ==================== REVIEWS/GRADING ====================

@app.route('/api/reviews/pending', methods=['GET'])
def get_pending_reviews():
    user_id = request.args.get('userId')
    role = request.args.get('role')
    
    # Get results with no score
    pending = [r for r in db['results'] if r['score'] == '']
    
    if role == 'Trainer':
        # Filter to trainer's batches
        trainer_batches = [b['code'] for b in db['batches'] if b['trainer_id'] == user_id]
        trainer_trainees = [t['id'] for t in db['trainees'] if t['batch_code'] in trainer_batches]
        pending = [r for r in pending if r['trainee_id'] in trainer_trainees]
    
    return jsonify([{
        'resultId': r['result_id'],
        'traineeName': r['trainee_name'],
        'moduleNum': r['module_num'],
        'videoLink': r['video_link'],
        'audioLink': r['audio_link'],
        'attempt': r['attempt_count'],
        'date': r['timestamp'][:10]
    } for r in pending])

@app.route('/api/reviews/grade', methods=['POST'])
def submit_grade():
    data = request.json
    result_id = data['resultId']
    score = data['score']
    
    for r in db['results']:
        if r['result_id'] == result_id:
            r['score'] = str(score)
            return jsonify({'status': 'success'})
    
    return jsonify({'status': 'error', 'message': 'Result not found'})

# ==================== STATIC FILES ====================

@app.route('/uploads/<filename>')
def serve_upload(filename):
    from flask import send_from_directory
    return send_from_directory('uploads', filename)

if __name__ == '__main__':
    print("=" * 50)
    print("Einstein360 LMS Backend")
    print("=" * 50)
    print("Server running at http://localhost:5000")
    print("Default login: admin@einstein360.com / admin123")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)
