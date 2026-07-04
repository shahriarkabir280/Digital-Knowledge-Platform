from fastapi import FastAPI
from pydantic import BaseModel

from app.extractors import (
    extract_title,
    extract_authors,
    extract_abstract,
    extract_keywords,
    extract_department_heuristic,
)
from app.classifier import DepartmentClassifier

app = FastAPI(title="Metadata Extraction Service", version="1.0.0")

classifier = DepartmentClassifier()


class ExtractRequest(BaseModel):
    text: str


class ExtractResponse(BaseModel):
    title: str | None = None
    author: str | None = None
    abstract: str | None = None
    keywords: list[str] = []
    department: str | None = None
    success: bool = False
    error: str | None = None


@app.get("/health")
def health():
    return {"status": "ok", "classifier_available": classifier.available}


@app.post("/extract", response_model=ExtractResponse)
def extract_metadata(req: ExtractRequest):
    text = req.text.strip()
    if not text or len(text) < 20:
        return ExtractResponse(
            success=False,
            error="Not enough text to extract metadata (minimum 20 characters).",
        )

    try:
        title = extract_title(text)
        author = extract_authors(text)
        abstract = extract_abstract(text)
        keywords = extract_keywords(text)

        department = None
        if classifier.available:
            department = classifier.predict(title, abstract)
        if not department:
            department = extract_department_heuristic(text)

        return ExtractResponse(
            title=title,
            author=author,
            abstract=abstract,
            keywords=keywords,
            department=department,
            success=True,
        )
    except Exception as e:
        return ExtractResponse(
            success=False,
            error=f"Extraction failed: {str(e)}",
        )
