# PagerDuty Alert GitHub Action
Sends a critical PagerDuty alert, e.g. on action failure.

## Prerequisites

1. Create a service integration in PagerDuty:
    1. Go to PagerDuty > "Services" > Pick your service > "Integrations" > "Add a new integration"
    2. Choose a name (e.g. "Your GitHub CI/CD") and "Use our API directly" with "Events API v2"
    3. Copy the integration key
2. Set up a secret in your GitHub repo to store the integration key, e.g. "PAGERDUTY_INTEGRATION_KEY"

## Inputs

| PARAMETERS                  | REQUIRED | DESCRIPTION                                                                                   | DEFAULT    |
| --------------------------- | -------- | --------------------------------------------------------------------------------------------- | ---------- |
| `pagerduty-integration-key` | Yes      | The integration key for your PagerDuty service                                                |            |
| `alert-dedup-key`           | No       | A `dedup_key` for your alert. This will enable PagerDuty to coalesce multiple alerts into one |            |
| `alert-summary`             | No       | A custom summary for your PagerDuty alert                                                     |            |
| `alert-severity`            | No       | The severity level used when creating a PagerDuty alert                                       | `critical` |
| `alert-event-action`        | No       | The type of alert event. Can be `trigger`, `acknowledge` or `resolve`                         | `trigger`  |

More documentation is available [here](https://developer.pagerduty.com/docs/events-api-v2/trigger-events/).

## Example usage

In your `steps`:

```yaml
- name: Send PagerDuty alert on failure
  if: ${{ failure() }}
  uses: nansen-ai/action-pagerduty-alert@v0.5
  with:
    pagerduty-integration-key: '${{ secrets.PAGERDUTY_INTEGRATION_KEY }}'
    alert-dedup-key: github_workflow_failed
```

Advanced usage:
```yaml
- name: Send PagerDuty event
  if: always() && (job.status == 'failure' || job.status == 'success')
  uses: nansen-ai/action-pagerduty-alert@v0.5
  with:
      pagerduty-integration-key: '${{ secrets.PAGERDUTY_INTEGRATION_KEY }}'
      alert-dedup-key: github_workflow_failed
      alert-severity: 'warning'
      alert-event-action: ${{ job.status == 'failure' && 'trigger' || 'resolve' }}
      alert-summary: "My custom alert"
```

Usign this advanced example above incidents are also resolved when action finishes successfully.