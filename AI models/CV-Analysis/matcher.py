from __future__ import annotations

import logging
import re
from functools import lru_cache

from utils import normalise

logger = logging.getLogger(__name__)

_MODEL_NAME = "all-MiniLM-L6-v2"


JOB_ROLES: list[dict] = [
    {
        "title": "Backend Engineer",
        "required_skills": ["Python", "Sql", "Rest", "Docker", "Git"],
        "profile": "Backend software engineer with expertise in Python, REST APIs, SQL databases, Docker, microservices, and server-side development.",
    },
    {
        "title": "Frontend Engineer",
        "required_skills": ["Javascript", "React", "Html", "Css", "Git"],
        "profile": "Frontend developer skilled in JavaScript, React, HTML, CSS, responsive design, and modern web frameworks.",
    },
    {
        "title": "Full Stack Engineer",
        "required_skills": ["Javascript", "Python", "React", "Sql", "Docker"],
        "profile": "Full stack engineer comfortable with both frontend and backend, React, Node.js, Python, databases, and cloud deployment.",
    },
    {
        "title": "Data Scientist",
        "required_skills": ["Python", "Pandas", "Scikit-Learn", "Numpy", "Sql"],
        "profile": "Data scientist with skills in Python, pandas, scikit-learn, statistical modelling, machine learning, and data visualisation.",
    },
    {
        "title": "Machine Learning Engineer",
        "required_skills": ["Python", "Pytorch", "Tensorflow", "Numpy", "Docker"],
        "profile": "ML engineer experienced in deep learning, PyTorch, TensorFlow, model training, deployment pipelines, and MLOps.",
    },
    {
        "title": "DevOps / Cloud Engineer",
        "required_skills": ["Docker", "Kubernetes", "Aws", "Terraform", "Linux"],
        "profile": "DevOps engineer specialising in CI/CD, Kubernetes, AWS, Terraform, infrastructure as code, and cloud automation.",
    },
    {
        "title": "Data Engineer",
        "required_skills": ["Python", "Sql", "Kafka", "Airflow", "Spark"],
        "profile": "Data engineer building ETL pipelines, data warehouses, stream processing with Kafka, Airflow orchestration, and Spark.",
    },
    {
        "title": "Cybersecurity Analyst",
        "required_skills": ["Linux", "Python", "Bash", "Networking"],
        "profile": "Security analyst with knowledge of network security, penetration testing, Linux, Python scripting, and vulnerability assessment.",
    },
    {
        "title": "Mobile Developer (Android/iOS)",
        "required_skills": ["Kotlin", "Swift", "Dart", "Git"],
        "profile": "Mobile developer proficient in Kotlin for Android, Swift for iOS, or Flutter/Dart for cross-platform mobile applications.",
    },
    {
        "title": "AI / NLP Engineer",
        "required_skills": ["Python", "Transformers", "Pytorch", "Nlp", "Langchain"],
        "profile": "AI engineer specialising in NLP, large language models, Hugging Face transformers, LangChain, and RAG systems.",
    },
]


@lru_cache(maxsize=1)
def _get_model():
    try:
        from sentence_transformers import SentenceTransformer
    except Exception as exc:
        logger.warning("SentenceTransformer import failed, falling back to keyword matching: %s", exc)
        return None

    try:
        logger.info("Loading sentence-transformer model '%s'...", _MODEL_NAME)
        return SentenceTransformer(_MODEL_NAME)
    except Exception as exc:
        logger.warning("SentenceTransformer model load failed, falling back to keyword matching: %s", exc)
        return None


@lru_cache(maxsize=1)
def _get_role_embeddings():
    model = _get_model()
    if model is None:
        return None

    embeddings = model.encode([role["profile"] for role in JOB_ROLES], convert_to_numpy=True)
    return JOB_ROLES, embeddings


def match_job(cv_text: str, job_description: str) -> dict:
    model = _get_model()
    if model is not None:
        try:
            from sklearn.metrics.pairwise import cosine_similarity

            cv_embedding = model.encode([_truncate(cv_text)], convert_to_numpy=True)
            jd_embedding = model.encode([_truncate(job_description)], convert_to_numpy=True)
            similarity = float(cosine_similarity(cv_embedding, jd_embedding)[0][0])
            score_pct = round(similarity * 100, 2)
            return {
                "similarity_score": score_pct,
                "interpretation": _interpret_similarity(score_pct),
            }
        except Exception as exc:
            logger.warning("Semantic job matching failed, using keyword fallback: %s", exc)

    score_pct = _keyword_similarity(cv_text, job_description)
    return {
        "similarity_score": score_pct,
        "interpretation": _interpret_similarity(score_pct),
    }


def recommend(cv_data: dict, raw_text: str) -> dict:
    role_scores = _score_roles(cv_data, raw_text)
    role_scores.sort(key=lambda item: item[0], reverse=True)

    best_score, best_role_data = role_scores[0]
    best_role_title = best_role_data["title"]

    job_matches = [
        {
            "role": role["title"],
            "match_score": round(score * 100, 1),
            "interpretation": _interpret_similarity(round(score * 100, 1)),
        }
        for score, role in role_scores[:5]
    ]

    skills_data = cv_data.get("skills", {})
    cv_technical = {skill.title() for skill in skills_data.get("technical", [])}
    cv_soft = {skill.title() for skill in skills_data.get("soft", [])}
    cv_tools = {tool.title() for tool in cv_data.get("tools", [])}
    all_cv_skills = cv_technical | cv_soft | cv_tools

    required = {skill.title() for skill in best_role_data["required_skills"]}
    missing_skills = sorted(required - all_cv_skills)

    strengths = _build_strengths(cv_data, all_cv_skills, best_score, best_role_title)
    weaknesses = _build_weaknesses(cv_data, missing_skills)
    recommendations = _build_recommendations(cv_data, missing_skills, best_role_title)

    return {
        "best_role": best_role_title,
        "job_matches": job_matches,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": recommendations,
        "missing_skills": missing_skills,
    }


def _score_roles(cv_data: dict, raw_text: str) -> list[tuple[float, dict]]:
    embeddings = _get_role_embeddings()
    if embeddings is not None:
        try:
            from sklearn.metrics.pairwise import cosine_similarity

            model = _get_model()
            assert model is not None
            roles, role_embeddings = embeddings
            cv_embedding = model.encode([_truncate(raw_text)], convert_to_numpy=True)
            similarities = cosine_similarity(cv_embedding, role_embeddings)[0]
            return [(float(score), role) for score, role in zip(similarities, roles)]
        except Exception as exc:
            logger.warning("Semantic role scoring failed, using keyword fallback: %s", exc)

    skills_data = cv_data.get("skills", {})
    all_cv_skills = {
        *(skill.title() for skill in skills_data.get("technical", [])),
        *(skill.title() for skill in skills_data.get("soft", [])),
        *(tool.title() for tool in cv_data.get("tools", [])),
    }
    text = normalise(raw_text)

    scores: list[tuple[float, dict]] = []
    for role in JOB_ROLES:
        required = {skill.title() for skill in role["required_skills"]}
        overlap = len(required & all_cv_skills) / max(len(required), 1)
        profile_hits = sum(1 for token in _tokenise(role["profile"]) if token in text)
        profile_score = min(profile_hits / max(len(_tokenise(role["profile"])), 1), 1.0)
        combined = min((overlap * 0.7) + (profile_score * 0.3), 1.0)
        scores.append((combined, role))
    return scores


def _keyword_similarity(cv_text: str, job_description: str) -> float:
    cv_tokens = set(_tokenise(cv_text))
    jd_tokens = set(_tokenise(job_description))
    overlap = len(cv_tokens & jd_tokens) / max(len(jd_tokens), 1)
    return round(overlap * 100, 2)


def _tokenise(text: str) -> list[str]:
    return re.findall(r"\b[a-z][a-z0-9+#.\-/]{1,}\b", normalise(text))


def _build_strengths(
    cv_data: dict,
    all_skills: set[str],
    best_match_score: float,
    best_role_title: str,
) -> list[str]:
    strengths: list[str] = []

    tech_count = len(cv_data.get("skills", {}).get("technical", []))
    soft_count = len(cv_data.get("skills", {}).get("soft", []))
    exp_years = cv_data.get("experience_years", "Unknown")
    education = cv_data.get("education", [])

    if tech_count >= 10:
        strengths.append(f"Strong technical skill set with {tech_count} technologies identified.")
    elif tech_count >= 5:
        strengths.append(f"Good breadth of technical skills ({tech_count} detected).")

    if soft_count >= 4:
        strengths.append(f"Well-rounded soft skills ({soft_count} identified).")

    if exp_years not in ("Unknown", ""):
        strengths.append(f"Meaningful work experience: {exp_years}.")

    if education:
        strengths.append(f"Formal education background detected ({len(education)} entry/entries).")

    if best_match_score >= 0.55:
        strengths.append(
            f"CV profile aligns well with '{best_role_title}' roles ({round(best_match_score * 100, 1)}% match)."
        )

    high_value = {"Python", "Docker", "Kubernetes", "Aws", "Pytorch", "Tensorflow", "React"}
    found_high_value = sorted(all_skills & high_value)
    if found_high_value:
        strengths.append(f"In-demand skills present: {', '.join(found_high_value)}.")

    return strengths or ["No major strengths could be determined from the CV text."]


def _build_weaknesses(cv_data: dict, missing_skills: list[str]) -> list[str]:
    weaknesses: list[str] = []

    tech_count = len(cv_data.get("skills", {}).get("technical", []))
    soft_count = len(cv_data.get("skills", {}).get("soft", []))
    exp_years = cv_data.get("experience_years", "Unknown")
    education = cv_data.get("education", [])

    if tech_count < 5:
        weaknesses.append(f"Limited technical skills detected ({tech_count}). Consider expanding.")
    if soft_count < 3:
        weaknesses.append("Few soft skills mentioned. Add communication, leadership, or teamwork.")
    if exp_years in ("Unknown", ""):
        weaknesses.append("Work experience duration could not be determined.")
    if not education:
        weaknesses.append("No formal education entries detected in the CV.")
    if missing_skills:
        weaknesses.append(f"Missing key skills for best-matched role: {', '.join(missing_skills[:4])}.")
    if not cv_data.get("email"):
        weaknesses.append("No email address found - essential for recruiters.")

    return weaknesses or ["No significant weaknesses detected."]


def _build_recommendations(cv_data: dict, missing_skills: list[str], best_role: str) -> list[str]:
    recommendations: list[str] = []

    if missing_skills:
        recommendations.append(f"Learn missing skills for {best_role}: {', '.join(missing_skills[:5])}.")

    tech_count = len(cv_data.get("skills", {}).get("technical", []))
    if tech_count < 8:
        recommendations.append("Add more technical skills to your CV - aim for at least 8-10 relevant keywords.")

    if not cv_data.get("email"):
        recommendations.append("Include a professional email address.")
    if not cv_data.get("phone"):
        recommendations.append("Include a phone number so recruiters can reach you easily.")

    if cv_data.get("experience_years", "Unknown") in ("Unknown", ""):
        recommendations.append("Add clear date ranges such as 'Jan 2020 - Present' to work experience entries.")

    if not cv_data.get("education"):
        recommendations.append("Add an education section, even if it contains bootcamps or certifications.")

    recommendations.append("Tailor your CV summary and bullet wording to match keywords from each job description.")
    recommendations.append("Add a Projects or Portfolio section with links to GitHub, demos, or case studies.")
    return recommendations


def _interpret_similarity(score: float) -> str:
    if score >= 80:
        return "Excellent match"
    if score >= 65:
        return "Strong match"
    if score >= 50:
        return "Good match"
    if score >= 35:
        return "Partial match"
    return "Low match"


def _truncate(text: str, max_chars: int = 3000) -> str:
    return text[:max_chars]
