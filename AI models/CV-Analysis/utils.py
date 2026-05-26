# utils.py
# Shared constants, keyword lists, and utility helpers

import re
import unicodedata

# ---------------------------------------------------------------------------
# Keyword dictionaries
# ---------------------------------------------------------------------------

TECHNICAL_SKILLS: set[str] = {
    # Languages
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "kotlin", "swift", "php", "ruby", "scala", "r", "matlab", "perl", "bash",
    "shell", "dart", "lua",
    # Web / Frontend
    "html", "css", "react", "angular", "vue", "svelte", "nextjs", "nuxtjs",
    "jquery", "bootstrap", "tailwind", "sass", "less", "webpack", "vite",
    "graphql", "rest", "restful", "api",
    # Backend / Frameworks
    "django", "flask", "fastapi", "spring", "express", "laravel", "rails",
    "asp.net", "node.js", "nodejs",
    # Data / ML
    "machine learning", "deep learning", "nlp", "computer vision",
    "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy",
    "matplotlib", "seaborn", "opencv", "hugging face", "transformers",
    "langchain", "llm", "rag",
    # Databases
    "sql", "mysql", "postgresql", "sqlite", "mongodb", "redis", "cassandra",
    "dynamodb", "firebase", "elasticsearch", "neo4j",
    # DevOps / Cloud
    "docker", "kubernetes", "aws", "azure", "gcp", "google cloud",
    "terraform", "ansible", "jenkins", "github actions", "ci/cd",
    "linux", "git", "nginx", "apache",
    # Testing
    "pytest", "unittest", "jest", "selenium", "cypress",
}

SOFT_SKILLS: set[str] = {
    "communication", "teamwork", "leadership", "problem solving",
    "critical thinking", "time management", "adaptability", "creativity",
    "collaboration", "project management", "agile", "scrum", "kanban",
    "analytical", "detail-oriented", "self-motivated", "multitasking",
    "decision making", "conflict resolution", "presentation", "mentoring",
    "negotiation", "empathy", "organization",
}

TOOLS: set[str] = {
    "git", "github", "gitlab", "bitbucket",
    "jira", "confluence", "trello", "notion", "asana", "slack",
    "vscode", "visual studio", "intellij", "pycharm", "eclipse",
    "postman", "insomnia", "swagger",
    "figma", "sketch", "adobe xd", "photoshop", "illustrator",
    "excel", "word", "powerpoint", "google sheets", "tableau", "power bi",
    "jupyter", "colab", "databricks", "airflow", "kafka",
    "prometheus", "grafana", "datadog", "splunk",
}

# Months used when parsing date ranges in experience sections
MONTHS: list[str] = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
]

# ---------------------------------------------------------------------------
# Text-cleaning helpers
# ---------------------------------------------------------------------------

def clean_text(text: str) -> str:
    """
    Remove non-printable characters, collapse excessive whitespace,
    and normalise line endings.
    """
    text = unicodedata.normalize("NFKC", text or "")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\u2013", "-").replace("\u2014", "-").replace("\u2212", "-")
    text = text.replace("\u2022", "-").replace("\u25cf", "-").replace("\u25aa", "-")
    text = text.replace("\uf0b7", "-")
    # Replace non-breaking spaces and other unicode whitespace
    text = re.sub(r"[\u00a0\u200b\u200c\u200d\ufeff]", " ", text)
    # Drop remaining control characters but keep newlines/tabs
    text = re.sub(r"[^\S\n\t]+", " ", text)
    text = re.sub(r"[\x00-\x08\x0b-\x1f\x7f]", "", text)
    # Collapse multiple blank lines into one
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Collapse multiple spaces/tabs on a single line
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def normalise(text: str) -> str:
    """Lowercase and strip a string — used for case-insensitive matching."""
    return clean_text(text).lower().strip()


def extract_email(text: str) -> str | None:
    """Return the first e-mail address found in *text*, or None."""
    pattern = r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
    match = re.search(pattern, text)
    return match.group(0) if match else None


def extract_phone(text: str) -> str | None:
    """
    Return the first phone number found in *text*, or None.
    Handles formats like +20 123 456 7890, (01) 234-5678, 01012345678, etc.
    """
    pattern = (
        r"(\+?\d{1,3}[\s\-.]?)?(\(?\d{2,4}\)?[\s\-.]?)"
        r"(\d{3,4}[\s\-.]?\d{3,4})"
    )
    match = re.search(pattern, text)
    return match.group(0).strip() if match else None
