import { useEffect, useMemo, useState } from 'react';
import { bin } from 'd3';
import { fetchComparables, fetchPrediction } from '../api/positioning';
import type { PropertyInput } from '../api/positioning';
import type { Resource } from '../interfaces/explorer';

type Comparables = Awaited<ReturnType<typeof fetchComparables>>;
type Prediction = Awaited<ReturnType<typeof fetchPrediction>>;

export function usePositioning() {
  const [submitted, setSubmitted] = useState<{ input: PropertyInput; count: number } | null>(null);
  const [comparables, setComparables] = useState<Resource<Comparables> | null>(null);
  const [prediction, setPrediction] = useState<Resource<Prediction> | null>(null);
  const [activePriceBin, setActivePriceBin] = useState<number | null>(null);
  const priceBins = useMemo(() => bin<Comparables[number], number>()
    .value(row => row.price ?? NaN).thresholds(8)(comparables?.data ?? []), [comparables?.data]);
  const activeBucket = activePriceBin == null ? undefined : priceBins[activePriceBin];
  const highlightedPriceIds = useMemo(() => activeBucket?.length
    ? new Set(activeBucket.map(row => row.id)) : null, [activeBucket]);

  useEffect(() => {
    if (!submitted) return;
    const request = new AbortController();
    void fetchComparables(submitted.input, submitted.count, request.signal).then(data => {
      if (!request.signal.aborted) setComparables({ status: 'success', data });
    }).catch(() => {
      if (!request.signal.aborted) setComparables({ status: 'error', error: 'Comparable listings could not be loaded.' });
    });
    void fetchPrediction(submitted.input, request.signal).then(data => {
      if (!request.signal.aborted) setPrediction({ status: 'success', data });
    }).catch((error: unknown) => {
      if (!request.signal.aborted) setPrediction({ status: 'error', error: error instanceof Error ? error.message : 'Prediction unavailable.' });
    });
    return () => request.abort();
  }, [submitted]);

  function calculate(input: PropertyInput, count: number) {
    setActivePriceBin(null);
    setComparables({ status: 'loading' });
    setPrediction({ status: 'loading' });
    setSubmitted({ input, count });
  }

  function togglePriceBin(index: number) {
    setActivePriceBin(current => current === index ? null : index);
  }

  function clearPriceBin() {
    setActivePriceBin(null);
  }

  return { submitted, comparables, prediction, calculate, priceBins, activePriceBin, highlightedPriceIds, togglePriceBin, clearPriceBin };
}
