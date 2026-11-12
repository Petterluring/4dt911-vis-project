"""Tests for the clustering cache."""

import pandas as pd
import pytest

from app.compute.clustering import ClusteringCache


@pytest.mark.parametrize("size", [0, -1])
def test_rejects_non_positive_cache_sizes(size: int) -> None:
    with pytest.raises(ValueError, match="positive"):
        ClusteringCache(size)


def test_initial_state_and_input_replacement() -> None:
    cache = ClusteringCache(2)
    assert cache.input_data is None
    assert cache.clustering_results == {}
    assert cache.max_cache_size == 2

    first = pd.DataFrame({"value": [1]})
    second = pd.DataFrame({"value": [2]})
    result = pd.Series([0])
    cache.set_input_data(first)
    cache.add_clustering_result("config", result)
    cache.set_input_data(second)
    assert cache.input_data is second
    assert cache.get_clustering_result("config") is result


def test_retrieval_marks_result_recently_used() -> None:
    cache = ClusteringCache(2)
    first, second, third = pd.Series([1]), pd.Series([2]), pd.Series([3])
    cache.add_clustering_result("first", first)
    cache.add_clustering_result("second", second)
    assert cache.get_clustering_result("missing") is None
    assert cache.get_clustering_result("first") is first
    cache.add_clustering_result("third", third)
    assert list(cache.clustering_results) == ["first", "third"]
    assert cache.get_clustering_result("second") is None
    assert cache.get_clustering_result("third") is third


def test_update_marks_result_recently_used_without_eviction() -> None:
    cache = ClusteringCache(2)
    first, second, updated, third = (pd.Series([n]) for n in range(4))
    cache.add_clustering_result("first", first)
    cache.add_clustering_result("second", second)
    cache.add_clustering_result("first", updated)
    assert list(cache.clustering_results) == ["second", "first"]
    assert cache.clustering_results["first"] is updated
    cache.add_clustering_result("third", third)
    assert list(cache.clustering_results) == ["first", "third"]
    assert cache.get_clustering_result("second") is None


def test_single_entry_cache_removal_and_clear() -> None:
    cache = ClusteringCache(1)
    data = pd.DataFrame({"value": [1]})
    cache.set_input_data(data)
    cache.add_clustering_result("first", pd.Series([0]))
    cache.add_clustering_result("second", pd.Series([1]))
    assert list(cache.clustering_results) == ["second"]
    cache.remove_clustering_result("missing")
    cache.remove_clustering_result("second")
    assert not cache.clustering_results
    cache.add_clustering_result("third", pd.Series([2]))
    cache.clear_clustering_results()
    assert not cache.clustering_results
    assert cache.input_data is data

