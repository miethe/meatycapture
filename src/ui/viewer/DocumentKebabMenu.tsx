/**
 * DocumentKebabMenu Component
 *
 * Specialized kebab menu for document-level operations.
 * Provides actions for adding items, editing, archiving, and deleting documents.
 *
 * Features:
 * - Add Item action (green)
 * - Edit Document action (blue)
 * - Archive/Unarchive toggle based on document state
 * - Delete Document action (dangerous)
 * - Uses KebabMenu component for consistent behavior
 */

import React from 'react';
import type { RequestLogDoc } from '@core/models';
import { KebabMenu, type KebabMenuItem } from '../shared/KebabMenu';

/**
 * Plus icon for Add Item action
 */
function PlusIcon(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
}

/**
 * Edit/Pencil icon for Edit Document action
 */
function EditIcon(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9" />
      <path d="M12.5 1.5a1.414 1.414 0 0 1 2 2L8 10l-2.5.5.5-2.5 6.5-6.5z" />
    </svg>
  );
}

/**
 * Archive/Box icon for Archive Document action
 */
function ArchiveIcon(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="14 4 14 13 2 13 2 4" />
      <rect x="1" y="2" width="14" height="3" />
      <line x1="6" y1="8" x2="10" y2="8" />
    </svg>
  );
}

/**
 * Unarchive icon for Unarchive Document action
 */
function UnarchiveIcon(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="14 6 14 13 2 13 2 6" />
      <rect x="1" y="2" width="14" height="3" />
      <polyline points="6 9 8 7 10 9" />
    </svg>
  );
}

/**
 * Trash icon for Delete Document action
 */
function TrashIcon(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="2 4 3 4 14 4" />
      <path d="M12.5 4v9a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V4m2 0V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" />
      <line x1="6.5" y1="7" x2="6.5" y2="11" />
      <line x1="9.5" y1="7" x2="9.5" y2="11" />
    </svg>
  );
}

export interface DocumentKebabMenuProps {
  /** The document to operate on */
  doc: RequestLogDoc;
  /** Callback when delete action is selected */
  onDelete: () => void;
  /** Callback when archive action is selected */
  onArchive: () => void;
  /** Callback when unarchive action is selected (for archived docs) */
  onUnarchive?: () => void;
  /** Callback when edit action is selected */
  onEdit: () => void;
  /** Callback when add item action is selected */
  onAddItem: () => void;
}

/**
 * DocumentKebabMenu Component
 *
 * Kebab menu with document-specific actions: add item, edit, archive/unarchive, delete.
 * Shows Archive or Unarchive based on doc.archived status.
 *
 * @param props - DocumentKebabMenuProps
 * @returns DocumentKebabMenu component
 */
export function DocumentKebabMenu({
  doc,
  onDelete,
  onArchive,
  onUnarchive,
  onEdit,
  onAddItem,
}: DocumentKebabMenuProps): React.JSX.Element {
  // Build menu items based on document state
  const items: KebabMenuItem[] = [
    {
      label: 'Add Item',
      icon: <PlusIcon />,
      onClick: onAddItem,
    },
    {
      label: 'Edit Document',
      icon: <EditIcon />,
      onClick: onEdit,
    },
  ];

  // Add Archive or Unarchive based on document state
  if (doc.archived && onUnarchive) {
    items.push({
      label: 'Unarchive Document',
      icon: <UnarchiveIcon />,
      onClick: onUnarchive,
    });
  } else if (!doc.archived) {
    items.push({
      label: 'Archive Document',
      icon: <ArchiveIcon />,
      onClick: onArchive,
    });
  }

  // Delete is always last and marked as dangerous
  items.push({
    label: 'Delete Document',
    icon: <TrashIcon />,
    onClick: onDelete,
    isDangerous: true,
  });

  return (
    <KebabMenu
      items={items}
      ariaLabel={`Actions for document ${doc.doc_id}`}
    />
  );
}

export default DocumentKebabMenu;
