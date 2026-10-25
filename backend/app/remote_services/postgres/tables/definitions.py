"""Module for PostgreSQL table definitions."""

from sqlalchemy import (
    REAL,
    BigInteger,
    Boolean,
    Column,
    Date,
    Float,
    Integer,
    MetaData,
    Numeric,
    Table,
    Text,
)

metadata = MetaData()

listings = Table(
    "listings",
    metadata,
    Column("id", BigInteger, primary_key=True),
    Column("host_id", BigInteger, nullable=True),
    Column("listing_url", Text, nullable=True),
    Column("picture_url", Text, nullable=True),
    Column("latitude", REAL, nullable=True),
    Column("longitude", REAL, nullable=True),
    Column("property_type", Text, nullable=True),
    Column("room_type", Text, nullable=True),
    Column("accommodates", Integer, nullable=True),
    Column("bedrooms", Integer, nullable=True),
    Column("beds", Integer, nullable=True),
    Column("bathrooms", REAL, nullable=True),
    Column("bathrooms_text", Text, nullable=True),
    Column("price", REAL, nullable=True),
    Column("minimum_nights", Integer, nullable=True),
    Column("maximum_nights", Integer, nullable=True),
    Column("availability_30", Integer, nullable=True),
    Column("availability_60", Integer, nullable=True),
    Column("availability_90", Integer, nullable=True),
    Column("availability_365", Integer, nullable=True),
    Column("number_of_reviews", Integer, nullable=True),
    Column("number_of_reviews_ltm", Integer, nullable=True),
    Column("number_of_reviews_l30d", Integer, nullable=True),
    Column("first_review", Date, nullable=True),
    Column("last_review", Date, nullable=True),
    Column("reviews_per_month", REAL, nullable=True),
    Column("review_scores_rating", REAL, nullable=True),
    Column("review_scores_accuracy", REAL, nullable=True),
    Column("review_scores_cleanliness", REAL, nullable=True),
    Column("review_scores_checkin", REAL, nullable=True),
    Column("review_scores_communication", REAL, nullable=True),
    Column("review_scores_location", REAL, nullable=True),
    Column("review_scores_value", REAL, nullable=True),
    Column("deso_code", Text, nullable=True),
    Column("district", Text, nullable=True),
    Column("name", Text, nullable=True),
)

apartment_sales = Table(
    "apartment_sales",
    metadata,
    Column("Selling_date", Date, nullable=False),
    Column("Selling_price", Integer, nullable=True),
    Column("Street", Text, nullable=True),
    Column("District", Text, nullable=True),
    Column("Livingspace_m2", REAL, nullable=True),
    Column("Extra_living_space_m2", REAL, nullable=True),
    Column("Rooms", REAL, nullable=True),
    Column("Floor", REAL, nullable=True),
    Column("Value_change", REAL, nullable=True),
)

tourism_attractions = Table(
    "tourism_attractions",
    metadata,

    # Identifiers and categories
    Column("osm_id", Text, primary_key=True),
    Column("name", Text, nullable=False),
    Column("primary_category", Text, nullable=False),
    Column("primary_subcategory", Text, nullable=False),
    Column("analysis_group", Text, nullable=False),
    Column("all_osm_categories", Text, nullable=False),

    # Geographic coordinates
    Column("latitude", Float, nullable=False),
    Column("longitude", Float, nullable=False),

    # OSM attributes
    Column("amenity", Text, nullable=True),
    Column("tourism", Text, nullable=True),
    Column("historic", Text, nullable=True),
    Column("leisure", Text, nullable=True),
    Column("addr:street", Text, nullable=True),
    Column("addr:housenumber", Text, nullable=True),
    Column("addr:postcode", Text, nullable=True),
    Column("addr:city", Text, nullable=True),

    # Contact information
    Column("best_website", Text, nullable=True),
    Column("best_phone", Text, nullable=True),
    Column("best_email", Text, nullable=True),
    Column("best_instagram", Text, nullable=True),
    Column("best_facebook", Text, nullable=True),

    # Additional attributes
    Column("opening_hours", Text, nullable=True),
    Column("cuisine", Text, nullable=True),
    Column("wheelchair", Text, nullable=True),
    Column("outdoor_seating", Text, nullable=True),
    Column("indoor_seating", Text, nullable=True),
    Column("diet:vegan", Text, nullable=True),
    Column("diet:vegetarian", Text, nullable=True),
    Column("fee", Text, nullable=True),
    Column("operator", Text, nullable=True),
    Column("description", Text, nullable=True),
    Column("wikidata", Text, nullable=True),
    Column("wikipedia", Text, nullable=True),

    # External URLs
    Column("osm_url", Text, nullable=False),
    Column("wikidata_url", Text, nullable=True),

    # Nearby POI counts
    Column("all_pois_within_250m", Integer, nullable=False),
    Column("all_pois_within_500m", Integer, nullable=False),
    Column("all_pois_within_1000m", Integer, nullable=False),

    # Visitor attractions
    Column("visitor_attraction_within_500m", Integer, nullable=False),
    Column("visitor_attraction_within_1000m", Integer, nullable=False),
    Column("nearest_visitor_attraction_m", Float, nullable=False),

    # Culture and heritage
    Column("culture_heritage_within_500m", Integer, nullable=False),
    Column("culture_heritage_within_1000m", Integer, nullable=False),
    Column("nearest_culture_heritage_m", Float, nullable=False),

    # Nightlife
    Column("nightlife_within_500m", Integer, nullable=False),
    Column("nightlife_within_1000m", Integer, nullable=False),
    Column("nearest_nightlife_m", Float, nullable=False),

    # Food and drink
    Column("food_drink_within_500m", Integer, nullable=False),
    Column("food_drink_within_1000m", Integer, nullable=False),
    Column("nearest_food_drink_m", Float, nullable=False),

    # Culture and entertainment
    Column("culture_entertainment_within_500m", Integer, nullable=False),
    Column("culture_entertainment_within_1000m", Integer, nullable=False),
    Column("nearest_culture_entertainment_m", Float, nullable=False),

    # Parks and recreation
    Column("parks_recreation_within_500m", Integer, nullable=False),
    Column("parks_recreation_within_1000m", Integer, nullable=False),
    Column("nearest_parks_recreation_m", Float, nullable=False),

    # Accommodation
    Column("accommodation_within_500m", Integer, nullable=False),
    Column("accommodation_within_1000m", Integer, nullable=False),
    Column("nearest_accommodation_m", Float, nullable=True),

    # Data availability flags
    Column("has_website", Boolean, nullable=False),
    Column("has_phone", Boolean, nullable=False),
    Column("has_email", Boolean, nullable=False),
    Column("has_wikidata", Boolean, nullable=False),
    Column("has_wikipedia", Boolean, nullable=False),
    Column("has_opening_hours", Boolean, nullable=False),
    Column("has_description", Boolean, nullable=False),

    Column("original_osm_fields_present", Integer, nullable=False),

    # Visitor statistics
    Column("reported_annual_visitors", BigInteger, nullable=True),
    Column("reported_visitors_year", Integer, nullable=True),
    Column("visitor_count_source", Text, nullable=True),

    # Business statistics
    Column("reported_business_revenue_sek", Numeric(18, 2), nullable=True),
    Column("revenue_year", Integer, nullable=True),
    Column("revenue_source", Text, nullable=True),

    # Google Places attributes
    Column("google_place_id", Text, nullable=True),
    Column("google_rating", Float, nullable=True),
    Column("google_user_rating_count", Integer, nullable=True),
    Column("google_price_level", Integer, nullable=True),

    # Data sources
    Column("poi_source", Text, nullable=False),
    Column("spatial_measure_method", Text, nullable=False),

    # Administrative divisions
    Column("stadsdelsomrade", Text, nullable=True),
    Column("stadsdelsomrade_match_status", Text, nullable=False),
    Column("stadsdelsomrade_boundary_source", Text, nullable=False),
    Column("district", Text, nullable=True),
    Column("district_match_status", Text, nullable=False),
    Column("boundary_year", Integer, nullable=False),
    Column("boundary_source", Text, nullable=False),
)
