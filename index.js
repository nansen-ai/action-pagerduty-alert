const core = require('@actions/core');
const { context } = require('@actions/github');
const axios = require('axios');

// Trigger the PagerDuty webhook with a given alert
async function sendAlert(alert) {
    const response = await axios.post('https://events.pagerduty.com/v2/enqueue', alert);

    if (response.status === 202) {
        console.log(`Successfully sent PagerDuty alert. Response: ${JSON.stringify(response.data)}`);
    } else {
        core.setFailed(
            `PagerDuty API returned status code ${response.status} - ${JSON.stringify(response.data)}`
        );
    }
}

// Run the action
(async () => {
    try {
        const integrationKey = core.getInput('pagerduty-integration-key');
        const alertSummary = core.getInput('alert-summary') || `${context.repo.repo}: Error in "${context.workflow}" run by @${context.actor}`;
        const alertSeverity = core.getInput('alert-severity') || 'critical';
        const eventAction = core.getInput('alert-event-action') || 'trigger';

        let alert = {
            routing_key: integrationKey,
            event_action: eventAction,
            payload: {
                summary: alertSummary,
                timestamp: new Date().toISOString(),
                source: 'GitHub Actions',
                severity: alertSeverity,
                custom_details: {
                    run_details: `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
                    related_commits: context.payload.commits
                        ? context.payload.commits.map((commit) => `${commit.message}: ${commit.url}`).join(', ')
                        : 'No related commits',
                },
            },
        };

        const dedupKey = core.getInput('alert-dedup-key');
        if (dedupKey != '') {
            alert.dedup_key = dedupKey;
        }

        await sendAlert(alert);
    } catch (error) {
        core.setFailed(error.message);
    }
})();