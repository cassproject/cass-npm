const schema = {};
schema.StructuredValue = require("./StructuredValue.js");
/**
 * Schema.org/OpeningHoursSpecification
 * A structured value providing information about the opening hours of a place or a certain service inside a place.\n\n
The place is __open__ if the [[opens]] property is specified, and __closed__ otherwise.\n\nIf the value for the [[closes]] property is less than the value for the [[opens]] property then the hour range is assumed to span over the next day.
      
 *
 * @author schema.org
 * @class OpeningHoursSpecification
 * @module org.schema
 * @extends StructuredValue
 */
module.exports = class OpeningHoursSpecification extends schema.StructuredValue {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/","OpeningHoursSpecification");
	}

	/**
	 * Schema.org/validFrom
	 * The date when the item becomes valid.
	 *
	 * @property validFrom
	 * @type Date
	 */
	validFrom;

	/**
	 * Schema.org/opens
	 * The opening hour of the place or service on the given day(s) of the week.
	 *
	 * @property opens
	 * @type Time
	 */
	opens;

	/**
	 * Schema.org/dayOfWeek
	 * The day of the week for which these opening hours are valid.
	 *
	 * @property dayOfWeek
	 * @type DayOfWeek
	 */
	dayOfWeek;

	/**
	 * Schema.org/closes
	 * The closing hour of the place or service on the given day(s) of the week.
	 *
	 * @property closes
	 * @type Time
	 */
	closes;

	/**
	 * Schema.org/validThrough
	 * The date after when the item is not valid. For example the end of an offer, salary period, or a period of opening hours.
	 *
	 * @property validThrough
	 * @type Date
	 */
	validThrough;

}