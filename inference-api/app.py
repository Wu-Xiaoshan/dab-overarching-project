from pathlib import Path

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sklearn.ensemble import RandomForestRegressor

MODEL_DIR = Path("/tmp/ml_model")
MODEL_PATH = MODEL_DIR / "model.joblib"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

server = FastAPI()


class PredictBody(BaseModel):
    exercise: int
    code: str


class TrainItem(BaseModel):
    exercise: int
    code: str


def _features(exercise: int, code: str) -> np.ndarray:
    return np.array([[exercise, len(code)]], dtype=np.float64)


def _synthetic_target(exercise: int, code: str) -> float:
    return float((exercise * 17 + len(code) * 3) % 101)


@server.post("/predict")
def predict(body: PredictBody):
    if not MODEL_PATH.exists():
        raise HTTPException(status_code=503, detail="Model not trained yet")
    model = joblib.load(MODEL_PATH)
    X = _features(body.exercise, body.code)
    pred = model.predict(X)[0]
    return {"prediction": float(pred)}


@server.post("/train")
def train(items: list[TrainItem]):
    if not items:
        raise HTTPException(status_code=400, detail="Empty training set")
    X = np.vstack([_features(it.exercise, it.code) for it in items])
    y = np.array([_synthetic_target(it.exercise, it.code) for it in items])
    model = RandomForestRegressor(n_estimators=10, random_state=42)
    model.fit(X, y)
    joblib.dump(model, MODEL_PATH)
    return {"status": "Model trained successfully"}
