# HireMind

**AI-Powered Recruitment & Interview Preparation Platform**

HireMind helps **students** prepare for real job interviews through CV analysis, timed assessments, and live AI video interviews — while giving **companies** tools to post jobs and track applicants.

Built as a graduation project with a modern full-stack architecture and dedicated Python AI microservices.

---

## Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Database Schema](#database-schema)
- [User Roles & Routes](#user-roles--routes)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [License](#license)

---

## Features

### For Students
- **Signup & onboarding** — experience, tools, and skills wizard
- **CV Analysis** — upload PDF/DOCX and get AI scoring, ATS feedback, and skill matching
- **Pre-Assessment** — timed MCQ questions with score tracking
- **AI Interview** — real-time video/audio interview with coaching feedback
- **My Report** — combined scores, strengths, and improvement areas
- **Payment** — subscription plans via Stripe
- **Settings** — profile and password management

### For Companies
- **Company signup** — company info and address (no CV/skills required)
- **Company dashboard** — jobs posted and applicant overview
- **Add Job** — post jobs with name, description, requirements, experience, location, and salary
- **My Jobs** — manage listings and view applicant counts
- **Settings** — profile management

### For Admins
- **Admin dashboard** — user management and role filtering

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User (Web Browser)                      │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────┐
│          Frontend — React + Vite + Tailwind CSS             │
│                    (localhost:5173)                         │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │ Axios + JWT       │ Axios            │ WebSocket
┌──────▼──────┐   ┌───────▼────────┐   ┌─────▼──────────────┐
│   Backend   │   │  CV Analysis   │   │   Vision AI        │
│ Node.js +   │   │ Python FastAPI │   │ Python FastAPI     │
│  Express    │   │  (port 8000)   │   │  (port 3000)       │
│ (port 5000) │   │ spaCy, ST, PDF │   │ DeepFace, Vosk, CV │
└──────┬──────┘   └────────────────┘   └────────────────────┘
       │ Mongoose
┌──────▼──────┐         ┌─────────────────────┐
│  MongoDB    │         │  OpenRouter API     │
│   Atlas     │         │  (Gemma — questions)│
└─────────────┘         └─────────────────────┘
```

The system uses a **decoupled architecture**: the Node.js backend handles auth, business logic, and data; Python services handle heavy AI workloads independently.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router, Axios, React Query |
| **Backend** | Node.js, Express 5, Mongoose, JWT, bcryptjs, Stripe |
| **Database** | MongoDB Atlas |
| **CV AI** | Python, FastAPI, spaCy, sentence-transformers, pdfplumber |
| **Interview AI** | Python, FastAPI, WebSockets, DeepFace, Vosk, OpenCV |
| **Question AI** | OpenRouter API (Gemma model) |
| **Security** | Helmet, CORS, express-rate-limit, express-validator |

---

## Project Structure

```
HireMind/
├── Front end/                  # React frontend application
│   ├── src/
│   │   ├── pages/              # All app pages (student, company, admin)
│   │   ├── components/         # Reusable UI components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── apis/               # Axios API modules
│   │   ├── utils/              # Helpers (e.g. company jobs localStorage)
│   │   └── data/               # Static form options & questions
│   └── package.json
│
├── Back end/                   # Node.js REST API
│   ├── controllers/            # Business logic
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # API route definitions
│   ├── middleware/             # Auth, validation, rate limiting
│   ├── config/                 # DB & payment plans
│   └── server.js               # Entry point
│
├── AI models/
│   ├── CV-Analysis/            # CV parsing & scoring service (port 8000)
│   └── vision/                 # AI interview service (port 3000)
│
├── GP_Discussion_Guide.md      # Graduation project viva preparation
└── README.md                   # This file
```

---

## Prerequisites

Before running the project, make sure you have:

- **Node.js** 18+ and npm
- **Python** 3.10+
- **MongoDB Atlas** account (or local MongoDB)
- **Stripe** account (for payments — optional for local dev)
- **OpenRouter API key** (for AI question generation — optional)
- **Vosk speech model** (for AI interview — see [Vision setup](#3-ai-interview-service-port-3000))

---

## Getting Started

Clone the repository and set up each service separately.

### 1. Backend (port 5000)

```bash
cd "Back end"
npm install
```

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Fill in your values (see [Environment Variables](#environment-variables)), then start:

```bash
npm run dev
# Server runs at http://localhost:5000
```

### 2. Frontend (port 5173)

```bash
cd "Front end"
npm install
npm run dev
# App runs at http://localhost:5173
```

> **Note:** Update API URLs in `Front end/src/apis/axios.js` if you want to point to a local backend instead of the deployed Railway URL.

### 3. CV Analysis Service (port 8000)

```bash
cd "AI models/CV-Analysis"
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
python -m spacy download en_core_web_sm

uvicorn main:app --reload --host 0.0.0.0 --port 8000
# API docs at http://localhost:8000/docs
```

### 4. AI Interview Service (port 3000)

```bash
cd "AI models/vision"
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Download the [Vosk English model](https://alphacephei.com/vosk/models) and set the path:

```bash
# Windows (PowerShell)
$env:VOSK_MODEL_PATH="C:\path\to\vosk-model-en-us-0.22"

# macOS / Linux
export VOSK_MODEL_PATH="/path/to/vosk-model-en-us-0.22"
```

Start the server:

```bash
python main.py
# WebSocket at ws://localhost:3000/ws/{session_id}
```

### Run All Services

| Service | Port | Command |
|---------|------|---------|
| Frontend | 5173 | `npm run dev` (in `Front end/`) |
| Backend | 5000 | `npm run dev` (in `Back end/`) |
| CV Analysis | 8000 | `uvicorn main:app --reload --port 8000` |
| AI Interview | 3000 | `python main.py` |

---

## Environment Variables

### Backend (`Back end/.env`)

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

# Stripe (optional — for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLIENT_URL=http://localhost:5173

# AI question generation (optional)
OPENROUTER_API_KEY=your_openrouter_key
```

### Frontend (optional)

Create `Front end/.env` if needed:

```env
VITE_INTERVIEW_WS_URL=ws://localhost:3000
```

---

## API Overview

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register student or company |
| POST | `/api/auth/login` | Login and receive JWT |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get user profile & scores |
| PUT | `/api/users/profile` | Update profile |
| PUT | `/api/users/password` | Change password |

### Jobs & Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs` | Create job (company) |
| GET | `/api/jobs` | List jobs |
| POST | `/api/applications` | Student applies to job |
| GET | `/api/applications/:jobId` | Get applicants for a job |

### Assessments & AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assessments` | Create assessment |
| POST | `/api/ai/create-and-generate` | AI-generate assessment questions |
| GET | `/api/pre-assessments` | Get pre-assessment questions |
| POST | `/api/results` | Submit assessment results |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookings/checkout` | Create Stripe checkout session |
| POST | `/api/bookings/webhook` | Stripe webhook handler |

### CV Analysis (Python — port 8000)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze-cv` | Upload and analyze a CV file |

### AI Interview (Python — port 3000)
| Protocol | Endpoint | Description |
|----------|----------|-------------|
| WebSocket | `/ws/{session_id}` | Real-time interview session |

---

## Database Schema

MongoDB collections used by the backend:

| Collection | Purpose |
|------------|---------|
| `users` | Students, companies, admins — profiles, scores, plans |
| `jobs` | Job postings by companies |
| `applications` | Student job applications |
| `assessments` | Company-created assessments with scorecards |
| `questions` | MCQ and essay questions |
| `candidateanswers` | Student answers per question |
| `results` | Assessment result scores |
| `preassessments` | Platform pre-assessment configs |
| `preassessmentresults` | Student pre-assessment scores |
| `bookings` | Stripe payment records |

---

## User Roles & Routes

### Student Flow
```
Signup → Experience → Tools → Skills → Dashboard
                                          ├── CV Analysis
                                          ├── Pre-Assessment
                                          ├── AI Interview
                                          ├── My Report
                                          ├── Payment
                                          └── Settings
```

### Company Flow
```
Signup (company info) → Company Dashboard
                              ├── Add Job
                              ├── My Jobs
                              └── Settings
```

### Admin
```
Login → Admin Dashboard (user management)
```

> Company job postings in the frontend demo are stored in **localStorage** (`hiremind_company_jobs`). The backend also has full job APIs ready for database integration.

---

## Deployment

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Vercel | `https://hire-mind-livid.vercel.app` |
| Backend | Railway | `https://hiremind-production.up.railway.app` |
| CV Analysis | Local / self-hosted | `http://127.0.0.1:8000` |
| AI Interview | Local / self-hosted | `ws://localhost:3000` |

For production, update CORS origins in:
- `Back end/server.js`
- `AI models/CV-Analysis/main.py`
- `AI models/vision/main.py`

And point `Front end/src/apis/axios.js` to your deployed backend URL.

---

## Documentation

| File | Description |
|------|-------------|
| [GP_Discussion_Guide.md](./GP_Discussion_Guide.md) | Graduation project viva — speaking script & Q&A |
| [Front end/README.md](./Front%20end/README.md) | Frontend component docs |
| [AI models/CV-Analysis/README.md](./AI%20models/CV-Analysis/README.md) | CV Analysis API docs |
| [AI models/vision/README.md](./AI%20models/vision/README.md) | AI Interview service docs |
| [Back end/AI_FEATURE_README.md](./Back%20end/AI_FEATURE_README.md) | AI question generation feature |

---

## Screenshots

> Add screenshots of your dashboard, CV analysis, AI interview, and company portal here before the presentation.

```
docs/screenshots/
├── student-dashboard.png
├── cv-analysis.png
├── ai-interview.png
└── company-dashboard.png
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "Add my feature"`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

This project was developed as a graduation project. All rights reserved by the project team.

---

## Team

**HireMind** — Graduation Project

> Add your team member names and roles here before publishing to GitHub.

| Name | Role |
|------|------|
| Shrouk | — |
| — | — |

---

<p align="center">
  Built with React · Node.js · Python · MongoDB · AI
  <br />
  <strong>HireMind</strong> — Prepare smarter. Hire better.
</p>
