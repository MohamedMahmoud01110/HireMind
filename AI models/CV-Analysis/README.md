# CV Analyzer API v2

A production-ready FastAPI service that accepts PDF/DOCX résumés and returns
structured extraction, a 100-point quality score, semantic job matching, and
role recommendations. Runs **100% locally** — no paid APIs.

---

## Project Structure

```
cv_analyzer/
├── main.py          # FastAPI app — all endpoints
├── parser.py        # PDF & DOCX text extraction
├── analyzer.py      # spaCy NLP — structured field extraction
├── scorer.py        # 100-point CV scoring engine
├── matcher.py       # Sentence-transformer job matching + recommendations
├── utils.py         # Keyword lists & shared helpers
└── requirements.txt # Python dependencies
```

---

## Setup & Run

### 1. Create and activate a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # Linux / macOS
venv\Scripts\activate           # Windows
```

### 2. Install all dependencies

```bash
pip install -r requirements.txt
```

> The spaCy model is bundled in requirements.txt via a direct wheel URL.
> If it fails, run separately:
> ```bash
> python -m spacy download en_core_web_sm
> ```
>
> The `sentence-transformers` model (`all-MiniLM-L6-v2`, ~80 MB) is downloaded
> automatically on first request and cached locally.

### 3. Start the server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Interactive docs: **http://localhost:8000/docs**

---

## API Endpoints

---

### `POST /analyze-cv`
Extract structured data from a CV.

```bash
curl -X POST http://localhost:8000/analyze-cv \
     -F "file=@resume.pdf"
```

**Response:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1 555 123 4567",
  "skills": {
    "technical": ["Django", "Docker", "Python", "Sql"],
    "soft": ["Communication", "Leadership"]
  },
  "tools": ["Git", "Github", "Jira"],
  "education": ["B.Sc. Computer Science — Cairo University, 2018"],
  "experience": ["Jan 2020 – Present  Senior Engineer at Acme Corp"],
  "experience_years": "4 years 3 months"
}
```

---

### `POST /score-cv`
Score the CV out of 100 and get recommendations.

```bash
curl -X POST http://localhost:8000/score-cv \
     -F "file=@resume.pdf"
```

**Response:**
```json
{
  "name": "Jane Doe",
  "skills": { "technical": [...], "soft": [...] },
  "experience_years": "4 years 3 months",
  "education": ["B.Sc. Computer Science — Cairo University, 2018"],
  "tools": ["Git", "Docker"],

  "final_score": 74,
  "score_breakdown": {
    "experience": 18,
    "skills": 24,
    "education": 6,
    "projects": 16,
    "clarity": 10
  },
  "score_details": {
    "experience": "4.3 years — mid-level.",
    "skills": "12 technical skills (+24 pts), 4 soft skills (+4 pts).",
    "education": "Highest degree detected: 'bachelor' → 6/10 pts.",
    "projects": "Project signals found: project, built, deployed, github. Score: 16/20.",
    "clarity": "Name present (+2) | Email present (+2) | Phone present (+2) | CV length 520 words (+2) | Sections detected (+2)"
  },

  "best_role": "Backend Engineer",
  "job_matches": [
    { "role": "Backend Engineer",  "match_score": 71.4, "interpretation": "Strong match" },
    { "role": "Full Stack Engineer","match_score": 65.2, "interpretation": "Strong match" },
    { "role": "Data Engineer",     "match_score": 52.1, "interpretation": "Good match" }
  ],
  "strengths": [
    "Strong technical skill set with 12 technologies identified.",
    "Meaningful work experience: 4 years 3 months.",
    "In-demand skills present: Docker, Python."
  ],
  "weaknesses": [
    "Few soft skills mentioned. Add communication, leadership, or teamwork.",
    "Missing key skills for best-matched role: Rest, Sql."
  ],
  "recommendations": [
    "Learn missing skills for Backend Engineer: Rest, Sql.",
    "Tailor your CV summary to include keywords from each specific job description.",
    "Consider adding a Projects or Portfolio section with links to GitHub."
  ],
  "missing_skills": ["Rest", "Sql"]
}
```

---

### `POST /match-job`
Semantically compare a CV against a job description.

```bash
curl -X POST http://localhost:8000/match-job \
     -F "file=@resume.pdf" \
     -F "job_description=We are looking for a Senior Python Backend Engineer
         with experience in FastAPI, PostgreSQL, Docker, and AWS. The candidate
         should have strong problem-solving skills and at least 3 years of
         professional software development experience."
```

**Response:**
```json
{
  "name": "Jane Doe",
  "skills": { "technical": [...], "soft": [...] },

  "job_description_match": {
    "similarity_score": 68.4,
    "interpretation": "Strong match"
  },

  "final_score": 74,
  "score_breakdown": {
    "experience": 18,
    "skills": 24,
    "education": 6,
    "projects": 16,
    "clarity": 10
  },

  "best_role": "Backend Engineer",
  "job_matches": [...],
  "strengths": [...],
  "weaknesses": [...],
  "recommendations": [...],
  "missing_skills": ["Aws", "Postgresql"]
}
```

---

## Error Reference

| Code | Cause                                          |
|------|------------------------------------------------|
| 400  | Empty file or job_description too short        |
| 413  | File exceeds 10 MB                             |
| 415  | Not a PDF or DOCX                              |
| 422  | File could not be parsed (e.g. scanned image)  |
| 500  | Internal server error                          |
