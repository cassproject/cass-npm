/**
 *  Pattern (probably similar to Promise) that provides fine grained control over asynchronous execution.
 *  Will iterate over all items in an array and perform 'each(item,callback)'.
 *  Every 'each' needs to call the callback. This callback can be passed down through several asynchronous calls.
 *  When all callbacks have been called, 'after(array)' is called.
 *
 *  @author fritz.ray@eduworks.com
 *  @module com.eduworks.ec
 *  @class EcAsyncHelper
 *  @deprecated
 */
module.exports = class EcAsyncHelper {
	static scriptPath = null;
	static setNull(set) {
		return function(s) {
			set(null);
		};
	}
	/**
	 *  Counter that counts down when each callback is called. Lots of tricks can be done to cause after to proc in different ways.
	 *
	 *  @property counter
	 *  @type integer
	 */
	counter = null;
	/**
	 *  "Each" method. See class description.
	 *
	 *  @param {Array}                   array Array to iterate over.
	 *  @param {function(item,callback)} each Method that gets invoked per item in the array.
	 *  @param {function(array)}         after Method invoked when all callbacks are called.
	 *  @method each
	 *  @memberOf EcAsyncHelper
	 */
	each(array, each, after) {
		this.counter = array.length;
		if (array.length == 0) after(array);
		for (let i = 0; i < array.length; i++) {
			if (this.counter > 0) {
				this.execute(array, each, after, this, i);
			}
		}
	}
	/**
	 *  "Each" method. Allows for replacing values in the array. See class description.
	 *
	 *  @param {Array}                   array Array to iterate over.
	 *  @param {function(item,callback)} each Method that gets invoked per item in the array.
	 *  @param {function(array)}         after Method invoked when all callbacks are called.
	 *  @method each
	 *  @memberOf EcAsyncHelper
	 */
	eachSet(array, each, after) {
		this.counter = array.length;
		if (array.length == 0) after(array);
		for (let i = 0; i < array.length; i++) {
			if (this.counter > 0) {
				this.executeSet(array, each, after, this, i);
			}
		}
	}
	execute(array, each, after, me, i) {
		Task.immediate(function() {
			each(array[i], function() {
				me.counter--;
				if (me.counter == 0) after(array);
			});
		});
	}
	executeSet(array, each, after, me, i) {
		Task.immediate(function() {
			each(array[i], function(result) {
				array[i] = result;
				me.counter--;
				if (me.counter == 0) {
					after([...array].filter(Boolean));
				}
			});
		});
	}
	failWithCallback(failure, callback) {
		return function(s) {
			callback();
			failure(s);
		};
	}
	/**
	 *  Stops any remaining objects from being iterated over, if they have not already. Will prevent 'after' from being called.
	 *
	 *  @method stop
	 *  @memberOf EcAsyncHelper
	 */
	stop() {
		this.counter = -1;
	}
	/**
	 *  Stops any remaining objects from being iterated over, if they have not already. Will allow 'after' to be called.
	 *
	 *  @method stop
	 *  @memberOf EcAsyncHelper
	 */
	finish() {
		this.counter = 1;
	}
	/**
	 *  Is preventing 'after' from being called?
	 *
	 *  @return whether it is stopped.
	 *  @method isStopped
	 *  @memberOf EcAsyncHelper
	 */
	isStopped() {
		return this.counter <= -1;
	}
};
