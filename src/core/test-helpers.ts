/**
 * Test Data Factory Helpers
 *
 * Provides factory functions to generate test data for unit tests.
 * Enables easy creation of valid test objects with sensible defaults
 * and the ability to override specific fields for edge case testing.
 */

import type { RequestLogItem, RequestLogDoc } from './models';

/**
 * Creates a test RequestLogItem with sensible defaults.
 *
 * @param overrides - Partial object to override default values
 * @returns Complete RequestLogItem for testing
 *
 * @example
 * ```typescript
 * // Create with defaults
 * const item = createTestItem();
 *
 * // Create with custom values
 * const customItem = createTestItem({
 *   title: 'Custom Title',
 *   priority: 'high',
 *   tags: ['urgent', 'api']
 * });
 * ```
 */
export function createTestItem(overrides?: Partial<RequestLogItem>): RequestLogItem {
  const now = new Date('2025-12-03T10:00:00Z');

  return {
    id: 'REQ-20251203-test-project-01',
    title: 'Test Item Title',
    type: 'enhancement',
    domain: 'web',
    context: 'Test context',
    priority: 'medium',
    status: 'triage',
    tags: ['test', 'example'],
    notes: 'Test notes describing the problem or goal.',
    created_at: now,
    ...overrides,
  };
}

/**
 * Creates a test RequestLogDoc with sensible defaults.
 *
 * @param overrides - Partial object to override default values
 * @returns Complete RequestLogDoc for testing
 *
 * @example
 * ```typescript
 * // Create with defaults
 * const doc = createTestDoc();
 *
 * // Create with custom items
 * const docWithItems = createTestDoc({
 *   items: [
 *     createTestItem({ id: 'REQ-20251203-test-01', title: 'First' }),
 *     createTestItem({ id: 'REQ-20251203-test-02', title: 'Second' }),
 *   ]
 * });
 * ```
 */
export function createTestDoc(overrides?: Partial<RequestLogDoc>): RequestLogDoc {
  const now = new Date('2025-12-03T10:00:00Z');

  const defaultItems: RequestLogItem[] = [
    createTestItem({
      id: 'REQ-20251203-test-project-01',
      title: 'First Test Item',
      tags: ['test', 'example'],
    }),
    createTestItem({
      id: 'REQ-20251203-test-project-02',
      title: 'Second Test Item',
      tags: ['example', 'feature'],
    }),
  ];

  const items = overrides?.items ?? defaultItems;
  const tags = overrides?.tags ?? ['example', 'feature', 'test'];
  const items_index = overrides?.items_index ?? [
    { id: 'REQ-20251203-test-project-01', type: 'enhancement', title: 'First Test Item' },
    { id: 'REQ-20251203-test-project-02', type: 'enhancement', title: 'Second Test Item' },
  ];

  return {
    doc_id: 'REQ-20251203-test-project',
    title: 'Test Project Request Log',
    project_id: 'test-project',
    items,
    items_index,
    tags,
    item_count: items.length,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}
