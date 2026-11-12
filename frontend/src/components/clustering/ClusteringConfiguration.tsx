import { useId } from 'react';
import type { ListingClustersState } from '../../hooks/useListingClusters';
import { CLUSTERING_FEATURES } from '../../interfaces/clustering';
import { CLUSTERING_FEATURE_LABELS, formatClusteringConfiguration } from '../../utils/clusteringConfiguration';

export default function ClusteringConfiguration({ state }: { state: ListingClustersState }) {
  const id = useId();
  const { configuration, data } = state;
  const { draftFeatures, draftK, request, active, validation, pending, running, mock, inputListingCount,
    canRun, toggleFeature, setK, run } = configuration;
  return <details className="cluster-sidebar-section cluster-configuration panel" open>
    <summary>Clustering configuration
      <span className="cluster-configuration__status" role="status" aria-live="polite">{mock ? 'Fixed demonstration groups.' : active
        ? `Displayed results: ${formatClusteringConfiguration(active)}. ${data?.clusters.length ?? 0} clusters returned.`
        : running ? `Calculating ${formatClusteringConfiguration(request)}. Previous results are hidden.`
          : `No current results. Last applied: ${formatClusteringConfiguration(request)}.`}</span>
      {!mock && pending && <span className="cluster-configuration__pending">Unapplied changes</span>}
    </summary>
    <form noValidate onSubmit={event => { event.preventDefault(); run(); }} aria-label="Clustering configuration" aria-busy={running && !mock}>
      <p className="cluster-configuration__help">Group listings by accommodation characteristics. Price and location are analyzed separately.</p>
      <fieldset disabled={mock} aria-describedby={validation.errors.features ? `${id}-features-error` : undefined}>
        <legend>Accommodation characteristics</legend>
        <div className="cluster-configuration__features">{CLUSTERING_FEATURES.map(feature => <label key={feature}>
          <input type="checkbox" name={feature} checked={draftFeatures.includes(feature)} onChange={() => toggleFeature(feature)}
            aria-invalid={validation.errors.features ? true : undefined} />{CLUSTERING_FEATURE_LABELS[feature]}
        </label>)}</div>
      </fieldset>
      {validation.errors.features && <p className="cluster-configuration__error" id={`${id}-features-error`} role="alert">{validation.errors.features}</p>}
      <label className="cluster-configuration__k" htmlFor={`${id}-k`}>Number of clusters (K)
        <input id={`${id}-k`} name="n_clusters" type="number" min={2} step={1} max={inputListingCount} value={draftK} disabled={mock}
          onChange={event => setK(event.target.value)} aria-invalid={validation.errors.k ? true : undefined}
          aria-describedby={validation.errors.k ? `${id}-k-error` : `${id}-k-help`} />
      </label>
      <p className="cluster-configuration__help" id={`${id}-k-help`}>{inputListingCount !== undefined && inputListingCount < 2
        ? `The last backend dataset has ${inputListingCount} listings; clustering requires at least 2.`
        : `Whole numbers from 2${inputListingCount !== undefined ? ` to ${inputListingCount} (last backend dataset)` : '; the upper limit is the backend dataset size'}.`}</p>
      {validation.errors.k && <p className="cluster-configuration__error" id={`${id}-k-error`} role="alert">{validation.errors.k}</p>}
      <button type="submit" className="cluster-configuration__run" disabled={!canRun}>{running && !pending && !mock ? 'Running clustering…' : 'Run Clustering'}</button>
      {mock ? <p className="cluster-configuration__help">Demonstration groups are fixed. Use API mode to run different features and K.</p>
        : pending && <p className="cluster-configuration__pending">Unapplied changes{active ? ': displayed results still use the active configuration' : ''}. Run Clustering to apply valid settings.</p>}
    </form>
  </details>;
}
