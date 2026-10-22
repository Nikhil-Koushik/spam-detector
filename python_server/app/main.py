# to run: uvicorn app.main:app --reload

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import logging


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


app = FastAPI(
    title="Spam Email Detection API",
    version="1.0.0"
)


model = joblib.load("model/spam_email_model.joblib")


class EmailRequest(BaseModel):
    emails: list[str]


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "message": "Spam Email Detection API is running"
    }


@app.post("/predict")
def predict_email(request: EmailRequest):

    try:

        logger.info("Received %d emails for prediction", len(request.emails))

        predictions = model.predict(request.emails)

        logger.info("Prediction completed successfully")

        return {
            "prediction": predictions.tolist()
        }

    except Exception as e:

        logger.exception("Error while predicting emails")

        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )