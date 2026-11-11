"""Module for clustering-related routes."""

from typing import Any

import pandas as pd
from fastapi import APIRouter

from app.compute.clustering import impute_knn, perform_kmeans_clustering
from app.compute.dependencies import ClusteringCacheDep
from app.remote_services.postgres.dependencies import ConnectionDep
from app.remote_services.postgres.queries.choropleth_map import select_listings
from app.router.requests.clustering import ClusteringRequest

router = APIRouter(prefix="/clustering", tags=["clustering"])


@router.post("/perform")
async def perform_clustering(
    request: ClusteringRequest,
    clustering_cache: ClusteringCacheDep,
    connection: ConnectionDep,
) -> list[dict[str, Any]]:
    """Perform clustering upon request."""
    if clustering_cache.input_data is None:
        result = await select_listings(
            connection,
            ["id", "price", "room_type", "accommodates", "bedrooms", "bathrooms", "beds"],
            limit=None,
            offset=0,
        )
        df = pd.DataFrame(result)
        df = impute_knn(df)
        df.columns = pd.Index([str(col) for col in df.columns])
        clustering_cache.input_data = df

    hash_value = request.hash()
    if hash_value not in clustering_cache.clustering_results:
        clustering_result = perform_kmeans_clustering(clustering_cache.input_data, request)
        clustering_cache.add_clustering_result(hash_value, clustering_result)

    clustering_result = clustering_cache.get_clustering_result(hash_value) # type: ignore[assignment]
    merged = clustering_cache.input_data[["id"]].copy()
    merged["cluster"] = clustering_result
    return [
        {str(key): value for key, value in record.items()}
        for record in merged.to_dict(orient="records")
    ]
