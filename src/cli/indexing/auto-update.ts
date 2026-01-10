/**
 * Index Auto-Update Helpers
 *
 * Best-effort catalog updates after CLI write/delete operations.
 * Failures are surfaced as warnings and never block the main command.
 */

import { dirname } from 'node:path';
import type { DocStore } from '@core/ports';
import type { RequestLogDoc } from '@core/models';
import { updateCatalogForDocument, removeCatalogForDocument } from './catalog.js';
import { isQuietMode } from '@cli/handlers/errors.js';

export async function updateIndexAfterWrite(
  docStore: DocStore,
  docPath: string,
  doc: RequestLogDoc
): Promise<void> {
  const projectPath = dirname(docPath);
  try {
    await updateCatalogForDocument(docStore, projectPath, doc, docPath);
  } catch (error) {
    if (!isQuietMode()) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Warning: failed to update catalog index (${message})`);
    }
  }
}

export async function removeIndexAfterDelete(docPath: string): Promise<void> {
  const projectPath = dirname(docPath);
  try {
    await removeCatalogForDocument(projectPath, docPath);
  } catch (error) {
    if (!isQuietMode()) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Warning: failed to update catalog index (${message})`);
    }
  }
}
