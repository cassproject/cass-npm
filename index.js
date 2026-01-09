require("./src/index/env.js");

const {
    cassPromisify,
    cassReturnNullAsPromise,
    cassReturnAsPromise
} = require("./src/com/eduworks/ec/promises/helpers.js");

global.cassPromisify = cassPromisify;
global.cassReturnNullAsPromise = cassReturnNullAsPromise;
global.cassReturnAsPromise = cassReturnAsPromise;

require("./src/index/polyfills.js");
require("./src/index/exports.js");