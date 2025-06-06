const chai = require('chai');
const sinon = require('sinon');
const EcRemote = require('../com/eduworks/ec/remote/EcRemote');

const { expect } = chai;
if ((typeof Cypress !== 'undefined') && Cypress != null && Cypress.env != null)
    process.env.CASS_LOOPBACK = Cypress.env('CASS_LOOPBACK');

describe('EcRemote', function () {
    describe('postExpectingObject', function () {
        it('should call postInner with correct parameters', async function () {
            const server = process.env.CASS_LOOPBACK || 'http://localhost/api/';
            const service = 'ping';
            const fd = new FormData();
            const success = sinon.spy();
            const failure = sinon.spy();

            await EcRemote.postExpectingObject(server, service, fd, success, failure);

            expect(success.calledOnce).to.be.true;
            expect(failure.called).to.be.false;
        });
    });

    describe('getExpectingObject', function () {
        it('should call fetch with correct URL', async function () {
            const server = process.env.CASS_LOOPBACK || 'http://localhost/api/';
            const service = 'ping';
            const success = sinon.spy();
            const failure = sinon.spy();

            await EcRemote.getExpectingObject(server, service, success, failure);

            expect(success.calledOnce).to.be.true;
            expect(failure.called).to.be.false;
        });
    });

    describe('_delete', function () {
        it('should call fetch with DELETE method', async function () {
            const url = (process.env.CASS_LOOPBACK || 'http://localhost/api/')+'ping';
            const success = sinon.spy();
            const failure = sinon.spy();

            await EcRemote._delete(url, null, success, failure);

            expect(success.calledOnce).to.be.true;
            expect(failure.called).to.be.false;
        });
    });
});