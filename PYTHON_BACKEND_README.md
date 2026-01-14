# Einstein360 LMS - Complete Setup Guide

## 📁 Project Structure

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
│   ├── app.py                     # Flask app (connects to Google Sheets)
│   ├── requirements.txt
│   └── credentials.json           # ⚠️ YOU MUST ADD THIS FILE
└── README.md
```

## 🔧 Google Sheets Setup (REQUIRED)

The backend connects to your Google Sheet: `18rxyKJpDj1jVC-W6_nS3fTPXSwT72d_5yfqz2B-_tLM`

### Step 1: Create Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable these APIs:
   - **Google Sheets API**
   - **Google Drive API**
4. Go to **Credentials** → **Create Credentials** → **Service Account**
5. Fill in details and click **Create**
6. Click on the created service account
7. Go to **Keys** tab → **Add Key** → **Create new key** → **JSON**
8. Download and rename to `credentials.json`
9. Place `credentials.json` in the `backend/` folder

### Step 2: Share Sheet with Service Account

1. Open your Google Sheet
2. Click **Share** button
3. Add the service account email (found in credentials.json as `client_email`)
   - Example: `lms-service@your-project.iam.gserviceaccount.com`
4. Give **Editor** access
5. Click **Send**

## 🚀 Quick Start

### 1. Start Python Backend

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
python app.py
```

Backend runs at: `http://localhost:5000`

### 2. Start React Frontend

```bash
# In project root
npm install
npm run dev
```

Frontend runs at: `http://localhost:8080`

## 📊 Google Sheet Structure

Your sheet should have these tabs (created automatically if missing):

| Sheet | Columns |
|-------|---------|
| **Users** | User ID, Name, Email, Password, Role, Timestamp |
| **Batches** | Batch Code, Batch Name, Trainer ID, Start Date, End Date, Max Capacity, Timestamp |
| **Trainees** | Trainee ID, Batch Code, Name, Mobile, Email, Timestamp |
| **Attendance** | Record ID, Batch Code, Trainee ID, Date, Status, Timestamp |
| **Questions** | Module ID, Module Name, Question Text |
| **Results** | Result ID, Trainee ID, Trainee Name, Module Number, Video Link, Audio Link, Attempt Count, Score, Timestamp |

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (reads from Users sheet) |
| POST | `/api/auth/register` | Register (writes to Users sheet) |
| POST | `/api/auth/setup` | Complete invited trainer setup |

### Trainers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trainers` | Get all trainers from Users sheet |
| POST | `/api/trainers/invite` | Add trainer with PENDING_SETUP |

### Batches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/batches?userId=X&role=Y` | Get batches (filtered by role) |
| POST | `/api/batches` | Create batch + trainees |

### Trainees
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trainees?batchCode=X` | Get trainees by batch |
| POST | `/api/trainees` | Add single trainee |
| GET | `/api/trainees/{id}` | Get trainee details + curriculum |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/attendance` | Save attendance records |

### Assessments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assessments/questions/{moduleIndex}` | Get module questions |
| POST | `/api/assessments/results` | Save assessment with video/audio |

### Reviews/Grading
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reviews/pending?userId=X&role=Y` | Get ungraded results |
| POST | `/api/reviews/grade` | Submit grade |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check Google Sheets connection |

## ⚠️ Troubleshooting

### "credentials.json not found"
- Download credentials.json from Google Cloud Console
- Place it in the `backend/` folder

### "Permission denied" or "Spreadsheet not found"
- Share your Google Sheet with the service account email
- Make sure it has **Editor** access

### "API not enabled"
- Enable **Google Sheets API** in Google Cloud Console
- Enable **Google Drive API** in Google Cloud Console

### CORS Issues
```python
# Already configured in app.py
CORS(app)
```

### Camera/Microphone Not Working
- Check browser permissions
- Use HTTPS in production

## 🔒 Security Notes

- **Never commit `credentials.json` to git!**
- Add to `.gitignore`:
  ```
  backend/credentials.json
  backend/uploads/
  ```
- Service account only accesses sheets you explicitly share

## 📧 Adding Email Functionality

To send actual invitation emails, add SMTP:

```python
import smtplib
from email.mime.text import MIMEText

def send_invite_email(to_email, name, setup_link):
    msg = MIMEText(f'''
        <h3>Welcome to Einstein360</h3>
        <p>You have been invited as a Trainer.</p>
        <p><a href="{setup_link}">Click here to Create Password</a></p>
    ''', 'html')
    
    msg['Subject'] = 'Einstein360 Trainer Invitation'
    msg['From'] = 'your-email@gmail.com'
    msg['To'] = to_email
    
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login('your-email@gmail.com', 'your-app-password')
        server.send_message(msg)
```

## 🚢 Production Deployment

### Frontend
```bash
npm run build
# Deploy dist/ folder to Netlify, Vercel, etc.
```

### Backend
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

Update `src/services/api.ts`:
```typescript
const BASE_URL = 'https://your-api-server.com/api';
```
