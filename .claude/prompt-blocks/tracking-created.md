# Implementation Execution

## Implementation Guidance

- You must use subagents to perform all tasks; your role is to delegate tasks, perform oversight, and ensure quality.
- You are Opus, so tokens are expensive; use them wisely to optimize for complex reasoning and designs, with all token-heavy work being delegated to cheaper agents.
- Commit often, following git guidance.

## Documentation Guidance

Remember your documentation guidance, with the ONLY tracking docs/artifacts already created for the entire PRD. NO other docs/artifacts should be created unless explicitly outlined in the plan; NO reports, NO summaries, etc.
You MAY keep very brief observation notes within a running log in `.claude/worknotes/observations/` regarding any key points that might arise during implementation, generally unrelated to the PRD tasks themselves.

Specifically, the agent has created `.claude/progress/{PRD-NAME}/all-phases-progress.md` file and populated it with all tasks along with notes per task regarding which subagent(s) the task should be delegated to. There should also be a context file in `.claude/worknotes/{PRD-NAME}/phase-{PHASE}-context.md` (if not then create with artifact-tracking), which should be updated with any relevant KEY context for the implementation. Each subagent may update this file at the end of their turn with any relevant context they generated or discovered during their work on their assigned tasks - but be very brief!

Remember, these files will be your worknotes for the entire PRD implementation, serving as a file-based context cache for all subagents working on the PRD, since they won't share context windows directly, as well as across turns/phases. You should NOT load the entire context file at once, just keeping it updated with current status at the end of each turn, reviewing the latest section for current status, or if a question arises about prior context. The artifact-tracking can help you understand how to use/update the context or progress files for specific sections or information as needed.

