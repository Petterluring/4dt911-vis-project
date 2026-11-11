"""Module for compute-related dependencies."""

from typing import Annotated, cast

from fastapi import Depends, Request

from .clustering import ClusteringCache


def get_clustering_cache(request: Request) -> ClusteringCache:
    """Retrieve the clustering cache from the application state."""
    return cast(ClusteringCache, request.app.state.clustering_cache)


ClusteringCacheDep = Annotated[ClusteringCache, Depends(get_clustering_cache)]
