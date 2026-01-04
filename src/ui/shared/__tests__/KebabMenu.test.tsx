/**
 * KebabMenu Component Tests
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KebabMenu } from '../KebabMenu';

describe('KebabMenu', () => {
  const defaultItems = [
    { label: 'Edit', onClick: vi.fn() },
    { label: 'Duplicate', onClick: vi.fn() },
    { label: 'Delete', onClick: vi.fn(), isDangerous: true },
  ];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders trigger button with default kebab icon', () => {
      render(<KebabMenu items={defaultItems} />);

      const trigger = screen.getByRole('button', { name: 'Menu' });
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('renders with custom trigger element', () => {
      render(
        <KebabMenu
          items={defaultItems}
          trigger={<span data-testid="custom-trigger">Custom</span>}
        />
      );

      expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
    });

    it('renders with custom aria label', () => {
      render(<KebabMenu items={defaultItems} ariaLabel="Item actions" />);

      expect(screen.getByRole('button', { name: 'Item actions' })).toBeInTheDocument();
    });

    it('menu is not visible initially', () => {
      render(<KebabMenu items={defaultItems} />);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('menu toggle', () => {
    it('opens menu when trigger is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      const trigger = screen.getByRole('button', { name: 'Menu' });
      await user.click(trigger);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('closes menu when trigger is clicked again', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      const trigger = screen.getByRole('button', { name: 'Menu' });
      await user.click(trigger);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await user.click(trigger);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('renders all menu items when open', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
    });
  });

  describe('item selection', () => {
    it('calls onClick when menu item is clicked', async () => {
      const onClick = vi.fn();
      const items = [{ label: 'Edit', onClick }];
      const user = userEvent.setup({ delay: null });

      render(<KebabMenu items={items} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('closes menu after item selection', async () => {
      const onClick = vi.fn();
      const items = [{ label: 'Edit', onClick }];
      const user = userEvent.setup({ delay: null });

      render(<KebabMenu items={items} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }));

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('returns focus to trigger after item selection', async () => {
      const onClick = vi.fn();
      const items = [{ label: 'Edit', onClick }];
      const user = userEvent.setup({ delay: null });

      render(<KebabMenu items={items} />);

      const trigger = screen.getByRole('button', { name: 'Menu' });
      await user.click(trigger);
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }));

      await waitFor(() => {
        expect(document.activeElement).toBe(trigger);
      });
    });
  });

  describe('click outside', () => {
    it('closes menu when clicking outside', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <div>
          <KebabMenu items={defaultItems} />
          <button>Outside</button>
        </div>
      );

      await user.click(screen.getByRole('button', { name: 'Menu' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Outside' }));

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('does not close when clicking inside menu', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));
      const menu = screen.getByRole('menu');

      // Click on the menu panel itself (not on an item)
      await user.click(menu);

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('focuses first item when menu opens', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit' }));
      });
    });

    it('navigates down with ArrowDown key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit' }));
      });

      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Duplicate' }));

      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Delete' }));
    });

    it('wraps around when navigating past last item', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      // Navigate to last item
      await user.keyboard('{ArrowDown}{ArrowDown}');
      expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Delete' }));

      // Should wrap to first item
      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit' }));
    });

    it('navigates up with ArrowUp key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit' }));
      });

      // Should wrap to last item
      await user.keyboard('{ArrowUp}');
      expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Delete' }));
    });

    it('navigates to first item with Home key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));
      await user.keyboard('{ArrowDown}{ArrowDown}'); // Go to last item

      await user.keyboard('{Home}');
      expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit' }));
    });

    it('navigates to last item with End key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));
      // Wait for menu to open and focus first item
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit' }));
      });

      await user.keyboard('{End}');
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Delete' }));
      });
    });

    it('selects item with Enter key', async () => {
      const onClick = vi.fn();
      const items = [{ label: 'Edit', onClick }];
      const user = userEvent.setup({ delay: null });

      render(<KebabMenu items={items} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit' }));
      });

      await user.keyboard('{Enter}');

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('selects item with Space key', async () => {
      const onClick = vi.fn();
      const items = [{ label: 'Edit', onClick }];
      const user = userEvent.setup({ delay: null });

      render(<KebabMenu items={items} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit' }));
      });

      await user.keyboard(' ');

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('closes menu with Escape key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('returns focus to trigger after Escape', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      const trigger = screen.getByRole('button', { name: 'Menu' });
      await user.click(trigger);

      await user.keyboard('{Escape}');

      expect(document.activeElement).toBe(trigger);
    });

    it('closes menu on Tab key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await user.keyboard('{Tab}');

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('opens menu with ArrowDown on trigger', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      const trigger = screen.getByRole('button', { name: 'Menu' });
      trigger.focus();

      await user.keyboard('{ArrowDown}');

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('dangerous items', () => {
    it('applies dangerous class to items with isDangerous=true', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      const deleteItem = screen.getByRole('menuitem', { name: 'Delete' });
      expect(deleteItem).toHaveClass('kebab-menu-item-dangerous');
    });

    it('does not apply dangerous class to regular items', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      const editItem = screen.getByRole('menuitem', { name: 'Edit' });
      expect(editItem).not.toHaveClass('kebab-menu-item-dangerous');
    });
  });

  describe('icons', () => {
    it('renders icons when provided', async () => {
      const items = [
        {
          label: 'Edit',
          onClick: vi.fn(),
          icon: <span data-testid="edit-icon">E</span>,
        },
      ];
      const user = userEvent.setup({ delay: null });

      render(<KebabMenu items={items} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
    });

    it('does not render icon container when no icon provided', async () => {
      const items = [{ label: 'Edit', onClick: vi.fn() }];
      const user = userEvent.setup({ delay: null });

      render(<KebabMenu items={items} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      const menuItem = screen.getByRole('menuitem', { name: 'Edit' });
      expect(menuItem.querySelector('.kebab-menu-item-icon')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has correct role on menu container', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('has correct role on menu items', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(3);
    });

    it('has aria-haspopup on trigger', () => {
      render(<KebabMenu items={defaultItems} />);

      const trigger = screen.getByRole('button', { name: 'Menu' });
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('updates aria-expanded on trigger when menu opens/closes', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} />);

      const trigger = screen.getByRole('button', { name: 'Menu' });

      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('has aria-label on menu panel', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={defaultItems} ariaLabel="Actions menu" />);

      await user.click(screen.getByRole('button', { name: 'Actions menu' }));

      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-label', 'Actions menu');
    });
  });

  describe('empty state', () => {
    it('renders empty menu when no items provided', async () => {
      const user = userEvent.setup({ delay: null });
      render(<KebabMenu items={[]} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    });
  });

  describe('snapshot', () => {
    it('matches closed state snapshot', () => {
      const { container } = render(<KebabMenu items={defaultItems} />);
      expect(container).toMatchSnapshot();
    });

    it('matches open state snapshot', async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<KebabMenu items={defaultItems} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      expect(container).toMatchSnapshot();
    });

    it('matches snapshot with icons', async () => {
      const itemsWithIcons = [
        {
          label: 'Edit',
          onClick: vi.fn(),
          icon: (
            <svg data-testid="icon">
              <circle cx="8" cy="8" r="4" />
            </svg>
          ),
        },
        {
          label: 'Delete',
          onClick: vi.fn(),
          isDangerous: true,
          icon: (
            <svg data-testid="icon">
              <path d="M0 0" />
            </svg>
          ),
        },
      ];
      const user = userEvent.setup({ delay: null });
      const { container } = render(<KebabMenu items={itemsWithIcons} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      expect(container).toMatchSnapshot();
    });

    it('matches snapshot with custom trigger', async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(
        <KebabMenu items={defaultItems} trigger={<span>Actions</span>} ariaLabel="Custom actions" />
      );

      await user.click(screen.getByRole('button', { name: 'Custom actions' }));

      expect(container).toMatchSnapshot();
    });
  });
});
