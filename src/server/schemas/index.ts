/**
 * Request Validation Schemas
 *
 * Central export point for all endpoint validation schemas.
 * Organized by store type (docs, projects, fields).
 *
 * Usage:
 * ```typescript
 * import { validateProjectCreateBody, validateItemDraftBody } from '@server/schemas';
 * ```
 */

// DocStore schemas
export {
  validateDocWriteBody,
  validateItemDraftBody,
  validateDirectoryParam,
  validatePathParam,
} from './docs.js';

// ProjectStore schemas
export {
  validateProjectCreateBody,
  validateProjectUpdateBody,
  validateProjectId,
} from './projects.js';

// FieldCatalogStore schemas
export {
  validateFieldName,
  validateFieldScope,
  validateFieldOptionCreateBody,
  validateFieldOptionId,
  validateProjectIdParam,
  validateOptionalProjectId,
} from './fields.js';
