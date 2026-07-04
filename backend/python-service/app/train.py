"""
One-off training script for the department classifier.
Connects to the PostgreSQL database via DATABASE_URL,
queries documents with department labels, trains a
TfidfVectorizer + LogisticRegression pipeline, and
saves the model to model.joblib.

Usage:
    docker compose run python-service python app/train.py
"""

import os
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score
from sqlalchemy import create_engine


def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL environment variable is required.")
        return

    print("Connecting to database...")
    engine = create_engine(db_url)

    query = """
        SELECT title, abstract, department
        FROM documents
        WHERE department IS NOT NULL
          AND department != ''
    """
    df = pd.read_sql(query, engine)

    if len(df) < 10:
        print(f"Only {len(df)} labeled records found. Need at least 10. Skipping training.")
        return

    print(f"Loaded {len(df)} labeled documents.")
    print(f"Departments: {df['department'].value_counts().to_dict()}")

    df["text"] = (df["title"].fillna("") + " " + df["abstract"].fillna("")).str.strip()
    df = df[df["text"].str.len() > 10].reset_index(drop=True)

    if len(df) < 10:
        print("Not enough documents with sufficient text after filtering. Skipping.")
        return

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=2000,
            stop_words="english",
        )),
        ("clf", LogisticRegression(max_iter=1000, multi_class="multinomial")),
    ])

    scores = cross_val_score(pipeline, df["text"], df["department"], cv=min(5, len(df)))
    print(f"Cross-validation accuracy: {scores.mean():.3f} (+/- {scores.std():.3f})")

    pipeline.fit(df["text"], df["department"])

    model_path = os.path.join(os.path.dirname(__file__), "model.joblib")
    joblib.dump({"model": pipeline.named_steps["clf"], "vectorizer": pipeline.named_steps["tfidf"]}, model_path)
    print(f"Model saved to {model_path}")


if __name__ == "__main__":
    main()
