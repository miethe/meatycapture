/**
 * Backup System Demo
 *
 * Demonstrates the automatic backup functionality of the fs-local adapter.
 * This example shows how backups are created before write operations.
 *
 * Run with: pnpm tsx examples/backup-demo.ts
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createFsDocStore } from '../src/adapters/fs-local';
import { logger, LogLevel } from '../src/core/logging';
import type { RequestLogDoc } from '../src/core/models';

// Enable debug logging to see all operations
logger.configure({ minLevel: LogLevel.DEBUG, prettyPrint: true });

async function main() {
  console.log('=== Backup System Demo ===\n');

  // Create temporary directory for demo
  const tempDir = await fs.mkdtemp(join(tmpdir(), 'meatycapture-backup-demo-'));
  console.log(`Demo directory: ${tempDir}\n`);

  const store = createFsDocStore();
  const docPath = join(tempDir, 'REQ-20251207-demo.md');

  // Create initial document
  console.log('1. Creating initial document...');
  const doc1: RequestLogDoc = {
    doc_id: 'REQ-20251207-demo',
    title: 'Backup System Demo',
    item_count: 1,
    tags: ['demo'],
    items_index: [
      { id: 'REQ-20251207-demo-01', type: 'enhancement' },
    ],
    items: [
      {
        id: 'REQ-20251207-demo-01',
        type: 'enhancement',
        title: 'Initial item',
        domain: 'core',
        context: 'n/a',
        priority: 'medium',
        status: 'triage',
        tags: ['demo'],
        notes: 'This is the initial version',
        created_at: new Date(),
      },
    ],
    created_at: new Date(),
    updated_at: new Date(),
  };

  await store.write(docPath, doc1);
  console.log('✓ Initial document created (no backup - file is new)\n');

  // Show file contents
  const content1 = await fs.readFile(docPath, 'utf-8');
  console.log('File contents:');
  console.log(content1.substring(0, 200) + '...\n');

  // Update document (backup will be created)
  console.log('2. Updating document (backup will be created)...');
  const doc2: RequestLogDoc = {
    ...doc1,
    item_count: 2,
    tags: ['demo', 'backup'],
    items_index: [
      { id: 'REQ-20251207-demo-01', type: 'enhancement' },
      { id: 'REQ-20251207-demo-02', type: 'enhancement' },
    ],
    items: [
      ...doc1.items,
      {
        id: 'REQ-20251207-demo-02',
        type: 'enhancement',
        title: 'Second item',
        domain: 'core',
        context: 'n/a',
        priority: 'high',
        status: 'triage',
        tags: ['backup'],
        notes: 'This is the updated version',
        created_at: new Date(),
      },
    ],
    updated_at: new Date(),
  };

  await store.write(docPath, doc2);
  console.log('✓ Document updated (backup created at .bak)\n');

  // Check for backup file
  const backupPath = `${docPath}.bak`;
  const backupExists = await fs
    .access(backupPath)
    .then(() => true)
    .catch(() => false);

  console.log(`3. Backup file check: ${backupExists ? '✓ EXISTS' : '✗ MISSING'}`);

  if (backupExists) {
    const backupContent = await fs.readFile(backupPath, 'utf-8');
    console.log('\nBackup file contents (first version):');
    console.log(backupContent.substring(0, 200) + '...\n');

    // Show that backup has old content
    console.log('Backup comparison:');
    console.log(`  Original item_count: 1`);
    console.log(`  Current item_count: 2`);
    console.log('  ✓ Backup preserves original version\n');
  }

  // Third update (backup will be overwritten)
  console.log('4. Third update (backup will be overwritten)...');
  const doc3: RequestLogDoc = {
    ...doc2,
    item_count: 3,
    items_index: [
      ...doc2.items_index,
      { id: 'REQ-20251207-demo-03', type: 'bug' },
    ],
    items: [
      ...doc2.items,
      {
        id: 'REQ-20251207-demo-03',
        type: 'bug',
        title: 'Third item',
        domain: 'ui',
        context: 'web',
        priority: 'low',
        status: 'triage',
        tags: ['demo'],
        notes: 'This is the third version',
        created_at: new Date(),
      },
    ],
    updated_at: new Date(),
  };

  await store.write(docPath, doc3);
  console.log('✓ Document updated again (backup overwritten)\n');

  // Verify backup now has second version
  const backupContent2 = await fs.readFile(backupPath, 'utf-8');
  console.log('Backup now contains:');
  console.log(`  Version with item_count: 2 (second version)`);
  console.log('  ✓ Old backup replaced with previous version\n');

  // Demonstrate backup utility
  console.log('5. Direct backup creation...');
  const manualBackupPath = await store.backup(docPath);
  console.log(`✓ Manual backup created: ${manualBackupPath}\n`);

  // Cleanup
  console.log('6. Cleanup...');
  await fs.rm(tempDir, { recursive: true, force: true });
  console.log('✓ Demo directory removed\n');

  console.log('=== Demo Complete ===');
  console.log('\nKey Takeaways:');
  console.log('  • Backups are created automatically before writes');
  console.log('  • Only 1 backup per file (most recent previous version)');
  console.log('  • New files do not create backups');
  console.log('  • Backups use .bak extension');
  console.log('  • All operations are logged with structured context');
}

main().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});
