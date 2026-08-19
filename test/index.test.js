const assert = require('node:assert/strict');
const test = require('node:test');

const core = require('@actions/core');
const { sendAlert } = require('../index');

const originalFetch = global.fetch;
const originalInfo = core.info;

function restoreGlobals() {
    global.fetch = originalFetch;
    core.info = originalInfo;
}

test.afterEach(restoreGlobals);

test('sendAlert uses native fetch and accepts PagerDuty HTTP 202', async () => {
    let request;
    global.fetch = async (url, options) => {
        request = { url, options };
        return { status: 202, text: async () => '' };
    };
    core.info = () => {};

    await sendAlert({ event_action: 'trigger' });

    assert.equal(request.url, 'https://events.pagerduty.com/v2/enqueue');
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.headers['content-type'], 'application/json');
});

test('sendAlert rejects non-202 PagerDuty responses without logging response details', async () => {
    global.fetch = async () => ({
        status: 400,
        text: async () => 'invalid routing key',
    });

    await assert.rejects(
        () => sendAlert({ event_action: 'trigger' }),
        /PagerDuty API returned status code 400: invalid routing key/
    );
});
