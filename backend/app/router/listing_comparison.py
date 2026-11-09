"""Module for handling listing comparisons and predictions."""

from typing import Any

from fastapi import APIRouter

from app.remote_services.mlflow.dependencies import ModelRegistryDep
from app.remote_services.mlflow.model.model_inference import predict_airbnb_price
from app.remote_services.postgres import ConnectionDep
from app.remote_services.postgres.queries.listing_comparison import select_similar_listings

from .requests.listing_comparison import HypotheticalListingComparisonRequest, HypotheticalListingPredictionRequest

router = APIRouter(prefix="/listing-comparisons", tags=["listing-comparisons"])


@router.post("/compare")
async def compare_listings(
    request: HypotheticalListingComparisonRequest,
    connection: ConnectionDep,
) -> list[dict[str, Any]]:
    """Return a comparison of the hypothetical listing with similar listings."""
    return await select_similar_listings(connection, request)



@router.post("/predict")
def predict_listing(
    request: HypotheticalListingPredictionRequest,
    model_registry: ModelRegistryDep,
) -> list[dict[str, Any]]:
    """Return a prediction for the hypothetical listing."""
    model = model_registry.airbnb_price_prediction
    prediction = predict_airbnb_price(model, request)
    return prediction
