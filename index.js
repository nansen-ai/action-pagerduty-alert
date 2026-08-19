const core = require('@actions/core');
const { context } = require('@actions/github');

const PAGERDUTY_EVENTS_URL = 'https://events.pagerduty.com/v2/enqueue';
const REQUEST_TIMEOUT_MS = 10_000;
const VALID_EVENT_ACTIONS = new Set(['trigger', 'acknowledge', 'resolve']);
const VALID_SEVERITIES = new Set(['critical', 'error', 'warning', 'info']);

function getErrorMessage(error) {
    return error instanceof Error ? error.message : 'Unknown PagerDuty request failure';
}

function validateInput(value, name, allowedValues) {
    if (!allowedValues.has(value)) {
        throw new Error(`${name} must be one of: ${[...allowedValues].join(', ')}`);
    }
}

/**
 * Send a PagerDuty event through the Events API v2 endpoint.
 */
async function sendAlert(alert) {
    const response = await fetch(PAGERDUTY_EVENTS_URL, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify(alert),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status !== 202) {
        const responseBody = await response.text();
        throw new Error(
            `PagerDuty API returned status code ${response.status}: ${responseBody || 'empty response'}`
        );
    }

    core.info('Successfully sent PagerDuty alert.');
}

/**
 * Build and send the configured PagerDuty event.
 */
async function run() {
    try {
        const integrationKey = core.getInput('pagerduty-integration-key', { required: true });
        const alertSummary = core.getInput('alert-summary') ||
            `${context.repo.repo}: Error in "${context.workflow}" run by @${context.actor}`;
        const alertSeverity = core.getInput('alert-severity') || 'critical';
        const eventAction = core.getInput('alert-event-action') || 'trigger';

        validateInput(alertSeverity, 'alert-severity', VALID_SEVERITIES);
        validateInput(eventAction, 'alert-event-action', VALID_EVENT_ACTIONS);

        const commits = Array.isArray(context.payload.commits)
            ? context.payload.commits
                .map((commit) => `${commit.message}: ${commit.url}`)
                .join(', ')
            : 'No related commits';

        const alert = {
            routing_key: integrationKey,
            event_action: eventAction,
            payload: {
                summary: alertSummary,
                timestamp: new Date().toISOString(),
                source: 'GitHub Actions',
                severity: alertSeverity,
                custom_details: {
                    run_details: `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
                    related_commits: commits,
                },
            },
        };

        const dedupKey = core.getInput('alert-dedup-key');
        if (dedupKey) {
            alert.dedup_key = dedupKey;
        }

        await sendAlert(alert);
    } catch (error) {
        core.setFailed(getErrorMessage(error));
    }
}

if (require.main === module) {
    run();
}

module.exports = { run, sendAlert };
