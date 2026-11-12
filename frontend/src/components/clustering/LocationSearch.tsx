import { useId, useState } from 'react';
import type { GeocodedLocation } from '../../interfaces/location';
import { useLocationSearch } from '../../hooks/useLocationSearch';
import { formatDistance, SEARCH_RADII } from '../../utils/location';

interface Props {
  location: GeocodedLocation | null;
  radiusMeters: number;
  onLocation: (location: GeocodedLocation | null) => void;
  onRadius: (radiusMeters: number) => void;
}
export default function LocationSearch({ location, radiusMeters, onLocation, onRadius }: Props) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [revision, setRevision] = useState(0);
  const searching = open && query !== location?.label;
  const search = useLocationSearch(searching ? query : null, revision);
  const active = activeIndex >= 0 && activeIndex < search.suggestions.length ? activeIndex : -1;
  const expanded = searching && search.suggestions.length > 0;
  function select(next: GeocodedLocation) {
    setQuery(next.label); setOpen(false); setActiveIndex(-1); onLocation(next);
  }
  return <section className="location-search panel" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Explore near a location</h3>
    <form className="location-search__form" onSubmit={event => {
      event.preventDefault();
      if (search.suggestions.length) select(search.suggestions[active < 0 ? 0 : active]);
      else setOpen(true);
    }}>
      <div className="location-search__field"><label htmlFor={`${id}-query`}>Address or place in Stockholm County</label>
        <input id={`${id}-query`} type="search" role="combobox" autoComplete="off" placeholder="Södermalm, Nacka, or a street address"
          value={query} aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-results`}
          aria-describedby={`${id}-help`} aria-activedescendant={expanded && active >= 0 ? `${id}-result-${active}` : undefined}
          onChange={event => { setQuery(event.target.value); setOpen(true); setActiveIndex(-1); }}
          onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={event => {
            if (event.key === 'Enter' && expanded) {
              event.preventDefault(); select(search.suggestions[active < 0 ? 0 : active]);
            }
            if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setActiveIndex(-1); }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault(); setOpen(true);
              if (search.suggestions.length) setActiveIndex(event.key === 'ArrowDown' ? (active + 1) % search.suggestions.length : (active <= 0 ? search.suggestions.length : active) - 1);
            }
          }} />
        {expanded && <ul id={`${id}-results`} className="location-suggestions" role="listbox" aria-label="Stockholm County locations">
          {search.suggestions.map((suggestion, index) => <li key={suggestion.id} id={`${id}-result-${index}`} role="option" aria-selected={active === index}
            onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => select(suggestion)}>{suggestion.label}</li>)}
        </ul>}
      </div>
      <button type="submit" className="location-search__submit" onMouseDown={event => event.preventDefault()}>Search</button>
      <div className="location-search__radius"><label htmlFor={`${id}-radius`}>Search radius</label>
        <select id={`${id}-radius`} value={radiusMeters} onChange={event => onRadius(Number(event.target.value))}>
          {SEARCH_RADII.map(radius => <option key={radius} value={radius}>{formatDistance(radius)}</option>)}
        </select></div>
      <button type="button" className="text-button" disabled={!location && !query} onClick={() => {
        setQuery(''); setOpen(false); setActiveIndex(-1); onLocation(null);
      }}>Reset location</button>
    </form>
    <p className="location-search__help" id={`${id}-help`}>Search provided by <a href="https://photon.komoot.io/" target="_blank" rel="noreferrer">Photon</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>. Select a result to set the search point.</p>
    {searching && <div className="location-search__status" role={search.status === 'error' ? 'alert' : 'status'}>
      {search.status === 'idle' ? 'Enter at least 3 characters.' : search.status === 'loading' ? 'Searching Stockholm County…' : search.status === 'error'
        ? <>{search.error} <button type="button" className="text-button" onMouseDown={event => event.preventDefault()} onClick={() => setRevision(value => value + 1)}>Retry search</button></>
        : !search.suggestions.length ? 'No matching locations in Stockholm County. Try a fuller address or place name.' : `${search.suggestions.length} suggestions. Use the arrow keys and Enter to select.`}
    </div>}
    {location && <p className="location-search__selection" role="status"><span className="search-location-key" />Search point: <strong>{location.label}</strong> · {formatDistance(radiusMeters)} radius</p>}
  </section>;
}
