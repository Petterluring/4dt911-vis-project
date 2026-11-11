import type { ListingLocation } from '../interfaces/explorer';
import type { ClusterId, ClusterProfile, ClusteringData } from '../interfaces/clustering';
import { knownNonnegative, medianValue, priceDistribution } from '../utils/clustering';

const profiles = [
  { id: 'compact', label: 'Compact stays', color: '#167D8D', description: 'Private rooms and smaller accommodation' },
  { id: 'apartment', label: 'Standard apartments', color: '#7656A3', description: 'Entire homes with moderate guest capacity' },
  { id: 'large', label: 'Larger stays', color: '#B45C26', description: 'More space, beds, or guest capacity' },
];

// A transparent demonstration rule, not a clustering model. Price and location
// are intentionally absent from this function's input.
export function mockClusterId(listing: Pick<ListingLocation, 'room_type' | 'accommodates' | 'bedrooms' | 'beds'>): ClusterId | null {
  if (listing.room_type === 'Private room' || listing.room_type === 'Shared room') return 'compact';
  const { accommodates, bedrooms, beds } = listing;
  if ((knownNonnegative(accommodates) && accommodates >= 5) ||
    (knownNonnegative(bedrooms) && bedrooms >= 3) || (knownNonnegative(beds) && beds >= 4)) return 'large';
  if (listing.room_type === 'Entire home/apt') return 'apartment';
  if (knownNonnegative(accommodates) && accommodates > 0 && accommodates <= 2) return 'compact';
  return null;
}

// Approximate neighbourhood centres are only used when existing locations are
// unavailable. These are synthetic examples, never actual Airbnb properties.
function fallbackListings(): ListingLocation[] {
  const centres = [
    { latitude: 59.315, longitude: 18.071, district: 'Södermalm' },
    { latitude: 59.333, longitude: 18.031, district: 'Kungsholmen' },
    { latitude: 59.347, longitude: 18.052, district: 'Norra innerstaden' },
    { latitude: 59.334, longitude: 17.947, district: 'Bromma' },
    { latitude: 59.293, longitude: 18.023, district: 'Hägersten-Älvsjö' },
    { latitude: 59.283, longitude: 18.081, district: 'Enskede-Årsta-Vantör' },
  ] as const;
  return Array.from({ length: 90 }, (_, index) => {
    const type = index % 3;
    const centre = centres[Math.floor(index / 3) % centres.length];
    const room_type = type === 0 ? (index % 5 === 0 ? 'Entire home/apt' : 'Private room') : 'Entire home/apt';
    const variation = (index * 37 % 17) / 16;
    return {
      id: `demo-${index + 1}`, name: `Demo ${['compact stay', 'apartment', 'larger stay'][type]} ${index + 1}`,
      latitude: centre.latitude + Math.sin(index * 2.4) * .006,
      longitude: centre.longitude + Math.cos(index * 1.7) * .009,
      district: centre.district, room_type, property_type: type === 2 ? 'Entire home' : 'Rental unit',
      // Generated after the accommodation category; not used for assignment.
      price: Math.round(([390, 850, 1500][type] + variation * [520, 1250, 2100][type]) * (index % 29 === 0 ? 2.5 : 1)),
      accommodates: [2, 4, 6 + index % 3][type], bedrooms: [room_type === 'Private room' ? 1 : 0, 1 + index % 2, 3][type],
      beds: [1, 2, 4][type], listing_url: null, picture_url: null, bathrooms_text: null,
      review_scores_rating: null, number_of_reviews: null, minimum_nights: null,
    };
  });
}

export function createMockClustering(existing: ListingLocation[] | null): ClusteringData {
  const source = existing ?? fallbackListings();
  const listings = [...new Map(source.map(listing => [listing.id, listing])).values()]
    .map(listing => ({ ...listing, clusterId: mockClusterId(listing) }));
  const clusters: ClusterProfile[] = profiles.flatMap(profile => {
    const members = listings.filter(listing => listing.clusterId === profile.id);
    if (!members.length) return [];
    const roomTypes = new Map<string, number>();
    for (const listing of members) {
      const type = listing.room_type ?? 'Unknown';
      roomTypes.set(type, (roomTypes.get(type) ?? 0) + 1);
    }
    return [{ ...profile, listingCount: members.length,
      medianAccommodates: medianValue(members.map(listing => listing.accommodates)),
      medianBedrooms: medianValue(members.map(listing => listing.bedrooms)),
      medianBeds: medianValue(members.map(listing => listing.beds)),
      roomTypes: [...roomTypes].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count, percentage: count / members.length * 100 })),
      prices: priceDistribution(members.map(listing => listing.price)),
    }];
  });
  return { clusters, listings, metadata: {
    mode: 'mock', source: existing === null ? 'synthetic-fallback' : 'existing-listings',
    description: existing === null
      ? 'Synthetic fallback: 90 fictional listings at approximate Stockholm locations. All characteristics and asking prices are demonstration data.'
      : 'Existing listing locations, accommodation characteristics, and asking prices with demonstration group assignments.',
  } };
}
