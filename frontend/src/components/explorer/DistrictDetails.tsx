import type { District, DistrictTooltip, Resource } from '../../interfaces/explorer';
import { formatNumber, formatRating } from '../../utils/explorer';
interface Props { district: District; tooltips: Resource<DistrictTooltip[]> }
export default function DistrictDetails({ district, tooltips }: Props) {
  const data = tooltips.data?.find(row => row.district === district);
  return <section className="district-details" aria-label={`${district} statistics`}>
    <p className="eyebrow">District overview</p><h2>{district}</h2>
    {tooltips.status === 'loading' ? <p role="status">Loading district statistics…</p>
      : tooltips.status === 'error' ? <p role="alert">{tooltips.error}</p>
        : !data ? <p>No statistics available for this district.</p>
          : <dl className="district-details__grid">
            <div><dt>Average housing price</dt><dd>{formatNumber(data.average_housing_price_per_m2)} <small>SEK/m²</small></dd></div>
            <div><dt>Median Airbnb price</dt><dd>{formatNumber(data.median_airbnb_price)} <small>SEK/night</small></dd></div>
            <div><dt>Airbnb listings</dt><dd>{formatNumber(data.airbnb_listing_count)}</dd></div>
            <div><dt>Tourism score (placeholder)</dt><dd>{formatNumber(data.tourism_score)}</dd></div>
            <div><dt>Average Airbnb rating</dt><dd>{formatRating(data.average_airbnb_rating)}</dd></div>
            <div><dt>Tourist attractions</dt><dd>{formatNumber(data.tourist_attractions)}</dd></div>
          </dl>}
  </section>;
}
