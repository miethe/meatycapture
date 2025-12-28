/**
 * Project Add Command
 *
 * Creates a new project in the MeatyCapture registry.
 *
 * Features:
 * - Auto-generate project ID from name using slugify
 * - Custom ID support with validation (kebab-case)
 * - Path validation (exists, writable)
 * - Optional repository URL
 * - Multiple output formats (JSON, YAML, human)
 * - Conflict detection (duplicate IDs)
 *
 * Exit codes:
 * - 0: Success
 * - 1: Validation error (invalid input format)
 * - 2: I/O error (path not found/writable)
 * - 3: Resource conflict (ID already exists)
 */

import type { Command } from 'commander';
import { createProjectStore } from '@adapters/config-local';
import type { Project } from '@core/models';
import {
  formatOutput,
  type OutputFormat,
  type FormatOptions,
} from '@cli/formatters';
import {
  withErrorHandling,
  setQuietMode,
  isQuietMode,
  createError,
  ExitCodes,
  validateProjectId,
  validatePathExists,
  validatePathWritable,
  generateProjectIdFromName,
} from '@cli/handlers';

/**
 * Command options for project add command.
 */
interface AddOptions {
  id?: string;
  repoUrl?: string;
  json?: boolean;
  yaml?: boolean;
  quiet?: boolean;
}

/**
 * Determines output format from mutually exclusive flags.
 * Priority: json > yaml > human (default)
 */
function resolveOutputFormat(options: AddOptions): OutputFormat {
  if (options.json) return 'json';
  if (options.yaml) return 'yaml';
  return 'human';
}

/**
 * Creates a new project in the registry.
 *
 * Process:
 * 1. Validate or generate project ID
 * 2. Validate path exists and is writable
 * 3. Check for duplicate ID
 * 4. Create project via ProjectStore
 * 5. Output created project
 *
 * Exit codes:
 * - 0: Success
 * - 1: Validation error (invalid ID format, invalid input)
 * - 2: I/O error (path not found, not writable)
 * - 3: Resource conflict (ID already exists)
 */
export async function addAction(
  name: string,
  path: string,
  options: AddOptions
): Promise<void> {
  // Set quiet mode globally for formatters
  if (options.quiet) {
    setQuietMode(true);
  }

  // Validate required arguments
  if (!name || name.trim() === '') {
    throw createError.validation(
      'Project name is required',
      'Provide a non-empty project name'
    );
  }

  if (!path || path.trim() === '') {
    throw createError.validation(
      'Default path is required',
      'Provide a valid directory path for project documents'
    );
  }

  // Determine project ID (custom or auto-generated)
  let projectId: string;
  if (options.id) {
    // Validate custom ID format
    validateProjectId(options.id);
    projectId = options.id;
  } else {
    // Auto-generate from name
    projectId = generateProjectIdFromName(name);
  }

  // Validate path exists and is a directory
  await validatePathExists(path);

  // Validate path is writable
  await validatePathWritable(path);

  // Check if project with this ID already exists
  const projectStore = createProjectStore();
  const existingProject = await projectStore.get(projectId);
  if (existingProject) {
    throw createError.conflict(
      'project',
      projectId,
      options.id
        ? 'Choose a different ID or remove the existing project'
        : `Project ID "${projectId}" is auto-generated from the name. Use --id to specify a custom ID`
    );
  }

  // Create the project
  const projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'> = {
    name,
    default_path: path,
    enabled: true,
  };

  // Only add repo_url if provided
  if (options.repoUrl) {
    projectData.repo_url = options.repoUrl;
  }

  const newProject: Project = await projectStore.create(projectData);

  // Determine output format
  const format = resolveOutputFormat(options);
  const formatOptions: FormatOptions = {
    format,
    quiet: options.quiet ?? false,
    color: process.stdout.isTTY,
  };

  // Output created project
  if (!isQuietMode()) {
    // Format project as array for consistency with list command
    const output = formatOutput([newProject], formatOptions);
    if (output) {
      console.log(output);
    }

    // For human format, add success message
    if (format === 'human') {
      console.log(
        `\nProject "${name}" created successfully with ID: ${projectId}`
      );
      console.log(`Documents will be stored in: ${path}`);
      if (options.repoUrl) {
        console.log(`Repository: ${options.repoUrl}`);
      }
    }
  }

  process.exit(ExitCodes.SUCCESS);
}

/**
 * Registers the add command with a Commander program/command.
 */
export function registerAddCommand(program: Command): void {
  program
    .command('add')
    .description('Create a new project in the registry')
    .argument('<name>', 'Project name (used to generate ID if --id not provided)')
    .argument('<path>', 'Default path for request-log documents')
    .option('--id <id>', 'Custom project ID (kebab-case, auto-generated from name if not provided)')
    .option('--repo-url <url>', 'Optional repository URL for context')
    .option('--json', 'Output created project as JSON')
    .option('--yaml', 'Output created project as YAML')
    .option('-q, --quiet', 'Suppress non-error output')
    .addHelpText(
      'after',
      `
Examples:
  # Create project with auto-generated ID
  meatycapture project add "My Project" "/path/to/docs"
  → Creates project with ID: my-project

  # Create project with custom ID
  meatycapture project add "My Project" "/path/to/docs" --id custom-id

  # Create project with repository URL
  meatycapture project add "API Service" "/docs" --repo-url https://github.com/user/repo

  # Output as JSON for scripting
  meatycapture project add "CI Project" "/ci/docs" --json

Exit Codes:
  0  Success - project created
  1  Validation error (invalid ID format, invalid input)
  2  I/O error (path not found, path not writable)
  3  Resource conflict (project ID already exists)
`
    )
    .action(withErrorHandling(addAction));
}
