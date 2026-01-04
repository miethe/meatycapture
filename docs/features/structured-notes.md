---
title: Structured Notes Feature Guide
description: Complete guide to using and working with the Structured Notes system in MeatyCapture
audience: users, developers
tags: [notes, features, user-guide, api, structured-data]
created: 2026-01-04
updated: 2026-01-04
category: Features
status: Active
related: [design-spec, api-reference]
---

# Structured Notes Feature Guide

## Table of Contents

1. [Overview](#overview)
2. [Note Types](#note-types)
3. [Using Notes in Capture Wizard](#using-notes-in-capture-wizard)
4. [Using Notes in Viewer](#using-notes-in-viewer)
5. [Markdown Editor Features](#markdown-editor-features)
6. [API Reference](#api-reference)
7. [Markdown Format Reference](#markdown-format-reference)
8. [Backward Compatibility](#backward-compatibility)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Structured Notes system replaces the static Notes field with a flexible, organized system for capturing observations and context. Notes are categorized by type (General, Bug Fix Attempt, Validation, Other) and support full markdown formatting with timestamps and edit history.

### Key Features

- **Type-Based Organization**: Notes are categorized into four types for easy filtering and understanding
- **Markdown Support**: Full markdown formatting with toolbar assistance
- **Full CRUD Operations**: Add, edit, and delete notes without leaving the app
- **Timestamps**: Track when notes were created and last modified
- **Backward Compatible**: Existing items without notes load seamlessly
- **Persistent Storage**: Notes are saved directly to your markdown files

### Why Structured Notes?

Before Structured Notes, the Notes field was a single text block. This made it difficult to:
- Understand what type of information you were adding
- Filter or search by observation category
- Track when notes were added or modified
- Maintain separate tracks of attempts, validations, and general observations

Structured Notes solve these problems by organizing observations by type while maintaining all the richness of markdown formatting.

---

## Note Types

MeatyCapture provides four predefined note types to help you categorize your observations:

### General

Use for general observations, context, requirements, or information that doesn't fit other categories.

**Examples:**
- "Users reported slower performance on mobile devices"
- "Documentation mentions this behavior in section 3.2"
- "Consider this pattern for similar features"

### Bug Fix Attempt

Use when documenting attempts to fix a bug, debugging steps, or investigation findings.

**Examples:**
- "Tried updating timeout from 5s to 10s - no change"
- "Error occurs only when service returns 503 status"
- "Logging added to trace execution flow"

### Validation

Use when testing solutions, verifying fixes, or confirming expected behavior.

**Examples:**
- "Confirmed fix works with Edge case: empty array input"
- "Tested on Chrome 120, Firefox 121, Safari 17"
- "Verified backward compatibility with v1.0 data format"

### Other

Use for notes that don't fit into the above categories.

---

## Using Notes in Capture Wizard

### Adding Notes During Capture

1. **Navigate to Item Step**: In the capture wizard, fill in your item details (title, type, domain, etc.)

2. **Add Note**: Click the **"+ Add Note"** button below the form fields

3. **Select Type**: Choose the note type from the dropdown (General, Bug Fix Attempt, Validation, Other)

4. **Write Content**: Enter your note content in the markdown editor. Use the toolbar for formatting:
   - **Bold**: Select text, click **B** or press `Cmd/Ctrl+B`
   - **Italic**: Select text, click **I** or press `Cmd/Ctrl+I`
   - **Lists**: Click **•** for bullets or **1.** for numbered lists
   - **Links**: Click **🔗** or press `Cmd/Ctrl+K`
   - **Code**: Click **</>** for inline code
   - **Code Block**: Click **```** for multi-line code blocks

5. **Character Limit**: Keep your note under 10,000 characters. The character count updates as you type.

6. **Save Note**: Click **Save** to add the note. It appears in the notes list showing type, snippet, and timestamps.

### Managing Notes During Capture

- **Edit Note**: Click the pencil icon on any note card to modify its content or type
- **Delete Note**: Click the trash icon to remove a note (no confirmation required during capture)
- **Add Multiple**: Keep the **"+ Add Note"** button visible to add as many notes as needed
- **Review Step**: All notes appear grouped by type in the ReviewStep before you submit

### Notes Persist During Navigation

When you navigate backward/forward in the wizard, your notes are preserved. You can add notes in ItemStep, move to ReviewStep, navigate back to ItemStep, and your notes remain.

---

## Using Notes in Viewer

### Viewing Notes

When viewing an item in the document viewer:

1. **Notes Section**: Scroll down in the item detail view to find the **Notes** section
2. **Grouped Display**: Notes are automatically grouped by type (General, Bug Fix Attempt, Validation, Other)
3. **Metadata**: Each note displays:
   - Type badge (colored indicator)
   - Full markdown content with formatting
   - Created timestamp
   - Updated timestamp (if different from created)

### Adding Notes in Viewer

1. Click **"+ Add Note"** in the Notes section
2. Select type and enter content (same as capture wizard)
3. Click **Save** to persist immediately to the markdown file
4. A success notification confirms the update

### Editing Notes in Viewer

1. Click the **pencil icon** on any note card
2. Modify the type or content in the modal
3. Click **Save** to update the file immediately

### Deleting Notes in Viewer

1. Click the **trash icon** on any note card
2. Confirm deletion in the dialog
3. The note is removed and file is updated

### Filtering Notes

1. Use the **Note Type Filter** dropdown above the notes list
2. Select which types to show (default: all types shown)
3. Notes are instantly filtered without reloading the file
4. Filter preference persists during your current session

---

## Markdown Editor Features

The MarkdownEditor component appears whenever you create or edit a note. It provides both toolbar buttons and keyboard shortcuts for common formatting tasks.

### Toolbar Buttons

| Button | Name | Shortcut | Effect |
|--------|------|----------|--------|
| **B** | Bold | `Cmd/Ctrl+B` | Wraps text in `**bold**` |
| **I** | Italic | `Cmd/Ctrl+I` | Wraps text in `*italic*` |
| **•** | Unordered List | | Prefixes lines with `- ` |
| **1.** | Ordered List | | Prefixes lines with `1. `, `2. `, etc. |
| **🔗** | Link | `Cmd/Ctrl+K` | Creates `[text](url)` template |
| **</>** | Inline Code | | Wraps text in `` `backticks` `` |
| **```** | Code Block | | Wraps selection in ` ``` code ``` ` |

### Keyboard Shortcuts

| Keys | Action |
|------|--------|
| `Cmd/Ctrl+B` | Make selected text bold |
| `Cmd/Ctrl+I` | Make selected text italic |
| `Cmd/Ctrl+K` | Create link template |

### Character Limit

Notes are limited to **10,000 characters**. The character counter displays your current usage (e.g., "245 / 10,000"). The Save button is disabled if you exceed the limit.

### Using Markdown

All standard markdown syntax is supported:

```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text** and *italic text* and ***bold italic***

- Bullet list item 1
- Bullet list item 2

1. Numbered item 1
2. Numbered item 2

[Link text](https://example.com)

`inline code` and code blocks:

```
code block line 1
code block line 2
```
```

---

## API Reference

### Note Interface

The Note type represents a structured observation attached to a RequestLogItem.

```typescript
interface Note {
  /** Unique note ID (e.g., 'NOTE-20260101-meatycapture-01-01') */
  id: string;

  /** Type of note - categorizes the observation */
  type: NoteType;

  /** Note content in markdown format (max 10,000 characters) */
  content: string;

  /** When the note was created (ISO 8601 timestamp) */
  created_at: Date;

  /** When the note was last updated (same as created_at if never edited) */
  updated_at: Date;
}
```

### NoteType Enum

```typescript
type NoteType = 'General' | 'Bug Fix Attempt' | 'Validation' | 'Other';

// Access constants via:
import { NOTE_TYPES } from '@core/models';

NOTE_TYPES.General        // 'General'
NOTE_TYPES.BugFixAttempt  // 'Bug Fix Attempt'
NOTE_TYPES.Validation     // 'Validation'
NOTE_TYPES.Other          // 'Other'
```

### Note ID Format

Note IDs follow the pattern: `NOTE-YYYYMMDD-{project-slug}-{item-number}-{counter}`

**Example:** `NOTE-20260101-meatycapture-01-02`

Breaking down:
- `NOTE`: Fixed prefix
- `20260101`: Date in YYYYMMDD format
- `meatycapture`: Project slug
- `01`: Item number (two-digit)
- `02`: Note counter (zero-padded)

### Validation Functions

#### isNote(obj: unknown): boolean

Type guard to check if an object is a valid Note.

```typescript
import { isNote } from '@core/models';

const data: unknown = JSON.parse(someJson);
if (isNote(data)) {
  // data is guaranteed to be a valid Note
  console.log(data.type, data.content);
}
```

#### validateNote(note: Note): string[]

Validates a Note object and returns an array of error messages (empty if valid).

```typescript
import { validateNote } from '@core/models';

const errors = validateNote(myNote);
if (errors.length > 0) {
  errors.forEach(error => console.error(`Validation error: ${error}`));
}
```

#### isNoteType(value: unknown): boolean

Type guard to check if a value is a valid NoteType.

```typescript
import { isNoteType } from '@core/models';

if (isNoteType(userInput)) {
  // value is one of: 'General', 'Bug Fix Attempt', 'Validation', 'Other'
}
```

### Constants

```typescript
import {
  NOTE_TYPES,
  NOTE_TYPE_LABELS,
  NOTE_TYPE_OPTIONS,
  NOTE_MAX_CONTENT_LENGTH
} from '@core/models';

// Maximum characters allowed in note content
NOTE_MAX_CONTENT_LENGTH // 10000

// Display labels for each type
NOTE_TYPE_LABELS['General']       // 'General'
NOTE_TYPE_LABELS['Bug Fix Attempt'] // 'Bug Fix Attempt'

// Array of all valid note types in display order
NOTE_TYPE_OPTIONS // ['General', 'Bug Fix Attempt', 'Validation', 'Other']
```

### UI Components

#### NoteModal

Modal for creating and editing notes.

```typescript
interface NoteModalProps {
  isOpen: boolean;
  initialNote?: Note;  // For edit mode
  onSave: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => void;
  onCancel: () => void;
}
```

#### MarkdownEditor

Textarea with markdown formatting toolbar.

```typescript
interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
}
```

#### NoteCard

Displays a single note with metadata and action buttons.

```typescript
interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (noteId: string) => void;
}
```

#### NotesList

Container for displaying and managing multiple notes with filtering.

```typescript
interface NotesListProps {
  notes: Note[];
  activeFilter?: NoteType | 'All';
  onAddNote: () => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
}
```

---

## Markdown Format Reference

This section documents how notes are persisted in the markdown request-log files. You typically won't need to edit this manually, but it's useful for understanding the format.

### Complete Example

Here's a complete request-log file with structured notes:

```markdown
---
type: request-log
doc_id: REQ-20260101-meatycapture
title: MeatyCapture Request Log
project_id: meatycapture
item_count: 1
tags: [notes, ux]
items_index:
  - id: REQ-20260101-meatycapture-01
    type: enhancement
    title: Add dark mode toggle
created_at: 2026-01-01T10:00:00Z
updated_at: 2026-01-01T14:30:00Z
archived: false
---

## REQ-20260101-meatycapture-01 - Add dark mode toggle

**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** ux, ui
**Modified:** 2026-01-01T14:30:00Z
**Context:** Settings page redesign

#### Notes

**Note 1: General** (Created: 2026-01-01 10:00)

Users requested this feature multiple times. Dark mode improves readability at night.

**Note 2: Bug Fix Attempt** (Created: 2026-01-01 10:30, Updated: 2026-01-01 11:00)

First attempt using CSS variables didn't apply to all components. Updated to use Tailwind's dark mode instead.

**Note 3: Validation** (Created: 2026-01-01 11:30)

Tested on:
- Chrome 120 (macOS, Windows)
- Firefox 121 (macOS)
- Safari 17 (macOS)
- Edge 120 (Windows)

All browsers render correctly with both themes.
```

### Notes Section Format

Notes are stored in a `#### Notes` subsection within each item. Each note block follows this format:

```
**Note {N}: {Type}** (Created: {CREATED_TIMESTAMP}[, Updated: {UPDATED_TIMESTAMP}])

{Note content with markdown formatting}

```

### Components

**Note Header Line:**
- `**Note {N}: {Type}**` - Numbering and type label
- `(Created: YYYY-MM-DD HH:mm)` - Creation timestamp
- `(Updated: YYYY-MM-DD HH:mm)` - Update timestamp (only if different from created)

**Note Content:**
- Markdown content supporting: bold, italic, lists, links, code blocks, headings, etc.
- Content continues until the next note block or end of item

### Timestamp Format

Timestamps in the Notes section use a human-readable format: `YYYY-MM-DD HH:mm`

- **Example:** `2026-01-01 10:30`
- **Timezone:** All timestamps are in UTC with `Z` suffix in frontmatter

### Backward Compatibility Details

When reading old documents that have a string `notes` field instead of the new Note array structure, MeatyCapture automatically converts them:

```typescript
// Old format (string)
notes: "This is the old-style notes field"

// Converts to new format (Note[])
notes: [{
  id: 'NOTE-{date}-{project}-{item}-01',
  type: 'General',
  content: 'This is the old-style notes field',
  created_at: new Date(),
  updated_at: new Date()
}]
```

No manual migration is required.

---

## Backward Compatibility

### Existing Items Without Notes

Documents created before the Structured Notes feature was implemented have no notes. When loaded:

- `item.notes` defaults to an empty array `[]`
- **"No notes yet"** message displays in the Notes section
- You can add notes normally using the **"+ Add Note"** button
- No migration or data transformation needed

### Old Items with String Notes

If an older version of MeatyCapture stored notes as a plain string field, the parser automatically converts them to the new Note array format with type 'General'.

### Migration Path

No action required. The system handles all conversions transparently:

1. Old documents load seamlessly
2. String notes are converted to Note objects on first read
3. When saved, notes use the new format
4. Reading and writing work correctly in both old and new versions

### Data Integrity

- Empty notes arrays don't break serialization
- Missing `notes` field is treated as empty array
- Old markdown files can be read and updated safely
- New format is fully backward compatible

---

## Troubleshooting

### Issue: Modal won't close when I press Escape

**Solution:** The Escape key should close the note modal. If it doesn't:
1. Ensure the modal is focused (you see the outline around it)
2. Try clicking the X button in the top-right corner instead
3. If neither works, reload the page

### Issue: Note appears to save but doesn't show up in file

**Solution:** Notes persist immediately when you save. If not appearing:
1. Check if the save was successful (look for green notification toast)
2. Try adding a new note to verify the add button works
3. Reload the page to refresh from the file
4. Check that the file has write permissions in your file system

### Issue: Markdown formatting isn't appearing when I save

**Solution:** Markdown is rendered in the viewer, not displayed as raw syntax:
1. The editor shows raw markdown (`**bold**`), but displays as **bold** in view mode
2. Save your note and view the item detail to see rendered markdown
3. Ensure your content is valid markdown syntax

### Issue: Character count won't decrease when I delete text

**Solution:** The character count updates in real-time:
1. It displays as you type
2. If it appears stuck, try clicking in the editor and typing more text
3. The count updates after each character change

### Issue: Notes aren't grouped by type in viewer

**Solution:** Notes should auto-group by type (General, Bug Fix Attempt, Validation, Other):
1. Verify you have notes with different types
2. Check the note type filter - ensure all types are selected
3. The sort order within each group is by created_at (oldest first)

### Issue: Can't edit a note

**Solution:** To edit a note:
1. Click the pencil (edit) icon on the note card - not the note content itself
2. The NoteModal opens with pre-filled data
3. Make your changes and click Save
4. The file updates immediately

### Issue: Delete doesn't ask for confirmation

**Solution:** Delete behavior differs between capture and viewer:
- **In Capture Wizard**: Immediate delete (no confirmation needed)
- **In Viewer**: Shows confirmation dialog before deleting
- This is intentional - during capture you can make mistakes and want quick recovery

### Issue: My note content has markdown but it shows as plain text

**Solution:** Ensure your note is saved in the file first:
1. Click **Save** to persist the note
2. Navigate away and back to the item to see rendered markdown
3. If still showing as plain text, check that your markdown syntax is valid

### Common Markdown Mistakes

| Problem | Solution |
|---------|----------|
| Bold not working | Use `**text**` with asterisks, not underscores |
| Links don't work | Use `[text](url)` format with parentheses |
| Code not showing | Use backticks for inline code or triple-backticks for blocks |
| Formatting looks weird | Check for unclosed markers (every `**` needs a closing `**`) |

### Performance Issues

**Issue:** App is slow when viewing items with many notes

**Solution:** MeatyCapture optimizes rendering for up to 50+ notes:
1. If you have excessive notes, consider archiving the item
2. Use the Note Type Filter to show only relevant notes
3. Notes load on-demand when you scroll to the section

### File Corruption

**Issue:** File won't load or shows errors

**Solution:** MeatyCapture creates backups before every write:
1. Check for `.bak` files in the same directory as your request-log
2. If the main file is corrupted, rename the `.bak` file to restore
3. Contact support if you need help recovering data

---

## Questions?

For more information, see:
- **Architecture**: See CLAUDE.md for system design
- **Implementation Details**: See Phase 5 in structured-notes-v1.md
- **Related Features**: Check design-spec.md for the broader vision

---

**Last Updated**: 2026-01-04
**Feature Status**: Production Ready
**Compatibility**: MeatyCapture v1.0+
