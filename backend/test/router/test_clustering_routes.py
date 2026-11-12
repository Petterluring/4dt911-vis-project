"""HTTP contract tests for the clustering route used by the frontend."""

from collections.abc import AsyncGenerator
from unittest.mock import patch

import pandas as pd
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.compute.clustering import ClusteringCache
from app.remote_services.postgres.dependencies import get_connection
from app.router import clustering


def make_client() -> tuple[TestClient, ClusteringCache]:
    """Build a route-only app with known data and no external services."""
    app = FastAPI()
    app.include_router(clustering.router)
    cache = ClusteringCache(2)
    cache.set_input_data(pd.DataFrame({
        "id": [1364738370991276918, 2, 3, 4],
        "price": [100.0, 200.0, 1000.0, 2000.0],
        "room_type": ["Private room", "Private room", "Entire home/apt", "Entire home/apt"],
        "accommodates": [2, 2, 4, 6], "bedrooms": [0, 1, 2, 3],
        "bathrooms": [1, 1, 1, 2], "beds": [1, 1, 2, 4],
    }))
    app.state.clustering_cache = cache

    async def connection() -> AsyncGenerator[None, None]:
        yield None

    app.dependency_overrides[get_connection] = connection
    return TestClient(app), cache


def test_perform_returns_assignments_and_price_fences_and_reuses_cached_labels() -> None:
    client, cache = make_client()
    request = {"features": ["room_type", "accommodates", "bedrooms", "beds"], "n_clusters": 2}
    with client, patch.object(clustering, "perform_kmeans_clustering", return_value=pd.Series([0, 0, 1, 1])) as compute:
        response = client.post("/clustering/perform", json=request)
        assert response.status_code == 200
        body = response.json()
        assert body["cluster_assignments"][0] == {"id": 1364738370991276918, "price": 100, "cluster": 0}
        assert len(body["cluster_assignments"]) == 4
        assert set(body["cluster_statistics"]) == {"0", "1"}
        statistics = body["cluster_statistics"]["0"]
        assert statistics["q25"] == 125
        assert statistics["median"] == 150
        assert statistics["q75"] == 175
        assert statistics["lower_whisker"] == 50
        assert statistics["upper_whisker"] == 250
        assert statistics["count"] == 2
        repeated = client.post("/clustering/perform", json=request)
        assert repeated.json() == body
        assert compute.call_count == 1
        assert len(cache.clustering_results) == 1


def test_perform_rejects_price_features_and_invalid_cluster_counts() -> None:
    client, _ = make_client()
    with client:
        for request in [
            {"features": ["price"], "n_clusters": 3},
            {"features": ["beds"], "n_clusters": 1},
            {"features": [], "n_clusters": 2},
        ]:
            assert client.post("/clustering/perform", json=request).status_code == 422
