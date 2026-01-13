# Einstein360 LMS - Complete Setup Guide

## Project Structure

```
einstein360-lms/
├── src/                          # React Frontend
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── SetupForm.tsx
│   │   ├── layout/
│   │   │   └── Sidebar.tsx
│   │   └── views/
│   │       ├── Dashboard.tsx
│   │       ├── CreateBatch.tsx
│   │       ├── Attendance.tsx
│   │       ├── Trainees.tsx
│   │       ├── Reviews.tsx
│   │       ├── AddTrainer.tsx
│   │       └── Assessment.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── pages/
│   │   ├── Index.tsx
│   │   ├── AuthPage.tsx
│   │   └── MainApp.tsx
│   ├── services/
│   │   └── api.ts                # API calls to Python backend
│   ├── types/
│   │   └── lms.ts                # TypeScript interfaces
│   └── index.css
├── backend/                       # Python Flask Backend
│   ├── app.py                     # Main Flask application
│   └── requirements.txt
└── README.md
```

## Quick Start

### 1. Start the Python Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The backend will run at `http://localhost:5000`

**Default Login Credentials:**
- Email: `admin@einstein360.com`
- Password: `admin123`

### 2. Start the React Frontend

```bash
npm install
npm run dev
```

The frontend will run at `http://localhost:8080`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/setup` | Complete invited trainer setup |

### Trainers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trainers` | Get all trainers |
| POST | `/api/trainers/invite` | Invite new trainer |

### Batches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/batches?userId=X&role=Y` | Get user's batches |
| POST | `/api/batches` | Create new batch |

### Trainees
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trainees?batchCode=X` | Get trainees by batch |
| POST | `/api/trainees` | Add single trainee |
| GET | `/api/trainees/{id}` | Get trainee details |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/attendance` | Save attendance records |

### Assessments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assessments/questions/{moduleIndex}` | Get questions |
| POST | `/api/assessments/results` | Save assessment result |

### Reviews/Grading
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reviews/pending?userId=X&role=Y` | Get pending reviews |
| POST | `/api/reviews/grade` | Submit grade |

## Features

### For Owners
- Create batches with trainees
- Invite and manage trainers
- View all batches and trainees
- Grade assessments

### For Trainers
- View assigned batches
- Mark attendance
- View trainee profiles
- Conduct assessments
- Grade submissions

### Assessment Flow
1. Select trainee from list
2. Select module to assess
3. Camera & microphone permissions required
4. Record audio answer
5. Submit for grading

## Customization

### Connecting to a Database
Replace the in-memory `db` dictionary in `backend/app.py` with actual database calls:

```python
# Example with SQLAlchemy
from flask_sqlalchemy import SQLAlchemy

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///lms.db'
db = SQLAlchemy(app)
```

### Adding Email Functionality
In `invite_trainer()`, add actual email sending:

```python
import smtplib
from email.mime.text import MIMEText

def send_invite_email(email, name):
    # Configure SMTP and send email
    pass
```

### Cloud Storage for Uploads
Replace local file storage with S3/GCS:

```python
import boto3

def upload_to_s3(file_data, filename):
    s3 = boto3.client('s3')
    s3.put_object(Bucket='your-bucket', Key=filename, Body=file_data)
    return f"https://your-bucket.s3.amazonaws.com/{filename}"
```

## Troubleshooting

### CORS Issues
Make sure Flask-CORS is properly configured:
```python
CORS(app, origins=['http://localhost:8080'])
```

### Camera/Microphone Not Working
- Check browser permissions
- Use HTTPS in production

### API Connection Failed
1. Verify backend is running on port 5000
2. Check `src/services/api.ts` BASE_URL
3. Check browser console for errors

## Production Deployment

### Frontend
```bash
npm run build
# Deploy dist/ folder to Netlify, Vercel, or any static host
```

### Backend
```bash
# Use gunicorn for production
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

Update `src/services/api.ts` to point to production URL:
```typescript
const BASE_URL = 'https://your-api.herokuapp.com/api';
```
