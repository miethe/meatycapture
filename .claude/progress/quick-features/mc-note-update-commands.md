---
type: quick-feature-plan
feature_slug: mc-note-update-commands
request_log_id: null
status: completed
created: 2026-01-05T00:00:00Z
completed_at: 2026-01-05T00:00:00Z
estimated_scope: small
---

# Add note add and item update commands to /mc and meatycapture-capture skill

## Scope
Update the /mc command and meatycapture-capture skill to include the recently added `log note add` and `log item update` CLI commands.

## Affected Files
- `.claude/commands/mc.md`: Add note add and item update operations
- `.claude/skills/meatycapture-capture/SKILL.md`: Update Quick Commands table
- `.claude/skills/meatycapture-capture/workflows/updating.md`: Replace direct editing with CLI commands
- `.claude/skills/meatycapture-capture/workflows/capturing.md`: Add note add to CLI Commands Reference
- `.claude/skills/meatycapture-capture/integration-spec.md`: Update Integration Points and CLAUDE.md sections
- `CLAUDE.md`: Update Development Tracking to use new CLI commands

## Implementation Steps
1. Update mc.md with note add and item update commands → direct edit
2. Update SKILL.md Quick Commands table → direct edit
3. Rewrite updating.md workflow with CLI commands → direct edit
4. Update capturing.md CLI Commands Reference → direct edit
5. Update integration-spec.md patterns → direct edit
6. Update root CLAUDE.md Development Tracking → direct edit

## Testing
- Validate syntax of all updated files
- Ensure command examples are accurate

## Completion Criteria
- [x] mc.md has note add and item update operations
- [x] SKILL.md shows new commands
- [x] updating.md uses CLI commands instead of direct editing
- [x] capturing.md references note add
- [x] integration-spec.md has updated patterns
- [x] Root CLAUDE.md updated
