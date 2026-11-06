function isPromise(obj) {
  // via https://unpkg.com/is-promise@2.1.0/index.js
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function'
}

function tryCatchFunc(callback, message) {
  try {
    return { res: callback(message) }
  } catch (e) {
    return { err: e }
  }
}

function registerPromiseWorker(callback) {
  function postOutgoingMessage(e, messageId, error, result) {
    function postMessage(msg) {
      /* istanbul ignore if */
      if (typeof self.postMessage !== 'function') { // service worker
        e.ports[0].postMessage(msg)
      } else { // web worker
        self.postMessage(msg)
      }
    }
    if (error) {
      /* istanbul ignore else */
      if (typeof console !== 'undefined' && 'error' in console) {
        // This is to make errors easier to debug. I think it's important
        // enough to just leave here without giving the user an option
        // to silence it.
        console.error('Worker caught an error:', error)
      }
      postMessage([messageId, {
        message: error.message
      }])
    } else {
      postMessage([messageId, null, result])
    }
  }

  function handleIncomingMessage(e, callback, messageId, message) {
    let result = tryCatchFunc(callback, message)

    if (result.err) {
      postOutgoingMessage(e, messageId, result.err)
    } else if (!isPromise(result.res)) {
      postOutgoingMessage(e, messageId, null, result.res)
    } else {
      result.res.then(function (finalResult) {
        postOutgoingMessage(e, messageId, null, finalResult)
      }, function (finalError) {
        postOutgoingMessage(e, messageId, finalError)
      })
    }
  }

  function onIncomingMessage(e) {
    if (e.origin != 'cassproject' && e.data?.origin != 'cassproject' && e.data?.[1]?.origin != 'cassproject') { console.log("Origin does not match.", e.origin);return;}

    let payload = e.data
    if (!Array.isArray(payload) || payload.length !== 2) {
      // message doens't match communication format; ignore
      return
    }
    let messageId = payload[0]
    let message = payload[1]

    if (typeof callback !== 'function') {
      postOutgoingMessage(e, messageId, new Error(
        'Please pass a function into register().'))
    } else {
      handleIncomingMessage(e, callback, messageId, message)
    }
  }

  self.addEventListener('message', onIncomingMessage)
}

require('../../../../../');

registerPromiseWorker(function (e) {
  let data = e;
  try {
    switch (data.cmd) {
      case 'encryptRsaOaep':
        return EcRsaOaepAsync.encrypt(EcPk.fromPem(data.pk), data.text);
      case 'decryptRsaOaep':
        return EcRsaOaepAsync.decrypt(EcPpk.fromPem(data.ppk), data.text).then(x=>forge.util.encodeUtf8(x));
      case 'signRsaOaep':
        return EcRsaOaepAsync.sign(EcPpk.fromPem(data.ppk), data.text);
      case 'signSha256RsaOaep':
        return EcRsaOaepAsync.signSha256(EcPpk.fromPem(data.ppk), data.text);
      case 'verifyRsaOaep':
        return EcRsaOaepAsync.verify(EcPk.fromPem(data.pk), data.text, data.signature);
      case 'verifyRsaOaepSha256':
        return EcRsaOaepAsync.verifySha256(EcPk.fromPem(data.pk), data.text, data.signature);
      case 'encryptAesCtr':
        return EcAesCtrAsync.encrypt(data.text, data.secret, data.iv);
      case 'decryptAesCtr':
        return EcAesCtrAsync.decrypt(data.text, data.secret, data.iv);
      case 'stop':
        self.close(); // Terminates the worker.
        break;
      default:
        return 'Unknown command: ' + data.msg;
    }
  } catch (ex) {
    return {
      error: ex.message
    };
  }
});