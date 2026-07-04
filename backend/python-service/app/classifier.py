import joblib
from pathlib import Path

_MODEL_PATH = Path(__file__).parent / "model.joblib"


class DepartmentClassifier:
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self._load()

    def _load(self):
        if _MODEL_PATH.exists():
            data = joblib.load(_MODEL_PATH)
            self.model = data.get("model")
            self.vectorizer = data.get("vectorizer")

    @property
    def available(self) -> bool:
        return self.model is not None

    def predict(self, title: str | None, abstract: str | None) -> str | None:
        if self.model is None:
            return None
        text = f"{title or ''} {abstract or ''}".strip()
        if not text:
            return None
        vec = self.vectorizer.transform([text])
        pred = self.model.predict(vec)[0]
        return pred
