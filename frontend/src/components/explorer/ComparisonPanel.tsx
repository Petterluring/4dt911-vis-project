import { useMemo } from 'react';
import type { District, PriceMode, Resource, ScatterplotStats } from '../../interfaces/explorer';
import { priceKeys } from '../../utils/explorer';
import Scatterplot from './Scatterplot';
interface Props {
  resource: Resource<ScatterplotStats>; mode: PriceMode; onMode: (mode: PriceMode) => void;
  selectedDistrict: District | null; hoveredDistrict: District | null;
  onHover: (district: District | null) => void; onSelect: (district: District) => void;
}
export default function ComparisonPanel({ resource, mode, onMode, selectedDistrict, hoveredDistrict, onHover, onSelect }: Props) {
  const points = useMemo(() => {
    const [housing, airbnb] = priceKeys(mode);
    return {
      tourism: resource.data?.tourism.flatMap(row => row.tourism_score == null || row.airbnb_listing_count == null ? [] : [{ district: row.district, x: row.tourism_score, y: row.airbnb_listing_count }]) ?? [],
      prices: resource.data?.prices.flatMap(row => row[housing] == null || row[airbnb] == null ? [] : [{ district: row.district, x: row[housing], y: row[airbnb] }]) ?? [],
    };
  }, [resource.data, mode]);
  const shared = { selectedDistrict, hoveredDistrict, onHover, onSelect };
  const priceModeControl = <fieldset className="segmented"><legend className="sr-only">Housing and Airbnb price aggregation</legend>
    {(['average', 'median'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => onMode(value)}>{value === 'average' ? 'Average' : 'Median'}</button>)}
  </fieldset>;
  return <section className="comparison-panel panel" id="district-comparison" aria-labelledby="comparison-title">
    <h2 className="sr-only" id="comparison-title">District comparison</h2>
    {resource.status === 'loading' ? <p role="status" className="panel-message">Loading district comparisons…</p>
      : resource.status === 'error' ? <p role="alert" className="panel-message">{resource.error}</p>
        : <div className="comparison-grid">
          <Scatterplot id="tourism" title="Tourism & Airbnb supply" subtitle="Each point represents one district." points={points.tourism}
            xLabel="Tourism score" yLabel="Airbnb listings" xFromZero yFromZero {...shared} />
          <Scatterplot id="prices" title="Housing & Airbnb prices" subtitle={`${mode === 'average' ? 'Average' : 'Median'} sale and nightly prices by district.`} points={points.prices}
            xLabel="Housing price (SEK / sale)" yLabel="Airbnb price (SEK / night)" headerControls={priceModeControl} {...shared} />
        </div>}
  </section>;
}
