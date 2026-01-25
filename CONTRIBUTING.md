# Contributing to MeatyCapture

Thank you for your interest in contributing to MeatyCapture! This guide will help you set up your development environment and submit contributions effectively.

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.0.0 or higher
- **pnpm** 8.0.0 or higher (package manager)
- **Git** for version control

Check your versions:

```bash
node --version    # Should be v18.0.0 or higher
pnpm --version    # Should be 8.0.0 or higher
git --version
```

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/meatycapture.git
cd meatycapture
```

3. Add the upstream remote to track the original repository:

```bash
git remote add upstream https://github.com/miethe/meatycapture.git
```

### Install Dependencies

```bash
pnpm install
```

This installs all dependencies, including development tools (TypeScript, ESLint, Prettier, Vitest, Playwright, etc.).

### Verify Your Setup

Run the development server:

```bash
pnpm dev
```

The web app should open at `http://localhost:5173`. Verify that you can navigate the UI without errors.

Build the CLI:

```bash
pnpm build:cli
```

Verify the CLI works:

```bash
node dist/cli/index.js --version
```

## Development Workflow

### Creating a Feature Branch

Create a feature branch for your work. Use descriptive names:

```bash
git checkout -b feat/add-bulk-export
git checkout -b fix/search-regex-escape
git checkout -b docs/update-setup-guide
```

Branch naming convention:
- `feat/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation changes
- `test/` - Test additions or updates
- `chore/` - Build, dependency, or config changes

### Making Changes

Edit files, add features, or fix bugs. Follow these practices:

1. **Keep commits focused** - One feature or fix per commit
2. **Test frequently** - Run tests after changes
3. **Format code** - Use the project's formatting standards
4. **Write clear commit messages** - Explain the "why", not just the "what"

### Running Tests

Run the test suite:

```bash
pnpm test
```

Watch mode (tests re-run on file changes):

```bash
pnpm test --watch
```

Generate coverage report:

```bash
pnpm test:coverage
```

Tests should pass before submitting a pull request. Add tests for new features:

```
src/
├── core/
│   └── __tests__/
│       └── new-feature.test.ts
├── ui/
│   └── __tests__/
│       └── NewComponent.test.tsx
└── cli/
    └── __tests__/
        └── new-command.test.ts
```

### Type Checking

Ensure TypeScript catches type errors:

```bash
pnpm typecheck
```

### Linting

Check code quality:

```bash
pnpm lint
```

ESLint will report style and potential issues. Fix most issues automatically:

```bash
pnpm lint -- --fix
```

### Code Formatting

Format code with Prettier:

```bash
pnpm format
```

This formats all TypeScript, TSX, JSON, and Markdown files.

### Running E2E Tests

Test the entire application with Playwright:

```bash
pnpm test:e2e
```

Mobile-specific tests:

```bash
pnpm test:e2e:mobile
```

Interactive UI mode:

```bash
pnpm test:e2e:ui
```

### Building Artifacts

Build the CLI distribution:

```bash
pnpm build:cli
```

Build standalone binaries (requires Bun):

```bash
pnpm build:binary          # Current platform
pnpm build:binary:all      # All platforms
```

## Project Structure

Understanding the project layout helps with contributing:

```
meatycapture/
├── src/
│   ├── cli/               # CLI commands and handlers
│   │   ├── commands/      # Command implementations
│   │   ├── handlers/      # Command logic
│   │   ├── formatters/    # Output formatting (JSON, YAML, table)
│   │   └── index.ts       # CLI entry point
│   ├── core/              # Headless domain logic
│   │   ├── validation/    # Input validation
│   │   ├── serializer/    # Markdown parsing/generation
│   │   ├── models/        # Data types (Project, ItemDraft, etc.)
│   │   └── catalog/       # Field catalog management
│   ├── ui/                # React components
│   │   ├── wizard/        # Multi-step capture flow
│   │   ├── viewer/        # Request log document viewer
│   │   ├── admin/         # Field and project admin
│   │   └── shared/        # Reusable components
│   ├── adapters/          # Port implementations
│   │   ├── fs-local/      # File system storage
│   │   ├── config-local/  # Local config (JSON/TOML)
│   │   └── api-client/    # API mode client
│   ├── server/            # (Optional) Server backend
│   └── main.tsx           # Web app entry point
├── tests/
│   └── e2e/               # Playwright E2E tests
├── docs/                  # User and developer documentation
├── vite.config.ts         # Vite build configuration
├── vitest.config.ts       # Vitest test configuration
└── tsconfig.json          # TypeScript configuration
```

## Commit Guidelines

Write clear, conventional commits. Use this format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring without feature changes
- `docs` - Documentation changes
- `test` - Test additions or updates
- `chore` - Build, dependencies, or config changes
- `perf` - Performance improvements

### Scope (optional)

Specify the area affected:

```
feat(cli): add --json output flag
fix(ui): resolve dropdown focus issue
docs(setup): clarify Node.js version requirement
test(wizard): add project selection tests
```

### Subject

- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize the first letter
- No period at the end
- Keep under 50 characters

### Body (optional)

Provide additional context:

```
feat(cli): add --json output flag

Allows programmatic consumption of CLI output.
Useful for CI/CD pipelines and tool integration.

Closes #42
```

### Examples

```
feat(cli): add batch append command
fix(ui): prevent form submission on enter in multiselect
docs: update installation guide for homebrew
test(core): add validation tests for item IDs
chore: upgrade typescript to 5.7.2
refactor(serializer): simplify markdown generation logic
```

## Pull Request Process

### Before Submitting

1. **Update your branch** with latest changes from upstream:

```bash
git fetch upstream
git rebase upstream/main
```

2. **Run the full test suite**:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e
```

3. **Format code**:

```bash
pnpm format
```

4. **Create a clear commit message** (see Commit Guidelines above)

5. **Push to your fork**:

```bash
git push origin feat/your-feature-name
```

### Creating the Pull Request

1. Go to the original repository on GitHub
2. Click "New Pull Request"
3. Select your branch as the source
4. Fill in the PR title and description:

```markdown
## Summary
Brief description of what this PR does.

## Changes
- Added X feature
- Fixed Y bug
- Updated Z documentation

## Testing
How to test these changes:
- Run `pnpm test`
- Manual testing steps if applicable

## Related Issues
Closes #42
```

5. Request review from maintainers
6. Wait for CI to pass and respond to feedback

### PR Requirements

- [ ] Code builds without errors (`pnpm build` and `pnpm build:cli`)
- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Code is formatted (`pnpm format`)
- [ ] Commit messages follow conventions
- [ ] No breaking changes (or clearly documented)
- [ ] Tests added for new features

## Creating Changesets

MeatyCapture uses [Changesets](https://github.com/changesets/changesets) for version management and changelog generation.

When you're ready to document your changes for release:

```bash
pnpm changeset
```

This opens an interactive prompt:

1. **Select affected packages** (usually `meatycapture`)
2. **Choose version bump** - major/minor/patch based on semver
3. **Describe the change** - Used in changelog

Example for a new feature:

```
meatycapture: minor
Added batch append command for efficient bulk capture
```

Example for a bug fix:

```
meatycapture: patch
Fixed dropdown focus issue in field management
```

The changeset file is automatically created in `.changeset/`. Commit it with your changes:

```bash
git add .changeset/*.md
git commit -m "chore: add changeset for feature X"
```

**Note:** Changesets are published by maintainers during release. You don't need to update version numbers manually.

## Code Style

MeatyCapture follows consistent patterns:

### TypeScript

- Use strict type checking (`strict: true` in tsconfig.json)
- Provide explicit return types on functions
- Use interfaces for contracts, types for unions/aliases
- Avoid `any` - use generics or proper types instead

```typescript
// Good
interface User {
  id: string;
  name: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// Avoid
function getUser(id: any): any {
  // ...
}
```

### React Components

- Use functional components and hooks
- Provide JSDoc comments for component props
- Keep components focused and testable

```typescript
interface ButtonProps {
  /** Button text content */
  children: React.ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Visual variant */
  variant?: 'primary' | 'secondary';
}

/**
 * Reusable button component with consistent styling.
 */
export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  // Implementation
}
```

### File Organization

- Keep files small and focused
- Use `index.ts` for barrel exports from directories
- Place tests adjacent to source files: `Component.tsx` and `Component.test.tsx`
- Use meaningful directory names that reflect domain

## Testing

### Unit Tests

Test individual functions and components:

```typescript
import { describe, it, expect } from 'vitest';
import { validateTitle } from './validation';

describe('validateTitle', () => {
  it('accepts valid titles', () => {
    expect(validateTitle('Add authentication')).toBe(true);
  });

  it('rejects empty titles', () => {
    expect(validateTitle('')).toBe(false);
  });
});
```

### Integration Tests

Test feature flows:

```typescript
it('should capture an item and append to document', async () => {
  const store = new InMemoryDocStore();
  const item = { title: 'Test', type: 'bug' };

  await store.append('/path/doc.md', item);
  const doc = await store.read('/path/doc.md');

  expect(doc.item_count).toBe(1);
});
```

### E2E Tests

Test complete user flows with Playwright:

```typescript
import { test, expect } from '@playwright/test';

test('should create a new project and log an item', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.click('button:has-text("Add Project")');
  // ... complete flow
  await expect(page.locator('text=Item created')).toBeVisible();
});
```

## Debugging

### CLI Debugging

Set environment variables for verbose logging:

```bash
DEBUG=meatycapture:* pnpm build:cli
node dist/cli/index.js --version
```

### Web App Debugging

The dev server includes source maps. Use Chrome DevTools:

1. `pnpm dev` to start the dev server
2. Open `http://localhost:5173` in Chrome
3. Press `F12` to open DevTools
4. Set breakpoints in the Sources tab

### Database/File I/O Debugging

Check files in the config directory:

```bash
ls -la ~/.meatycapture/
cat ~/.meatycapture/projects.json
```

## Getting Help

- **GitHub Issues** - Report bugs or request features
- **GitHub Discussions** - Ask questions and discuss ideas
- **Documentation** - Check `/docs` for detailed guides
- **Code Comments** - Source code includes JSDoc and comments

## Recognition

Contributors are recognized in:

- GitHub repository contributor list
- Release changelog
- Project documentation

## License

By contributing, you agree that your contributions are licensed under the same license as the project (see LICENSE file).

Thank you for contributing to MeatyCapture!
