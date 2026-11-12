
"""Module for performing model inference from MLflow models."""
from typing import Any

from pandas import DataFrame

from app.router.requests.listing_comparison import HypotheticalListingPredictionRequest
from mlflow.pyfunc import PyFuncModel

DEFAULT_ROOM_TYPE = "Private room"
DEFAULT_DISTRICT = "Södermalm"

def predict_airbnb_price(model: PyFuncModel, values: HypotheticalListingPredictionRequest) -> list[dict[str, Any]]:
    """Predict the Airbnb price for a hypothetical listing."""
    dct = values.model_dump()
    if dct.get("room_type") is None:
        dct["room_type"] = DEFAULT_ROOM_TYPE
    if dct.get("accommodates") is None:
        dct["accommodates"] = 0
    if dct.get("bedrooms") is None:
        dct["bedrooms"] = 0
    if dct.get("beds") is None:
        dct["beds"] = 0
    if dct.get("district") is None:
        dct["district"] = DEFAULT_DISTRICT
    if dct.get("amenities") is None:
        dct["amenities"] = []

    dct["amenity_count"] = len(dct.pop("amenities"))

    df = DataFrame([dct]).astype({
        "accommodates": "int64",
        "bedrooms": "float64",
        "beds": "float64",
        "amenity_count": "int64",
    })

    return model.predict(df) # type: ignore[return-value]
