# CLI Commands & Tests Enhancement Plan

## Overview

Add missing CLI commands for note and item operations, plus comprehensive test coverage including the view command path resolution fix.

## New Commands

### 1. `log note add <doc-path> <item-id>`

Add a note to an existing item.

```bash
meatycapture log note add REQ-20260105-project.md REQ-20260105-project-01 --content "Investigation notes..."
meatycapture log note add doc.md ITEM-01 -c "Quick note" --json
```

**Options:**
- `-c, --content <text>` - Note content (required)
- `--json` - Output as JSON
- `--quiet` - Suppress output

**Implementation:**
1. Parse doc path (with project-aware resolution)
2. Read document via docStore
3. Find item by ID
4. Create Note object with generated ID, timestamps
5. Append to item.notes array
6. Write document back
7. Output success/note details

### 2. `log item update <doc-path> <item-id>`

Update fields on an existing item.

```bash
meatycapture log item update doc.md REQ-20260105-project-01 --status done
meatycapture log item update doc.md ITEM-01 --priority critical --tags api,urgent
meatycapture log item update doc.md ITEM-01 --title "Updated title" --json
```

**Options:**
- `--status <status>` - Update status
- `--priority <priority>` - Update priority
- `--type <type>` - Update type
- `--title <title>` - Update title
- `--tags <tags>` - Update tags (comma-separated, replaces existing)
- `--add-tags <tags>` - Add tags (comma-separated, appends)
- `--remove-tags <tags>` - Remove tags (comma-separated)
- `--domain <domains>` - Update domains (comma-separated)
- `--context <contexts>` - Update contexts (comma-separated)
- `--json` - Output as JSON
- `--quiet` - Suppress output

**Implementation:**
1. Parse doc path (with project-aware resolution)
2. Read document via docStore
3. Find item by ID
4. Apply field updates
5. Update item.modified_at timestamp
6. Recalculate doc.tags if tags changed
7. Write document back
8. Output success/updated item

## Test Coverage

### View Command Path Resolution Tests

Add to `tests/cli/commands/log.test.ts`:

```typescript
describe('path resolution', () => {
  it('should resolve REQ filename using project config path', async () => {
    // Setup: Create project with custom path
    // Create doc in that path
    // Call viewAction with just filename (not full path)
    // Verify it finds the doc in the project's configured path
  });

  it('should extract project slug from REQ-YYYYMMDD-<slug>.md pattern', async () => {
    // Test regex extraction
  });

  it('should handle REQ-YYYYMMDD-<slug>-NN.md item files', async () => {
    // Test with item suffix
  });

  it('should fall back to CWD for non-REQ filenames', async () => {
    // Test fallback behavior
  });

  it('should use absolute paths directly', async () => {
    // Verify absolute paths bypass resolution
  });
});
```

### Note Add Command Tests

```typescript
describe('note add command', () => {
  describe('valid input', () => {
    it('should add note to existing item');
    it('should generate note ID and timestamps');
    it('should preserve existing notes');
    it('should update item modified_at');
  });

  describe('error handling', () => {
    it('should fail for non-existent document');
    it('should fail for non-existent item ID');
    it('should fail without content');
  });

  describe('output formats', () => {
    it('should output JSON with --json');
    it('should suppress output with --quiet');
  });
});
```

### Item Update Command Tests

```typescript
describe('item update command', () => {
  describe('field updates', () => {
    it('should update status');
    it('should update priority');
    it('should update title');
    it('should update multiple fields');
    it('should update modified_at timestamp');
  });

  describe('tag operations', () => {
    it('should replace tags with --tags');
    it('should append tags with --add-tags');
    it('should remove tags with --remove-tags');
    it('should recalculate doc tags after update');
  });

  describe('error handling', () => {
    it('should fail for non-existent document');
    it('should fail for non-existent item ID');
    it('should fail with no update options');
  });
});
```

### Integration Tests

Add to `tests/cli/integration.test.ts`:

```typescript
describe('Full Item Lifecycle with Notes and Updates', () => {
  it('should complete: create -> add note -> update status -> view -> search', async () => {
    // 1. Create doc with item
    // 2. Add note to item
    // 3. Update item status to in-progress
    // 4. View and verify changes
    // 5. Update status to done
    // 6. Search by status:done
    // 7. Delete doc
  });
});
```

## File Structure

```
src/cli/commands/log/
├── index.ts           # Add note, update exports
├── note-add.ts        # NEW: Note add command
├── item-update.ts     # NEW: Item update command
└── ...existing...

tests/cli/commands/
├── log.test.ts        # Add path resolution + new command tests
└── ...existing...

tests/cli/
└── integration.test.ts  # Add full lifecycle tests
```

## Implementation Order

1. `note-add.ts` - Simpler, single field operation
2. `item-update.ts` - More complex with multiple field options
3. View path resolution tests
4. Note add tests
5. Item update tests
6. Integration tests
7. Update index.ts and CLI help
