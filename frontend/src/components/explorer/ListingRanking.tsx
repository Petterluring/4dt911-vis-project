import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { KeyboardEvent } from 'react';
import type { ListingLocation, Resource } from '../../interfaces/explorer';
import { formatNumber } from '../../utils/explorer';
import { safeExternalUrl } from '../../utils/listing';
import { LISTING_ROW_HEIGHT, LISTING_SORTS, listingWindow, rankListings } from '../../utils/ranking';
import type { ListingSortKey, SortDirection } from '../../utils/ranking';
interface Props {
  resource: Resource<ListingLocation[]>;
  listings: ListingLocation[];
  allListings: ListingLocation[];
  groupActive?: boolean;
  selectedListingId: string | null;
  selectionRevision?: number;
  onSelect: (listing: ListingLocation) => void;
}
function Preview({ listing, left, top }: { listing: ListingLocation; left: number; top: number }) {
  const [failed, setFailed] = useState(false);
  const url = safeExternalUrl(listing.picture_url);
  return createPortal(<aside id="listing-preview" role="tooltip" className="listing-preview" style={{ left, top }}>
    {url && !failed ? <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <div className="listing-preview__fallback">No photo available</div>}
    <div><strong>{listing.name ?? `Listing #${listing.id}`}</strong>
      <p>{listing.district ?? 'Stockholm'} · {listing.room_type ?? 'Unknown room type'}</p>
      <p>{listing.property_type}</p>
      <dl><div><dt>Nightly price</dt><dd>{listing.price == null ? 'N/A' : formatNumber(listing.price) + ' SEK'}</dd></div>
        <div><dt>Rating</dt><dd>{listing.review_scores_rating?.toFixed(2) ?? 'N/A'}</dd></div>
        <div><dt>Bedrooms</dt><dd>{formatNumber(listing.bedrooms)}</dd></div>
        <div><dt>Beds</dt><dd>{formatNumber(listing.beds)}</dd></div>
        <div><dt>Bathrooms</dt><dd>{listing.bathrooms_text ?? 'Unknown'}</dd></div>
        <div><dt>Minimum stay</dt><dd>{listing.minimum_nights == null ? 'Unknown' : `${formatNumber(listing.minimum_nights)} nights`}</dd></div></dl>
    </div>
  </aside>, document.body);
}
export default function ListingRanking({ resource, listings, allListings, groupActive = false, selectedListingId, selectionRevision = 0, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<ListingSortKey>('price');
  const [direction, setDirection] = useState<SortDirection>('asc');
  const [viewport, setViewport] = useState({ scrollTop: 0, height: 240 });
  const [preview, setPreview] = useState<{ listing: ListingLocation; left: number; top: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const ranked = useMemo(() => rankListings(listings, sortKey, direction), [listings, sortKey, direction]);
  const selectedIndex = useMemo(() => ranked.findIndex(listing => listing.id === selectedListingId), [ranked, selectedListingId]);
  const range = listingWindow(ranked.length, viewport.scrollTop, viewport.height);
  const visible = ranked.slice(range.start, range.end);
  function hidePreview() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPreview(null);
  }
  function showPreview(listing: ListingLocation, element: HTMLElement, delayed: boolean) {
    hidePreview();
    const rect = element.getBoundingClientRect();
    const width = Math.min(300, window.innerWidth - 16);
    const position = { listing, left: Math.max(8, Math.min(rect.right + 10, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(rect.top, window.innerHeight - 410)) };
    if (delayed) timer.current = setTimeout(() => setPreview(position), 300);
    else setPreview(position);
  }
  useEffect(() => {
    const dismiss = () => hidePreview();
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', escape);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener('keydown', escape);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, []);
  useEffect(() => {
    if (!scrollArea.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const element = scrollArea.current;
      if (element) setViewport({ scrollTop: element.scrollTop, height: entry.contentRect.height });
    });
    observer.observe(scrollArea.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = scrollArea.current;
    if (!element) return;
    if (selectedIndex < 0) { element.scrollTo({ top: 0 }); return; }
    const top = selectedIndex * LISTING_ROW_HEIGHT;
    if (top < element.scrollTop || top + LISTING_ROW_HEIGHT > element.scrollTop + element.clientHeight) {
      element.scrollTo({ top: Math.max(0, top - (element.clientHeight - LISTING_ROW_HEIGHT) / 2) });
    }
  }, [selectedIndex, ranked, selectionRevision]);
  function navigate(event: KeyboardEvent<HTMLDivElement>, index: number) {
    if (event.key === 'Escape') { hidePreview(); return; }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); hidePreview(); onSelect(ranked[index]); return; }
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? ranked.length - 1 :
      event.key === 'ArrowDown' ? Math.min(ranked.length - 1, index + 1) : event.key === 'ArrowUp' ? Math.max(0, index - 1) : -1;
    if (next < 0) return;
    event.preventDefault();
    hidePreview();
    scrollArea.current?.scrollTo({ top: Math.max(0, next * LISTING_ROW_HEIGHT - viewport.height / 2) });
    const element = scrollArea.current;
    if (element) setViewport({ scrollTop: element.scrollTop, height: element.clientHeight });
    requestAnimationFrame(() => document.getElementById(`ranked-listing-${ranked[next].id}`)?.focus({ preventScroll: true }));
  }
  function sort(key: ListingSortKey) {
    hidePreview();
    setSortKey(key); setDirection(key === sortKey && direction === 'asc' ? 'desc' : 'asc');
  }
  return <section className="listing-ranking panel" aria-labelledby="ranking-title">
    <header className="ranking-header"><h2 id="ranking-title">{groupActive ? 'Selected listings' : 'Listing ranking'}</h2>
      <span className="ranking-count">{formatNumber(listings.length)} / {formatNumber(allListings.length)}</span></header>
    <p className="sr-only" id="ranking-keyboard">Sort using column headers. Focus or hover a row for a preview. Enter opens the listing details. Use arrow keys, Home and End to navigate. Missing values sort last.</p>
    <div className="ranking-table" role="grid" aria-label="Airbnb listings" aria-describedby="ranking-keyboard" aria-rowcount={ranked.length + 1} aria-colcount={7} aria-busy={resource.status === 'loading'}>
      <div role="row" aria-rowindex={1} className="ranking-columns">
        <span role="columnheader" aria-label="Rank">#</span><span role="columnheader">Listing</span>
        {(Object.entries(LISTING_SORTS) as [ListingSortKey, string][]).map(([key, label]) => <span key={key} role="columnheader" aria-sort={sortKey === key ? direction === 'asc' ? 'ascending' : 'descending' : 'none'}>
          <button type="button" onClick={() => sort(key)}>{label}{sortKey === key ? direction === 'asc' ? ' ↑' : ' ↓' : ''}</button></span>)}
      </div>
      <div ref={scrollArea} className="ranking-list" role="rowgroup" onScroll={event => { hidePreview(); setViewport({ scrollTop: event.currentTarget.scrollTop, height: event.currentTarget.clientHeight }); }}>
        {resource.status === 'loading' ? <p className="ranking-message" role="status">Loading listings.</p>
          : resource.status === 'error' ? <p className="ranking-message" role="alert">{resource.error}</p>
            : !ranked.length ? <p className="ranking-message" role="status">No listings match. Try changing or resetting the filters.</p>
              : <div role="presentation" style={{ paddingTop: range.top, paddingBottom: range.bottom }}>
                {visible.map((listing, offset) => <div key={listing.id} id={`ranked-listing-${listing.id}`} tabIndex={0}
                  className={`ranking-row ${selectedListingId === listing.id ? 'ranking-row--selected' : ''}`}
                  role="row" aria-selected={selectedListingId === listing.id} aria-rowindex={range.start + offset + 2}
                  aria-describedby={preview?.listing.id === listing.id ? 'listing-preview' : undefined}
                  onMouseEnter={event => showPreview(listing, event.currentTarget, true)} onMouseLeave={hidePreview}
                  onFocus={event => showPreview(listing, event.currentTarget, false)} onBlur={hidePreview}
                  onKeyDown={event => navigate(event, range.start + offset)} onClick={() => { hidePreview(); onSelect(listing); }}>
                  <span role="gridcell" className="ranking-position">{range.start + offset + 1}</span>
                  <span role="gridcell" className="ranking-name">{listing.name ?? `Listing #${listing.id}`}</span>
                  <span role="gridcell">{formatNumber(listing.price)}</span>
                  <span role="gridcell">{listing.review_scores_rating == null ? '—' : listing.review_scores_rating.toFixed(2)}</span>
                  <span role="gridcell">{formatNumber(listing.number_of_reviews)}</span>
                  <span role="gridcell">{formatNumber(listing.bedrooms)}</span>
                  <span role="gridcell">{formatNumber(listing.accommodates)}</span>
                </div>)}
              </div>}
      </div>
    </div>
    {preview && <Preview key={preview.listing.id} {...preview} />}
  </section>;
}
