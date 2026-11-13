
if ((typeof Cypress !== 'undefined') && Cypress != null)
afterEach(() => {
    if (this.currentTest.state === 'failed') {
        Cypress.runner.end();
    }
});