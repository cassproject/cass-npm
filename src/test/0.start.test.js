
if ((typeof Cypress !== 'undefined') && Cypress != null && Cypress.env != null)
afterEach(() => {
    if (this.currentTest.state === 'failed') {
        Cypress.runner.end();
    }
});