// Reads a value passed to Cypress on the command line, or undefined outside Cypress.
// Cypress 16 removed Cypress.env() in favour of Cypress.expose() (set with -x/--expose);
// older versions only have Cypress.env() (set with -e/--env).
module.exports = function cypressValue(key) {
    if (typeof Cypress === 'undefined' || Cypress == null) return undefined;
    if (typeof Cypress.expose === 'function') return Cypress.expose(key);
    if (typeof Cypress.env === 'function') return Cypress.env(key);
    return undefined;
};
