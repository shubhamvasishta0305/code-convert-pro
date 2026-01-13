# Einstein360 LMS - Python Backend Setup

This React frontend expects a Python backend running on `http://localhost:5000`.

## Required API Endpoints

Update `src/services/api.ts` to point to your backend URL.

### Authentication
- `POST /api/auth/login` - Login user
  - Body: `{ email, password }`
  - Response: `{ status, user: { id, name, email, role }, message? }`

- `POST /api/auth/register` - Register new user
  - Body: `{ name, email, password, role }`
  - Response: `{ status, user, message? }`

- `POST /api/auth/setup` - Complete invited trainer setup
  - Body: `{ email, password }`
  - Response: `{ status, user, message? }`

### Trainers
- `GET /api/trainers` - Get all trainers
  - Response: `[{ id, name }]`

- `POST /api/trainers/invite` - Invite new trainer
  - Body: `{ name, email }`
  - Response: `{ status, message? }`

### Batches
- `GET /api/batches?userId={id}&role={role}` - Get user's batches
  - Response: `[{ code, name, trainerId, startDate, endDate, maxCapacity }]`

- `POST /api/batches` - Create batch
  - Body: `{ batch_code, batch_name, trainer_id, start_date, end_date, max_capacity, trainees }`
  - Response: `{ status }`

### Trainees
- `GET /api/trainees?batchCode={code}` - Get trainees by batch
  - Response: `[{ id, batchCode, name, mobile, email }]`

- `POST /api/trainees` - Add single trainee
  - Body: `{ batchCode, name, mobile?, email? }`
  - Response: `{ status }`

- `GET /api/trainees/{id}` - Get trainee details
  - Response: `{ status, info, stats, modules, curriculum }`

### Attendance
- `POST /api/attendance` - Save attendance
  - Body: `{ batch_code, date, records: [{ trainee_id, status }] }`
  - Response: `{ status }`

### Assessments
- `GET /api/assessments/questions/{moduleIndex}` - Get questions
  - Response: `{ questions: [{ question }] }`

- `POST /api/assessments/results` - Save assessment result
  - Body: `{ traineeId, traineeName, moduleNum, videoData?, audioData? }`
  - Response: `{ status, attemptCount }`

### Reviews/Grading
- `GET /api/reviews/pending?userId={id}&role={role}` - Get pending reviews
  - Response: `[{ resultId, traineeName, moduleNum, videoLink, audioLink, attempt, date }]`

- `POST /api/reviews/grade` - Submit grade
  - Body: `{ resultId, score }`
  - Response: `{ status }`

## Example Flask Backend Structure

```python
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    # Your authentication logic here
    return jsonify({
        'status': 'success',
        'user': {
            'id': 'USR-123',
            'name': 'Test User',
            'email': data['email'],
            'role': 'Trainer'
        }
    })

# Add other endpoints...

if __name__ == '__main__':
    app.run(port=5000, debug=True)
```

## Running the Frontend

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:8080`
