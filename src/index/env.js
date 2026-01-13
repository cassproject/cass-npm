if (typeof window !== "undefined" && window) {
    window.global = window;
    window.module = {};
}

global.generateUUID = function () {
    let d = new Date().getTime();
    if (typeof window !== "undefined" && window && window.performance && typeof window.performance.now === "function") {
        d += performance.now(); // use high-precision timer if available
    }
    let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : r & 0x3 | 0x8).toString(16);
    });
    return uuid;
};

try {
    global.crypto = null;
    global.crypto = require('crypto').webcrypto;
} catch (err) {
    console.log("Webcrypto not available. Tests will fail. Please upgrade, if possible, to Node 16. Non-test mode will fallback to slower cryptograpy methods.: " + err);
}

if (global.forge === undefined)
    global.forge = require("node-forge");
