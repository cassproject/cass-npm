
module.exports = {
    cassPromisify: function (p, success, failure) {
        if (success !== undefined && success != null && failure !== undefined && failure != null)
            p = p.then(success, failure);
        else if (success !== undefined && success != null)
            p = p.then(success);
        else if (failure !== undefined && failure != null)
            p = p.catch(failure);
        return p;
    },
    cassReturnNullAsPromise: function (success, failure, error) {
        let p = Promise.resolve(null);
        if (success !== undefined && success != null && failure !== undefined && failure != null)
            p = p.then(success, failure);
        else if (success !== undefined && success != null)
            p = p.then(success);
        else if (failure !== undefined && failure != null)
            p = p.catch(failure);
        return p;
    },
    cassReturnAsPromise: function (o, success, failure, error) {
        let p = new Promise((resolve, reject) => {
            if (o === undefined || o == null) {
                reject(new Error(error));
            } else
                resolve(o);
        });
        if (success !== undefined && success != null && failure !== undefined && failure != null)
            p = p.then(success, failure);
        else if (success !== undefined && success != null)
            p = p.then(success);
        else if (failure !== undefined && failure != null)
            p = p.catch(failure);
        return p;
    }
};