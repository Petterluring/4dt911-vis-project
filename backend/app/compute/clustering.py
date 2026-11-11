"""Module for clustering computations and caching results."""

from collections import OrderedDict
from typing import Any

import pandas as pd
from sklearn.cluster import KMeans
from sklearn.impute import KNNImputer
from sklearn.preprocessing import OneHotEncoder, RobustScaler

from app.router.requests.clustering import ClusteringRequest

NUMERIC_FEATURES = ["accommodates", "bedrooms", "bathrooms", "beds"]
CLUSTERING_FEATURES = ["room_type", "accommodates", "bedrooms", "bathrooms", "beds"]
class ClusteringCache:
    """Cache clustering input and a bounded set of least-recently-used results.

    DataFrames and Series are stored by reference. Replacing input data does not
    clear cached results; callers should clear them if they are no longer valid.
    """

    def __init__(self, max_cache_size: int) -> None:
        if max_cache_size <= 0:
            raise ValueError("max_cache_size must be positive")

        self.input_data: pd.DataFrame | None = None
        self.clustering_results: OrderedDict[str, pd.Series] = OrderedDict()
        self.max_cache_size: int = max_cache_size

    def set_input_data(self, input_data: pd.DataFrame) -> None:
        """Store or replace the input DataFrame."""
        self.input_data = input_data

    def add_clustering_result(self, identifier: str, result: pd.Series) -> None:
        """Store a result and mark it as most recently used."""
        if identifier in self.clustering_results:
            self.clustering_results.move_to_end(identifier)
        elif len(self.clustering_results) >= self.max_cache_size:
            self.clustering_results.popitem(last=False)
        self.clustering_results[identifier] = result

    def get_clustering_result(self, identifier: str) -> pd.Series | None:
        """Return a result and mark it as most recently used, or return None."""
        if identifier not in self.clustering_results:
            return None
        self.clustering_results.move_to_end(identifier)
        return self.clustering_results[identifier]

    def remove_clustering_result(self, identifier: str) -> None:
        """Remove a result if it is cached."""
        self.clustering_results.pop(identifier, None)

    def clear_clustering_results(self) -> None:
        """Remove all cached clustering results."""
        self.clustering_results.clear()



def impute_knn(df: pd.DataFrame, n_neighbors: int = 5) -> pd.DataFrame:
    """Impute numeric columns in place after robust scaling and return df."""
    if n_neighbors <= 0:
        raise ValueError("n_neighbors must be positive")
    numeric = df[NUMERIC_FEATURES].astype(float)
    scaler = RobustScaler()
    scaled = scaler.fit_transform(numeric)
    imputed_scaled = KNNImputer(n_neighbors=n_neighbors).fit_transform(scaled)
    df[NUMERIC_FEATURES] = scaler.inverse_transform(imputed_scaled)
    return df

def _hot_encode_room_type(df: pd.DataFrame) -> pd.DataFrame:
    """One-hot encode the 'room_type' column and return the modified DataFrame."""
    encoder = OneHotEncoder(sparse_output=False, drop="first")
    room_type_encoded = encoder.fit_transform(df[["room_type"]])
    room_type_df = pd.DataFrame(room_type_encoded, index=df.index,
                                columns=encoder.get_feature_names_out(["room_type"]))
    df = pd.concat([df, room_type_df], axis=1)
    return df


def perform_kmeans_clustering(
    df: pd.DataFrame,
    request: ClusteringRequest,
) -> pd.Series[Any]:
    """Perform KMeans clustering on selected features."""
    features = [
        feature
        for feature in request.features
        if feature in CLUSTERING_FEATURES
    ]

    if not features:
        raise ValueError("No valid features provided for clustering")

    df = df.copy()

    if "room_type" in features:
        df = _hot_encode_room_type(df)
        df = df.drop(columns=["room_type"])

        features.remove("room_type")
        features.extend(
            col for col in df.columns
            if col.startswith("room_type_")
        )

    # Select the requested clustering features
    X = df[features].copy()

    # Scale numerical features
    numerical_features = [
        col for col in features
        if col in CLUSTERING_FEATURES and col != "room_type"
    ]

    if numerical_features:
        scaler = RobustScaler()
        X[numerical_features] = scaler.fit_transform(
            X[numerical_features]
        )

    kmeans = KMeans(
        n_clusters=request.n_clusters,
        n_init=10,
        random_state=42,
    )

    labels = kmeans.fit_predict(X)

    return pd.Series(labels, index=df.index)
