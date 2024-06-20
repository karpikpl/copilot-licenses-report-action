# Copilot licenses report action

[![GitHub Super-Linter](https://github.com/karpikpl/copilot-license-report-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/karpikpl/copilot-license-report-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/karpikpl/copilot-license-report-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/karpikpl/copilot-license-report-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/karpikpl/copilot-license-report-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/karpikpl/copilot-license-report-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

Produce a CSV file with copilot user usage report with following columns:

| login    | created_at           | last_activity_at     | last_activity_editor          | pending_cancellation_date |
| -------- | -------------------- | -------------------- | ----------------------------- | ------------------------- |
| karpikpl | 2024-06-06T18:20:17Z | 2024-06-20T04:50:34Z | vscode/1.90.1/copilot/1.204.0 |                           |

This is based on another action that helps
[managing copilot licenses](https://github.com/KyMidd/CleanupCopilotLicenses).

## Usage

Reading copilot seats information requires **manage_billing:copilot** permission
that cannot be granted to a workflow. Please either use a PAT or Application
token:

- Make sure provided PAT has the appropriate scope for the organization the
  action is used for.

or

- Create and install an GitHub App with appropriate scope.

### Using PAT

```yaml
steps:
  - name: Copilot Licenses Report
    id: copilot_licenses_report
    uses: karpikpl/copilot-licenses-report-action@v1
    with:
      github-org: your-org-name
      github-pat: ${{ secrets.PAT_NAME_HERE }}
      max-inactive-days: '30'
```

### Using App token

```yml
- uses: actions/create-github-app-token@v1
  id: app-token
  with:
    app-id: ${{ vars.APP_ID }}
    private-key: ${{ secrets.PRIVATE_KEY }}

- name: Copilot License Cleanup
  id: cleanup_copilot_licenses
  uses: karpikpl/copilot-licenses-report-action@v1
  with:
    github-org: your-org-name
    github-pat: ${{ steps.app-token.outputs.token }}
    max-inactive-days: '30'
```

### Detailed example

Example with report upload and action summary.

```yml
name: Cleanup CoPilot Licenses

on:
  # Run automatically when main updated
  push:
    branches:
      - main
  # Run nightly at 5a UTC / 11p CT
  schedule:
    - cron: '0 5 * * *'
  # Permit manual trigger
  workflow_dispatch:

jobs:
  cleanup_copilot_licenses:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/create-github-app-token@v1
        id: app-token
        with:
          app-id: ${{ vars.APP_ID }}
          private-key: ${{ secrets.PRIVATE_KEY }}

      - name: Copilot License Cleanup
        id: cleanup_copilot_licenses
        uses: karpikpl/copilot-licenses-report-action@v1
        with:
          github-org: your-org-name
          github-pat: ${{ steps.app-token.outputs.token }}
          max-inactive-days: '30'

      # upload artifacts
      - name: Upload cleanup report
        uses: actions/upload-artifact@v4
        with:
          name: usage-report
          path: ${{ steps.cleanup_copilot_licenses.outputs.file }}

      # create a github summary using github script
      - name: Add Summary
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            // read summary file
            const data = fs.readFileSync('${{ steps.cleanup_copilot_licenses.outputs.file }}', 'utf8');
            const csv = data.split('\n').map(row => row.split(','))
            // header
            for (let i = 0; i < csv[0].length; i++) {
                csv[0][i] = { data: csv[0][i], header: true };
            }

            await core.summary
            .addHeading('Copilot usage data')
            .addTable(csv)
            .write()
```

## Inputs

### `github-pat`

**Required** Azure DevOps personal access token or application token with
permissions to manage_billing:copilot.

### `github-org`

**Required** Name of the Azure DevOps organization.

### `max-inactive-days`

**Optional** The maximum number of days since the last activity used in the
report.

## Outputs

### `file`

Name of the CSV file
