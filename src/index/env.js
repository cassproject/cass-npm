if (typeof window !== "undefined" && window) {
    window.global = window;
    window.module = {};
}

global.generateUUID = function () {
    var d = new Date().getTime(); //Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    var random = new Uint8Array(32);//One random byte per hex digit
    global.crypto.getRandomValues(random);//Set below; the browser's own crypto in a page
    var i = 0;
    return 'xxxxxxxx-c455-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = random[i++] % 16;//random number between 0 and 15
        if (d > 0) {//Use timestamp until depleted
            r = Math.trunc((d + r) % 16);
            d = Math.floor(d / 16);
        } else {//Use microseconds since page-load if supported
            r = Math.trunc((d2 + r) % 16);
            d2 = Math.floor(d2 / 16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};

try {
    global.crypto = null;
    global.crypto = require('crypto').webcrypto;
} catch (err) {
    console.log("Webcrypto not available. Tests will fail. Please upgrade, if possible, to Node 16. Non-test mode will fallback to slower cryptograpy methods.: " + err);
}

if (global.forge === undefined)
    global.forge = require("node-forge");
