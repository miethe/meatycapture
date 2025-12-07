# Wizard Flow Components

Multi-step wizard for capturing request-log items to markdown documents.

## Architecture

```
WizardFlow (orchestrator)
├── ProjectStep     (Step 1: Select/Create Project)
├── DocStep         (Step 2: New or Existing Document)
├── ItemStep        (Step 3: Capture Item Details)
└── ReviewStep      (Step 4: Review & Submit)
```

## State Machine

```
project → doc → item → review → success
    ↑                    ↓
    └─── (batching) ────┘
```

After first successful submit, wizard enters **batching mode**:

- Project and document are locked
- User can add multiple items to the same document
- Only the item draft is reset between submissions
- Back navigation is disabled in batching mode

## Usage

```tsx
import { WizardFlow } from '@ui/wizard';
import { ProjectStore, FieldCatalogStore, DocStore, Clock } from '@core/ports';

function App() {
  const projectStore = new LocalProjectStore();
  const fieldCatalogStore = new LocalFieldCatalogStore();
  const docStore = new LocalDocStore();
  const clock = new SystemClock();

  return (
    <WizardFlow
      projectStore={projectStore}
      fieldCatalogStore={fieldCatalogStore}
      docStore={docStore}
      clock={clock}
      onComplete={() => console.log('Wizard completed')}
    />
  );
}
```

## Props

### WizardFlowProps

| Prop                | Type                | Description                            |
| ------------------- | ------------------- | -------------------------------------- |
| `projectStore`      | `ProjectStore`      | Project CRUD operations                |
| `fieldCatalogStore` | `FieldCatalogStore` | Field options management               |
| `docStore`          | `DocStore`          | Document read/write/append             |
| `clock`             | `Clock`             | Time abstraction for testing           |
| `onComplete`        | `() => void`        | Optional callback when wizard finishes |

## Step Components

### 1. ProjectStep

**Purpose**: Select existing project or create new one

**Features**:

- Dropdown with enabled projects only
- Modal for creating new projects with validation
- Auto-generates default doc path on selection
- Inline path validation with error messages

**Navigation**: Next → DocStep (disabled if no project selected)

---

### 2. DocStep

**Purpose**: Choose to create new document or add to existing

**Features**:

- Radio selection: "Create new" vs "Add to existing"
- Auto-generated doc path with date-based ID
- Optional path override with validation
- List of existing documents with metadata:
  - Document ID and title
  - Item count and last updated date
  - Tag preview (first 5 tags)
  - Visual selection state

**Navigation**:

- Back → ProjectStep (disabled in batching mode)
- Next → ItemStep (disabled if no selection)

---

### 3. ItemStep

**Purpose**: Capture request item details

**Features**:

- Title input (required)
- Type dropdown with Add+ (required)
- Domain dropdown with Add+ (optional)
- Context dropdown with Add+ (optional)
- Priority dropdown with Add+ (required, default: "medium")
- Status dropdown with Add+ (required, default: "triage")
- Tags multi-select with Add+ (optional)
- Notes textarea (optional)

**Field Options**:

- Loaded from FieldCatalogStore on entry
- Project-scoped options merged with global
- Add+ creates project-scoped option and auto-selects it

**Validation**:

- Required: title, type, priority, status
- Next button disabled if validation fails

**Navigation**:

- Back → DocStep (disabled in batching mode)
- Next → ReviewStep (disabled if invalid)

---

### 4. ReviewStep

**Purpose**: Review and submit, or add another item

**Features**:

- Summary of project, document path, and item details
- Visual badges for new vs existing doc
- Color-coded metadata badges
- Submit button with loading state
- Success state with:
  - Animated success icon
  - Path display
  - "Add Another Item" button
  - "Done" button (reloads page)

**Navigation**:

- Back → ItemStep (only in review state)
- Submit → Success state
- Add Another → ItemStep (batching mode, draft reset)
- Done → Reload or call onComplete

## Batching Mode

After first successful submit:

```typescript
// State changes:
batchingMode = true;
isNewDoc = false;
submitSuccess = false;
draft = EMPTY_DRAFT;
currentStep = 'item';

// Behavior:
// - Back buttons disabled
// - Project/Doc locked
// - All new items append to same document
```

## State Management

### Project State

- `projects: Project[]` - All projects from store
- `selectedProject: Project | null` - Currently selected

### Document State

- `existingDocs: RequestLogDoc[]` - Available docs in project path
- `selectedDocPath: string | null` - null = new, string = existing
- `docPath: string` - Auto-generated or overridden path
- `isNewDoc: boolean` - Whether creating new document

### Item State

- `draft: ItemDraft` - Form data for current item
- `fieldOptions: Record<FieldName, FieldOption[]>` - Dropdown options

### UI State

- `currentStep: WizardStep` - Active step in flow
- `isLoading: boolean` - Background data loading
- `isSubmitting: boolean` - Submit in progress
- `submitSuccess: boolean` - Submit completed
- `error: string | null` - Error message display
- `batchingMode: boolean` - Locked to project/doc

## Data Flow

### Step 1 → 2: Project Selected

```typescript
onSelectProject(projectId)
  → Find project in list
  → Set selectedProject
  → Generate default docPath = `{project.default_path}/{docId}.md`
  → Navigate to DocStep
  → Load existing docs from docStore.list()
```

### Step 2 → 3: Document Selected

```typescript
onSelectDoc(path)
  → Set selectedDocPath (null = new)
  → Set isNewDoc
  → Navigate to ItemStep
  → Load fieldOptions from fieldCatalogStore
```

### Step 3 → 4: Item Drafted

```typescript
onDraftChange(draft)
  → Update draft state
  → Navigate to ReviewStep
```

### Step 4: Submit

```typescript
onSubmit()
  → If isNewDoc:
      - Create RequestLogDoc with first item
      - docStore.write(docPath, doc)
  → Else:
      - docStore.append(docPath, draft, clock)
  → Set submitSuccess = true
  → Set batchingMode = true
```

### Step 4 (Success): Add Another

```typescript
onAddAnother()
  → Reset draft = EMPTY_DRAFT
  → Set submitSuccess = false
  → Set isNewDoc = false (all subsequent = append)
  → Navigate to ItemStep
```

## Error Handling

### Non-Fatal Errors

- Failed to load docs: Empty list, user can still create new
- Failed to load field options: Set error state, block progress

### Fatal Errors

- Failed to load projects: Error state with retry
- Failed to create/update stores: Error display
- Submit failure: Error message, stay on review

### Error Display

```tsx
<div className="wizard-error">
  <h2>Error</h2>
  <p>{error}</p>
  <button onClick={() => setError(null)}>Dismiss</button>
</div>
```

## Testing Strategy

### Unit Tests

- State transitions between steps
- Draft updates and validation
- Batching mode behavior
- Error state handling

### Integration Tests

- Full wizard flow: project → doc → item → submit
- Add another item flow (batching)
- Create new project within wizard
- Add new field options inline

### E2E Tests

- Complete capture flow with real stores
- Path generation and validation
- Document append to existing file
- Tag aggregation on submit

## Accessibility

- All form fields have proper labels
- Required fields marked with `required` attribute
- Error messages linked with `aria-describedby`
- Modal has `role="dialog"` and `aria-modal="true"`
- Focus management in modal
- Keyboard shortcuts:
  - ESC to close modal
  - CMD+Enter to submit modal form

## Performance

### Optimizations

- Lazy load docs only when DocStep is active
- Lazy load field options only when ItemStep is active
- Use React.memo for step components (future)
- Debounce path validation (future)

### Memory

- Clear existingDocs when leaving project
- Reset draft on submit in batching mode
- Avoid storing full doc content in memory (use DocMeta)

## Future Enhancements

- [ ] Extract state logic to `useWizardState` custom hook
- [ ] Add keyboard navigation between steps
- [ ] Auto-save draft to localStorage
- [ ] Undo/redo for draft changes
- [ ] Bulk import from CSV/JSON
- [ ] Template-based quick capture
- [ ] Search existing docs while typing
- [ ] Recent projects quick access
- [ ] Offline mode with sync queue
