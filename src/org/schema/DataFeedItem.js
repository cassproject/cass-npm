const schema = {};
schema.Intangible = require("./Intangible.js");
/**
 * Schema.org/DataFeedItem
 * A single item within a larger data feed.
 *
 * @author schema.org
 * @class DataFeedItem
 * @module org.schema
 * @extends Intangible
 */
module.exports = class DataFeedItem extends schema.Intangible {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/","DataFeedItem");
	}

	/**
	 * Schema.org/dateModified
	 * The date on which the CreativeWork was most recently modified or when the item's entry was modified within a DataFeed.
	 *
	 * @property dateModified
	 * @type Date
	 */
	dateModified;

	/**
	 * Schema.org/item
	 * An entity represented by an entry in a list or data feed (e.g. an 'artist' in a list of 'artists')’.
	 *
	 * @property item
	 * @type Thing
	 */
	item;

	/**
	 * Schema.org/dateCreated
	 * The date on which the CreativeWork was created or the item was added to a DataFeed.
	 *
	 * @property dateCreated
	 * @type DateTime
	 */
	dateCreated;

	/**
	 * Schema.org/dateDeleted
	 * The datetime the item was removed from the DataFeed.
	 *
	 * @property dateDeleted
	 * @type Date
	 */
	dateDeleted;

}