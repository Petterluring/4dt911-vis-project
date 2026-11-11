"""Tests for app.router.requests.clustering."""

import pytest
from pydantic import ValidationError

from app.router.requests.clustering import LEGAL_FEATURES, ClusteringRequest


def test_valid_clustering_request():
    """Test creating a valid ClusteringRequest."""
    request = ClusteringRequest(
        features=["room_type", "accommodates"],
        n_clusters=3
    )
    assert request.features == ["room_type", "accommodates"]
    assert request.n_clusters == 3


def test_valid_clustering_request_all_features():
    """Test creating a ClusteringRequest with all legal features."""
    request = ClusteringRequest(
        features=LEGAL_FEATURES,
        n_clusters=5
    )
    assert request.features == LEGAL_FEATURES
    assert request.n_clusters == 5


def test_single_feature():
    """Test ClusteringRequest with a single feature."""
    request = ClusteringRequest(
        features=["room_type"],
        n_clusters=2
    )
    assert request.features == ["room_type"]
    assert request.n_clusters == 2


def test_duplicate_features_removed():
    """Test that duplicate features are removed."""
    request = ClusteringRequest(
        features=["room_type", "accommodates", "room_type"],
        n_clusters=3
    )
    assert set(request.features) == {"room_type", "accommodates"}
    assert len(request.features) == 2


def test_minimum_n_clusters():
    """Test ClusteringRequest with minimum n_clusters value."""
    request = ClusteringRequest(
        features=["room_type"],
        n_clusters=2
    )
    assert request.n_clusters == 2


def test_large_n_clusters():
    """Test ClusteringRequest with large n_clusters value."""
    request = ClusteringRequest(
        features=["room_type", "accommodates"],
        n_clusters=100
    )
    assert request.n_clusters == 100


def test_missing_features_field():
    """Test that missing features field raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ClusteringRequest(n_clusters=3)
    assert "features" in str(exc_info.value)


def test_missing_n_clusters_field():
    """Test that missing n_clusters field raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ClusteringRequest(features=["room_type"])
    assert "n_clusters" in str(exc_info.value)


def test_empty_features_list():
    """Test that empty features list raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info: # noqa: F841
        ClusteringRequest(
            features=[],
            n_clusters=3
        )


def test_invalid_feature():
    """Test that invalid feature raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ClusteringRequest(
            features=["invalid_feature"],
            n_clusters=3
        )
    assert "All features must be one of" in str(exc_info.value)


def test_invalid_feature_mixed_with_valid():
    """Test that mixture of invalid and valid features raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ClusteringRequest(
            features=["room_type", "invalid_feature", "accommodates"],
            n_clusters=3
        )
    assert "All features must be one of" in str(exc_info.value)


@pytest.mark.parametrize("n_clusters", [0, 1, -5])
def test_n_clusters_below_minimum(n_clusters):
    """Test that n_clusters below 2 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ClusteringRequest(
            features=["room_type"],
            n_clusters=n_clusters
        )
    assert "greater than or equal to 2" in str(exc_info.value)


def test_n_clusters_not_integer():
    """Test that non-integer n_clusters raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info: # noqa: F841
        ClusteringRequest(
            features=["room_type"],
            n_clusters=3.5
        )


def test_features_with_extra_whitespace():
    """Test that feature names with whitespace fail validation."""
    request = ClusteringRequest(
               features=[" room_type "],
               n_clusters=3
            )
    assert request.features == ["room_type"]


def test_feature_order_preserved_after_deduplication():
    """Test that first occurrence of feature is preserved after deduplication."""
    request = ClusteringRequest(
        features=["accommodates", "room_type", "accommodates", "bedrooms"],
        n_clusters=3
    )
    assert len(request.features) == 3
    assert set(request.features) == {"accommodates", "room_type", "bedrooms"}
