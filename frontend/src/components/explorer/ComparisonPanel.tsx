import { useMemo } from 'react';
import type { District, PriceMode, Resource, ScatterplotStats } from '../../interfaces/explorer';
import { priceKeys } from '../../utils/explorer';
import Scatterplot from './Scatterplot';
interface Props {
  resource: Resource<ScatterplotStats>; mode: PriceMode; onMode: (mode: PriceMode) => void;
  selectedDistrict: District | null; hoveredDistrict: District | null;
  onHover: (district: District | null) => void; onSelect: (district: District) => void; onClose: () => void;
}
export default function ComparisonPanel({ resource, mode, onMode, selectedDistrict, hoveredDistrict, onHover, onSelect, onClose }: Props) {
  const points = useMemo(() => {
    const [housing, airbnb] = priceKeys(mode);
    return {
      tourism: resource.data?.tourism.flatMap(row => row.tourism_score == null || row.airbnb_listing_count == null ? [] : [{ district: row.district, x: row.tourism_score, y: row.airbnb_listing_count }]) ?? [],
      prices: resource.data?.prices.flatMap(row => row[housing] == null || row[airbnb] == null ? [] : [{ district: row.district, x: row[housing], y: row[airbnb] }]) ?? [],
    };
  }, [resource.data, mode]);
  const shared = { selectedDistrict, hoveredDistrict, onHover, onSelect };
  return <section className="comparison-panel panel" id="district-comparison" aria-labelledby="comparison-title">
    <header className="comparison-panel__header">
      <p className="eyebrow" id="comparison-title">District comparison</p>
      <div className="comparison-panel__actions">
        <fieldset className="segmented"><legend className="sr-only">Housing and Airbnb price aggregation</legend>
          {(['average', 'median'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => onMode(value)}>{value === 'average' ? 'Average' : 'Median'}</button>)}
        </fieldset>
        <button className="icon-button" type="button" aria-label="Close district comparison" onClick={onClose}>×</button>
      </div>
    </header>
    {resource.status === 'loading' ? <p role="status" className="panel-message">Loading district comparisons…</p>
      : resource.status === 'error' ? <p role="alert" className="panel-message">{resource.error}</p>
        : <div className="comparison-grid">
          <Scatterplot id="tourism" title="Tourism & Airbnb supply" subtitle="Each point represents one district." points={points.tourism}
            xLabel="Tourism score" yLabel="Airbnb listings" xFromZero yFromZero {...shared} />
          <Scatterplot id="prices" title="Housing & Airbnb prices" subtitle={`${mode === 'average' ? 'Average' : 'Median'} sale and nightly prices by district.`} points={points.prices}
            xLabel="Housing price (SEK / sale)" yLabel="Airbnb price (SEK / night)" {...shared} />
        </div>}
    <footer className="comparison-panel__footer"><span className="point-key" /> One district <span className="point-key point-key--selected" /> Selected district
      <span>Tourism scores are currently backend placeholders (0).</span></footer>
  </section>;
}
