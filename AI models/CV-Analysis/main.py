import logging

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from analyzer import analyze_cv
from ats import compute_ats_score
from llm_summarizer import summarize_cv
from matcher import match_job, recommend
from parser import ParseResult, parse_cv_detailed
from scorer import score_cv

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CV Analyzer API",
    description=(
        "Upload a PDF or DOCX resume and get OCR cleanup, layout diagnostics, "
        "structured extraction, ATS optimization, scoring, and recruiter-friendly summaries."
    ),
    version="4.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://hire-mind-livid.vercel.app",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES: set[str] = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


async def _read_and_parse(file: UploadFile) -> tuple[ParseResult, str]:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type '{file.content_type}'. Please upload a PDF or DOCX file.",
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")

    filename = file.filename or "upload"
    logger.info("Received file: name=%s size=%d type=%s", filename, len(file_bytes), file.content_type)
    parse_result = parse_cv_detailed(filename, file_bytes)
    logger.info("Extracted %d characters from '%s'.", len(parse_result.text), filename)
    return parse_result, filename


def _build_cv_payload(raw_text: str, diagnostics: dict, job_description: str | None = None) -> dict:
    cv_data = analyze_cv(raw_text, diagnostics)
    breakdown = score_cv(cv_data, raw_text)
    rec_data = recommend(cv_data, raw_text)
    llm_summary = summarize_cv(cv_data, raw_text)
    ats_result = compute_ats_score(cv_data, raw_text, job_description)
    dependency_status = diagnostics.get("dependency_status", {})
    available_dependencies = [name for name, available in dependency_status.items() if available]

    payload = {
        **cv_data,
        "clean_structured_cv": cv_data["ats_ready_cv"],
        "extracted_skills_list": cv_data["skills"]["technical"] + cv_data["skills"]["soft"],
        "detected_issues_in_original_cv": cv_data["original_issues"],
        "fixes_applied": cv_data["fixes_applied"],
        "dependency_status": dependency_status,
        "missing_dependencies_installed": available_dependencies,
        "final_score": breakdown.final_score,
        "score_breakdown": {
            "experience": breakdown.experience_score,
            "skills": breakdown.skills_score,
            "education": breakdown.education_score,
            "projects": breakdown.projects_score,
            "clarity": breakdown.clarity_score,
        },
        "score_details": breakdown.score_details,
        "best_role": rec_data["best_role"],
        "job_matches": rec_data["job_matches"],
        "strengths": rec_data["strengths"],
        "weaknesses": rec_data["weaknesses"],
        "recommendations": rec_data["recommendations"],
        "missing_skills": rec_data["missing_skills"],
        "llm_summary": llm_summary,
        "ats": {
            "ats_score": ats_result.ats_score,
            "ats_probability": ats_result.ats_probability,
            "found_sections": ats_result.found_sections,
            "missing_sections": ats_result.missing_sections,
            "action_verbs_found": ats_result.action_verbs_found,
            "missing_keywords": ats_result.missing_keywords,
            "improvement_tips": ats_result.improvement_tips,
            "jd_keyword_overlap": ats_result.jd_keyword_overlap,
            "score_breakdown": {
                "section": ats_result.section_score,
                "keywords": ats_result.keyword_score,
                "action_verbs": ats_result.action_verb_score,
                "quantification": ats_result.quantification_score,
                "contact": ats_result.contact_score,
                "readability": ats_result.readability_score,
            },
        },
    }
    return payload


@app.get("/", tags=["Health"])
def health_check() -> dict:
    return {"status": "ok", "version": "4.0.0", "message": "CV Analyzer API is running."}


@app.post("/debug-extract", tags=["Debug"])
async def debug_extract(file: UploadFile = File(...)) -> JSONResponse:
    parse_result, filename = await _read_and_parse(file)
    return JSONResponse(
        content={
            "filename": filename,
            "char_count": len(parse_result.text),
            "line_count": parse_result.text.count("\n") + 1,
            "preview": parse_result.text[:800],
            "full_text": parse_result.text,
            "layout_diagnostics": parse_result.diagnostics.to_dict(),
        }
    )


@app.post("/analyze-cv", tags=["CV Analysis"])
async def analyze_cv_endpoint(file: UploadFile = File(...)) -> JSONResponse:
    parse_result, _ = await _read_and_parse(file)
    result = _build_cv_payload(parse_result.text, parse_result.diagnostics.to_dict())
    logger.info("Analysis complete for '%s'.", file.filename)
    return JSONResponse(content=result)


@app.post("/score-cv", tags=["CV Scoring"])
async def score_cv_endpoint(file: UploadFile = File(...)) -> JSONResponse:
    parse_result, _ = await _read_and_parse(file)
    result = _build_cv_payload(parse_result.text, parse_result.diagnostics.to_dict())
    logger.info("Scored '%s': final_score=%d", file.filename, result["final_score"])
    return JSONResponse(content=result)


@app.post("/match-job", tags=["Job Matching"])
async def match_job_endpoint(file: UploadFile = File(...), job_description: str = Form(...)) -> JSONResponse:
    if not job_description or len(job_description.strip()) < 10:
        raise HTTPException(status_code=400, detail="job_description must be at least 10 characters.")

    parse_result, _ = await _read_and_parse(file)
    result = _build_cv_payload(parse_result.text, parse_result.diagnostics.to_dict(), job_description)
    match_result = match_job(parse_result.text, job_description)
    result["job_description_match"] = {
        "similarity_score": match_result["similarity_score"],
        "interpretation": match_result["interpretation"],
    }
    logger.info("Job match '%s': similarity=%.1f%%", file.filename, match_result["similarity_score"])
    return JSONResponse(content=result)


@app.post("/ats-check", tags=["ATS Optimization"])
async def ats_check_endpoint(file: UploadFile = File(...), job_description: str = Form(default="")) -> JSONResponse:
    parse_result, _ = await _read_and_parse(file)
    result = _build_cv_payload(parse_result.text, parse_result.diagnostics.to_dict(), job_description.strip() or None)
    logger.info("ATS check '%s': ats_score=%d", file.filename, result["ats"]["ats_score"])
    return JSONResponse(content=result)


@app.post("/summarize-cv", tags=["LLM Summary"])
async def summarize_cv_endpoint(file: UploadFile = File(...)) -> JSONResponse:
    parse_result, _ = await _read_and_parse(file)
    result = _build_cv_payload(parse_result.text, parse_result.diagnostics.to_dict())
    result = {
        "name": result["name"],
        "contact_information": result["contact_information"],
        "clean_structured_cv": result["clean_structured_cv"],
        "llm_summary": result["llm_summary"],
        "detected_issues_in_original_cv": result["detected_issues_in_original_cv"],
        "fixes_applied": result["fixes_applied"],
    }
    logger.info("Summarized '%s'.", file.filename)
    return JSONResponse(content=result)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
