const schema = {};
schema.Intangible = require("./Intangible.js");
/**
 * Schema.org/ListItem
 * An list item, e.g. a step in a checklist or how-to description.
 *
 * @author schema.org
 * @class ListItem
 * @module org.schema
 * @extends Intangible
 */
module.exports = class ListItem extends schema.Intangible {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/","ListItem");
	}

	/**
	 * Schema.org/item
	 * An entity represented by an entry in a list or data feed (e.g. an 'artist' in a list of 'artists')’.
	 *
	 * @property item
	 * @type Thing
	 */
	item;

	/**
	 * Schema.org/nextItem
	 * A link to the ListItem that follows the current one.
	 *
	 * @property nextItem
	 * @type ListItem
	 */
	nextItem;

	/**
	 * Schema.org/previousItem
	 * A link to the ListItem that preceeds the current one.
	 *
	 * @property previousItem
	 * @type ListItem
	 */
	previousItem;

	/**
	 * Schema.org/position
	 * The position of an item in a series or sequence of items.
	 *
	 * @property position
	 * @type Integer
	 */
	position;

}