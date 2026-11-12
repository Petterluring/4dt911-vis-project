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


def _compute_cluster_price_statistics(df: pd.DataFrame, cluster_labels: pd.Series) -> dict[int, dict[str, Any]]:
    """Compute summary statistics for the price feature by cluster.

    Returns a dictionary mapping cluster ID to statistics.
    """
    df_with_clusters = df[["price"]].copy()
    df_with_clusters["cluster"] = cluster_labels

    stats = {}
    for cluster_id in sorted(df_with_clusters["cluster"].unique()):
        cluster_prices = df_with_clusters[df_with_clusters["cluster"] == cluster_id]["price"]

        q25 = cluster_prices.quantile(0.25)
        q75 = cluster_prices.quantile(0.75)
        iqr = q75 - q25

        stats[int(cluster_id)] = {
            "median": float(cluster_prices.median()),
            "q25": float(q25),
            "q75": float(q75),
            "iqr": float(iqr),
            "upper_whisker": float(q75 + iqr * 1.5),
            "lower_whisker": float(max(0, q25 - iqr * 1.5)),
            "mean": float(cluster_prices.mean()),
            "count": int(len(cluster_prices)),
        }

    return stats


@router.post("/perform")
async def perform_clustering(
    request: ClusteringRequest,
    clustering_cache: ClusteringCacheDep,
    connection: ConnectionDep,
) -> dict[str, Any]:
    """Perform clustering upon request.

    Returns a dictionary with:
    - "cluster_assignments": list of records with id, price, and cluster
    - "cluster_statistics": dict mapping cluster IDs to their price statistics
    """
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
    merged = clustering_cache.input_data[["id", "price"]].copy()
    merged["cluster"] = clustering_result

    cluster_assignments = [
        {str(key): value for key, value in record.items()}
        for record in merged.to_dict(orient="records")
    ]

    cluster_statistics = _compute_cluster_price_statistics(
        clustering_cache.input_data,
        clustering_result
    )

    return {
        "cluster_assignments": cluster_assignments,
        "cluster_statistics": cluster_statistics,
    }
