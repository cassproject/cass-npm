let EcObject = require("./EcObject.js");

/**
 *  Array Helper Functions
 *
 *  @author fritz.ray@eduworks.com
 *  @class EcArray
 *  @module com.eduworks.ec
 */
module.exports = class EcArray {
	/**
	 *  Returns true if the result is an array.
	 *
	 *  @param {any} o Object to test.
	 *  @return true iff the object is an array.
	 *  @static
	 *  @method isArray
	 *  @memberOf EcArray
	 */
	static isArray = function (o) {
		return Object.prototype.toString.call(o) == "[object Array]";
	};
	/**
	 *  Removes values IFF the values == one another.
	 *
	 *  @param a {Array} Array to remove duplicates from.
	 *  @static
	 *  @method removeDuplicates
	 *  @memberOf EcArray
	 */
	static removeDuplicates = function (a) {
		for (let i = 0; i < a.length; i++)
			for (let j = i; j < a.length; j++) {
				if (j == i) continue;
				if (a[i] == a[j]) a.splice(j, 1);
			}
	};
	/**
	 *  Adds a value if the array does not have the value already.
	 *
	 *  @param a {Array} Array to add to.
	 *  @param o {Object} Object to add to the array if it isn't in there already.
	 *  @static
	 *  @method setAdd
	 *  @memberOf EcArray
	 */
	static setAdd = function (a, o) {
		if (!this.has(a, o)) a.push(o);
	};
	/**
	 *  Removes a value from the array.
	 *
	 *  @param a {Array} Array to add to.
	 *  @param o {Object} Object to add to the array if it isn't in there already.
	 *  @static
	 *  @method setAdd
	 *  @memberOf EcArray
	 */
	static setRemove = function (a, o) {
		while (this.has(a, o)) a.splice(this.indexOf(a, o), 1);
	};
	/**
	 *  Returns true if the array has the value already.
	 *
	 *  @param a {Array} Array.
	 *  @param o {Object} Object to sample for.
	 *  @static
	 *  @method has
	 *  @memberOf EcArray
	 */
	static has = function (a, o) {
		if (a.includes(o)) 
			return true;
		if (EcObject.isObject(o))
			for (let b of a) {
				try {
					if (b.equals != null)
						if (b.equals(o)) return true;
				} catch (e) {
					// eat quietly
				}
			}
		return false;
	};
	/**
	 *  Returns the index of an object or value if the object or value exists in the array. Uses .equals if available.
	 *
	 *  @param {Array} a Array to check over.
	 *  @param {any}   o Object to check for.
	 *  @return Index of the result, -1 if the result isn't in the array.
	 *  @static
	 *  @method indexOf
	 *  @memberOf EcArray
	 */
	static indexOf = function (a, o) {
		let index = a.indexOf(o);
		if (index != -1) 
			return index;
		if (EcObject.isObject(o))
			for (let i = 0; i < a.length; i++) {
				try {
					if (a[i].equals != null)
						if (a[i].equals(o)) return i;
				} catch (e) {
					// eat quietly
				}
			}
		return -1;
	};
};
