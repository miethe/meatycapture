---
description: Quick MeatyCapture CLI - list/view/search/capture logs
allowed-tools: [Bash]
---

# MeatyCapture Quick Commands

Default project: meatycapture

## Commands

- List: `meatycapture log list $ARGUMENTS --json`
- View: `meatycapture log view $ARGUMENTS --json`
- Search: `meatycapture log search "$ARGUMENTS" --json`
- Capture: `echo '$ARGUMENTS' | meatycapture log create --json`

Run the appropriate command based on user request.
