---
schema_version: 1
status: handoff-ready
updated: 2026-07-06
source_plan: /Users/miethe/dev/homelab/development/agentic_meta_dev/.claude/plans/aos-universal-correlation-ids-v1.md
contract: /Users/miethe/dev/homelab/development/agentic_meta_dev/docs/agentic-operator/contracts/aos-correlation.md
---

# AOS Correlation IDs v1 - MeatyCapture Handoff

## Goal

Preserve AOS correlation metadata when captures become request-log documents or are forwarded into
other AOS stores.

## Required Work

- Add optional request-log/frontmatter fields for `aos_feature_uuid`, `aos_work_uuid`,
  `aos_run_uuid`, `aos_turn_uuid`, and `aos_artifact_uuid`.
- Preserve those fields through CLI and API create/update flows.
- If forwarding to MeatyWiki or IntentTree is enabled, pass AOS IDs as metadata, not body text.
- Keep captures without AOS IDs valid.

## Acceptance

- Existing request logs remain readable.
- AOS-authored captures retain IDs through edit/update and any forwarding path.
- Invalid URNs are reported as validation errors at the mutation boundary.

## Validation

Add focused request-log metadata tests for CLI/API paths and keep live forwarding out of default
tests.
