const schema = {};
schema.Thing = require("./Thing.js");
/**
 * Schema.org/Place
 * Entities that have a somewhat fixed, physical extension.
 *
 * @author schema.org
 * @class Place
 * @module org.schema
 * @extends Thing
 */
module.exports = class Place extends schema.Thing {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/","Place");
	}

	/**
	 * Schema.org/aggregateRating
	 * The overall rating, based on a collection of reviews or ratings, of the item.
	 *
	 * @property aggregateRating
	 * @type AggregateRating
	 */
	aggregateRating;

	/**
	 * Schema.org/geoIntersects
	 * Represents spatial relations in which two geometries (or the places they represent) have at least one point in common. As defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM).
	 *
	 * @property geoIntersects
	 * @type Place
	 */
	geoIntersects;

	/**
	 * Schema.org/photos
	 * Photographs of this place.
	 *
	 * @property photos
	 * @type Photograph
	 */
	photos;

	/**
	 * Schema.org/address
	 * Physical address of the item.
	 *
	 * @property address
	 * @type Text
	 */
	address;

	/**
	 * Schema.org/tourBookingPage
	 * A page providing information on how to book a tour of some [[Place]], such as an [[Accommodation]] or [[ApartmentComplex]] in a real estate setting, as well as other kinds of tours as appropriate.
	 *
	 * @property tourBookingPage
	 * @type URL
	 */
	tourBookingPage;

	/**
	 * Schema.org/longitude
	 * The longitude of a location. For example ```-122.08585``` ([WGS 84](https://en.wikipedia.org/wiki/World_Geodetic_System)).
	 *
	 * @property longitude
	 * @type Number
	 */
	longitude;

	/**
	 * Schema.org/geo
	 * The geo coordinates of the place.
	 *
	 * @property geo
	 * @type GeoShape
	 */
	geo;

	/**
	 * Schema.org/globalLocationNumber
	 * The [Global Location Number](http://www.gs1.org/gln) (GLN, sometimes also referred to as International Location Number or ILN) of the respective organization, person, or place. The GLN is a 13-digit number used to identify parties and physical locations.
	 *
	 * @property globalLocationNumber
	 * @type Text
	 */
	globalLocationNumber;

	/**
	 * Schema.org/geoCoveredBy
	 * Represents a relationship between two geometries (or the places they represent), relating a geometry to another that covers it. As defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM).
	 *
	 * @property geoCoveredBy
	 * @type GeospatialGeometry
	 */
	geoCoveredBy;

	/**
	 * Schema.org/containedInPlace
	 * The basic containment relation between a place and one that contains it.
	 *
	 * @property containedInPlace
	 * @type Place
	 */
	containedInPlace;

	/**
	 * Schema.org/specialOpeningHoursSpecification
	 * The special opening hours of a certain place.\n\nUse this to explicitly override general opening hours brought in scope by [[openingHoursSpecification]] or [[openingHours]].
      
	 *
	 * @property specialOpeningHoursSpecification
	 * @type OpeningHoursSpecification
	 */
	specialOpeningHoursSpecification;

	/**
	 * Schema.org/geoOverlaps
	 * Represents a relationship between two geometries (or the places they represent), relating a geometry to another that geospatially overlaps it, i.e. they have some but not all points in common. As defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM).
	 *
	 * @property geoOverlaps
	 * @type Place
	 */
	geoOverlaps;

	/**
	 * Schema.org/photo
	 * A photograph of this place.
	 *
	 * @property photo
	 * @type ImageObject
	 */
	photo;

	/**
	 * Schema.org/isicV4
	 * The International Standard of Industrial Classification of All Economic Activities (ISIC), Revision 4 code for a particular organization, business person, or place.
	 *
	 * @property isicV4
	 * @type Text
	 */
	isicV4;

	/**
	 * Schema.org/reviews
	 * Review of the item.
	 *
	 * @property reviews
	 * @type Review
	 */
	reviews;

	/**
	 * Schema.org/review
	 * A review of the item.
	 *
	 * @property review
	 * @type Review
	 */
	review;

	/**
	 * Schema.org/events
	 * Upcoming or past events associated with this place or organization.
	 *
	 * @property events
	 * @type Event
	 */
	events;

	/**
	 * Schema.org/openingHoursSpecification
	 * The opening hours of a certain place.
	 *
	 * @property openingHoursSpecification
	 * @type OpeningHoursSpecification
	 */
	openingHoursSpecification;

	/**
	 * Schema.org/geoWithin
	 * Represents a relationship between two geometries (or the places they represent), relating a geometry to one that contains it, i.e. it is inside (i.e. within) its interior. As defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM).
	 *
	 * @property geoWithin
	 * @type Place
	 */
	geoWithin;

	/**
	 * Schema.org/hasDriveThroughService
	 * Indicates whether some facility (e.g. [[FoodEstablishment]], [[CovidTestingFacility]]) offers a service that can be used by driving through in a car. In the case of [[CovidTestingFacility]] such facilities could potentially help with social distancing from other potentially-infected users.
	 *
	 * @property hasDriveThroughService
	 * @type Boolean
	 */
	hasDriveThroughService;

	/**
	 * Schema.org/containedIn
	 * The basic containment relation between a place and one that contains it.
	 *
	 * @property containedIn
	 * @type Place
	 */
	containedIn;

	/**
	 * Schema.org/geoCovers
	 * Represents a relationship between two geometries (or the places they represent), relating a covering geometry to a covered geometry. "Every point of b is a point of (the interior or boundary of) a". As defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM).
	 *
	 * @property geoCovers
	 * @type Place
	 */
	geoCovers;

	/**
	 * Schema.org/map
	 * A URL to a map of the place.
	 *
	 * @property map
	 * @type URL
	 */
	map;

	/**
	 * Schema.org/amenityFeature
	 * An amenity feature (e.g. a characteristic or service) of the Accommodation. This generic property does not make a statement about whether the feature is included in an offer for the main accommodation or available at extra costs.
	 *
	 * @property amenityFeature
	 * @type LocationFeatureSpecification
	 */
	amenityFeature;

	/**
	 * Schema.org/event
	 * Upcoming or past event associated with this place, organization, or action.
	 *
	 * @property event
	 * @type Event
	 */
	event;

	/**
	 * Schema.org/additionalProperty
	 * A property-value pair representing an additional characteristics of the entitity, e.g. a product feature or another characteristic for which there is no matching property in schema.org.\n\nNote: Publishers should be aware that applications designed to use specific schema.org properties (e.g. schema:width, schema:color, schema:gtin13, ...) will typically expect such data to be provided using those properties, rather than using the generic property/value mechanism.

	 *
	 * @property additionalProperty
	 * @type PropertyValue
	 */
	additionalProperty;

	/**
	 * Schema.org/telephone
	 * The telephone number.
	 *
	 * @property telephone
	 * @type Text
	 */
	telephone;

	/**
	 * Schema.org/logo
	 * An associated logo.
	 *
	 * @property logo
	 * @type ImageObject
	 */
	logo;

	/**
	 * Schema.org/isAccessibleForFree
	 * A flag to signal that the item, event, or place is accessible for free.
	 *
	 * @property isAccessibleForFree
	 * @type Boolean
	 */
	isAccessibleForFree;

	/**
	 * Schema.org/maximumAttendeeCapacity
	 * The total number of individuals that may attend an event or venue.
	 *
	 * @property maximumAttendeeCapacity
	 * @type Integer
	 */
	maximumAttendeeCapacity;

	/**
	 * Schema.org/slogan
	 * A slogan or motto associated with the item.
	 *
	 * @property slogan
	 * @type Text
	 */
	slogan;

	/**
	 * Schema.org/maps
	 * A URL to a map of the place.
	 *
	 * @property maps
	 * @type URL
	 */
	maps;

	/**
	 * Schema.org/hasMap
	 * A URL to a map of the place.
	 *
	 * @property hasMap
	 * @type Map
	 */
	hasMap;

	/**
	 * Schema.org/geoEquals
	 * Represents spatial relations in which two geometries (or the places they represent) are topologically equal, as defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM). "Two geometries are topologically equal if their interiors intersect and no part of the interior or boundary of one geometry intersects the exterior of the other" (a symmetric relationship)
	 *
	 * @property geoEquals
	 * @type GeospatialGeometry
	 */
	geoEquals;

	/**
	 * Schema.org/containsPlace
	 * The basic containment relation between a place and another that it contains.
	 *
	 * @property containsPlace
	 * @type Place
	 */
	containsPlace;

	/**
	 * Schema.org/geoDisjoint
	 * Represents spatial relations in which two geometries (or the places they represent) are topologically disjoint: they have no point in common. They form a set of disconnected geometries." (a symmetric relationship, as defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM))
	 *
	 * @property geoDisjoint
	 * @type Place
	 */
	geoDisjoint;

	/**
	 * Schema.org/latitude
	 * The latitude of a location. For example ```37.42242``` ([WGS 84](https://en.wikipedia.org/wiki/World_Geodetic_System)).
	 *
	 * @property latitude
	 * @type Text
	 */
	latitude;

	/**
	 * Schema.org/smokingAllowed
	 * Indicates whether it is allowed to smoke in the place, e.g. in the restaurant, hotel or hotel room.
	 *
	 * @property smokingAllowed
	 * @type Boolean
	 */
	smokingAllowed;

	/**
	 * Schema.org/faxNumber
	 * The fax number.
	 *
	 * @property faxNumber
	 * @type Text
	 */
	faxNumber;

	/**
	 * Schema.org/branchCode
	 * A short textual code (also called "store code") that uniquely identifies a place of business. The code is typically assigned by the parentOrganization and used in structured URLs.\n\nFor example, in the URL http://www.starbucks.co.uk/store-locator/etc/detail/3047 the code "3047" is a branchCode for a particular branch.
      
	 *
	 * @property branchCode
	 * @type Text
	 */
	branchCode;

	/**
	 * Schema.org/geoTouches
	 * Represents spatial relations in which two geometries (or the places they represent) touch: they have at least one boundary point in common, but no interior points." (a symmetric relationship, as defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM) )
	 *
	 * @property geoTouches
	 * @type Place
	 */
	geoTouches;

	/**
	 * Schema.org/geoCrosses
	 * Represents a relationship between two geometries (or the places they represent), relating a geometry to another that crosses it: "a crosses b: they have some but not all interior points in common, and the dimension of the intersection is less than that of at least one of them". As defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM).
	 *
	 * @property geoCrosses
	 * @type Place
	 */
	geoCrosses;

	/**
	 * Schema.org/geoContains
	 * Represents a relationship between two geometries (or the places they represent), relating a containing geometry to a contained geometry. "a contains b iff no points of b lie in the exterior of a, and at least one point of the interior of b lies in the interior of a". As defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM).
	 *
	 * @property geoContains
	 * @type Place
	 */
	geoContains;

	/**
	 * Schema.org/publicAccess
	 * A flag to signal that the [[Place]] is open to public visitors.  If this property is omitted there is no assumed default boolean value
	 *
	 * @property publicAccess
	 * @type Boolean
	 */
	publicAccess;

}