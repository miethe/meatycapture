/**
 * Interactive Prompts Tests
 *
 * Tests the interactive prompts module:
 * - Basic text input prompts
 * - Prompts with default values
 * - Yes/no confirmation prompts
 * - List selection prompts
 * - Prompts with validation and retry
 * - Multi-value input prompts
 * - Ctrl+C handling (UserInterruptError)
 *
 * Each test verifies:
 * - Correct input handling
 * - Default value behavior
 * - Validation logic
 * - Error handling
 * - User interrupt (Ctrl+C) handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import the prompts module functions
import {
  prompt,
  promptWithDefault,
  confirm,
  selectFromList,
  promptWithValidation,
  promptMultiValue,
  UserInterruptError,
} from '@cli/interactive/prompts';

// Mock readline module at the top level
vi.mock('node:readline', () => {
  const mockQuestion = vi.fn();
  const mockClose = vi.fn();
  const mockOn = vi.fn();

  return {
    createInterface: vi.fn(() => ({
      question: mockQuestion,
      close: mockClose,
      on: mockOn,
    })),
    __mockQuestion: mockQuestion,
    __mockClose: mockClose,
    __mockOn: mockOn,
  };
});

describe('Interactive Prompts', () => {
  let mockQuestion: ReturnType<typeof vi.fn>;
  let mockClose: ReturnType<typeof vi.fn>;
  let mockOn: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Get the mock functions from the mocked module
    const readline = await import('node:readline');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockQuestion = (readline as any).__mockQuestion;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockClose = (readline as any).__mockClose;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOn = (readline as any).__mockOn;

    // Reset mocks before each test
    mockQuestion.mockReset();
    mockClose.mockReset();
    mockOn.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('prompt', () => {
    it('should prompt and return user input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('user input');
      });

      const result = await prompt('Enter name: ');

      expect(result).toBe('user input');
      expect(mockQuestion).toHaveBeenCalledWith('Enter name: ', expect.any(Function));
      expect(mockClose).toHaveBeenCalled();
    });

    it('should trim user input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('  user input  ');
      });

      const result = await prompt('Enter name: ');

      expect(result).toBe('user input');
    });

    it('should handle empty input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('');
      });

      const result = await prompt('Enter name: ');

      expect(result).toBe('');
    });

    it('should handle Ctrl+C (SIGINT)', async () => {
      mockOn.mockImplementation((event, handler) => {
        if (event === 'SIGINT') {
          // Immediately trigger the handler
          handler();
        }
      });

      mockQuestion.mockImplementation(() => {
        // Trigger SIGINT event
        const handler = mockOn.mock.calls.find((call) => call[0] === 'SIGINT')?.[1];
        if (handler) {
          handler();
        }
      });

      await expect(prompt('Enter name: ')).rejects.toThrow(UserInterruptError);
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('promptWithDefault', () => {
    it('should use default value when empty input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('');
      });

      const result = await promptWithDefault('Project name', 'my-project');

      expect(result).toBe('my-project');
      expect(mockQuestion).toHaveBeenCalledWith('Project name [my-project]: ', expect.any(Function));
    });

    it('should use user input when provided', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('custom-project');
      });

      const result = await promptWithDefault('Project name', 'my-project');

      expect(result).toBe('custom-project');
    });

    it('should trim whitespace before checking if empty', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('   ');
      });

      const result = await promptWithDefault('Project name', 'my-project');

      expect(result).toBe('my-project');
    });

    it('should display default in question prompt', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        expect(q).toBe('Path [./docs]: ');
        callback('');
      });

      await promptWithDefault('Path', './docs');

      expect(mockQuestion).toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    it('should return true for "y" input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('y');
      });

      const result = await confirm('Continue?');

      expect(result).toBe(true);
    });

    it('should return true for "yes" input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('yes');
      });

      const result = await confirm('Continue?');

      expect(result).toBe(true);
    });

    it('should return false for "n" input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('n');
      });

      const result = await confirm('Continue?');

      expect(result).toBe(false);
    });

    it('should return false for "no" input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('no');
      });

      const result = await confirm('Continue?');

      expect(result).toBe(false);
    });

    it('should be case insensitive', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('YES');
      });

      const result = await confirm('Continue?');

      expect(result).toBe(true);
    });

    it('should use default value (false) when empty input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('');
      });

      const result = await confirm('Continue?', false);

      expect(result).toBe(false);
    });

    it('should use default value (true) when empty input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('');
      });

      const result = await confirm('Continue?', true);

      expect(result).toBe(true);
    });

    it('should display [Y/n] when defaultYes is true', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        expect(q).toBe('Proceed? [Y/n]: ');
        callback('');
      });

      await confirm('Proceed?', true);

      expect(mockQuestion).toHaveBeenCalled();
    });

    it('should display [y/N] when defaultYes is false', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        expect(q).toBe('Proceed? [y/N]: ');
        callback('');
      });

      await confirm('Proceed?', false);

      expect(mockQuestion).toHaveBeenCalled();
    });
  });

  describe('selectFromList', () => {
    const items = [
      { id: 'a', name: 'Project A' },
      { id: 'b', name: 'Project B' },
      { id: 'c', name: 'Project C' },
    ];

    beforeEach(() => {
      // Mock console.log for list display
      vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return selected item by number', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('2');
      });

      const result = await selectFromList(items, (p) => p.name, 'Select project:');

      expect(result).toEqual(items[1]);
    });

    it('should display numbered list', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('1');
      });

      await selectFromList(items, (p) => p.name, 'Select project:');

      expect(console.log).toHaveBeenCalledWith('Select project:');
      expect(console.log).toHaveBeenCalledWith('  1. Project A');
      expect(console.log).toHaveBeenCalledWith('  2. Project B');
      expect(console.log).toHaveBeenCalledWith('  3. Project C');
    });

    it('should throw error for invalid selection (non-number)', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('invalid');
      });

      await expect(
        selectFromList(items, (p) => p.name, 'Select project:')
      ).rejects.toThrow('Invalid selection');
    });

    it('should throw error for out of range selection', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('5');
      });

      await expect(
        selectFromList(items, (p) => p.name, 'Select project:')
      ).rejects.toThrow('Invalid selection');
    });

    it('should throw error for zero selection', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('0');
      });

      await expect(
        selectFromList(items, (p) => p.name, 'Select project:')
      ).rejects.toThrow('Invalid selection');
    });

    it('should throw error for negative selection', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('-1');
      });

      await expect(
        selectFromList(items, (p) => p.name, 'Select project:')
      ).rejects.toThrow('Invalid selection');
    });

    it('should throw error for empty list', async () => {
      await expect(
        selectFromList([], (p: { name: string }) => p.name, 'Select project:')
      ).rejects.toThrow('Cannot select from empty list');
    });

    it('should handle first item selection', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('1');
      });

      const result = await selectFromList(items, (p) => p.name, 'Select project:');

      expect(result).toEqual(items[0]);
    });

    it('should handle last item selection', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('3');
      });

      const result = await selectFromList(items, (p) => p.name, 'Select project:');

      expect(result).toEqual(items[2]);
    });
  });

  describe('promptWithValidation', () => {
    beforeEach(() => {
      // Mock console.error for validation error messages
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return valid input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('valid-input');
      });

      const validator = (value: string) => (/^[a-z-]+$/.test(value) ? null : 'Must be kebab-case');
      const result = await promptWithValidation('Project ID', validator);

      expect(result).toBe('valid-input');
    });

    it('should retry on invalid input', async () => {
      let callCount = 0;
      mockQuestion.mockImplementation((q, callback) => {
        callCount++;
        if (callCount === 1) {
          callback('Invalid Input');
        } else {
          callback('valid-input');
        }
      });

      const validator = (value: string) => (/^[a-z-]+$/.test(value) ? null : 'Must be kebab-case');
      const result = await promptWithValidation('Project ID', validator);

      expect(result).toBe('valid-input');
      expect(console.error).toHaveBeenCalledWith('Error: Must be kebab-case');
      expect(mockQuestion).toHaveBeenCalledTimes(2);
    });

    it('should use default value when provided and input is empty', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('');
      });

      const validator = (value: string) => (value.length > 0 ? null : 'Cannot be empty');
      const result = await promptWithValidation('Project ID', validator, 'default-project');

      expect(result).toBe('default-project');
    });

    it('should validate default value', async () => {
      let callCount = 0;
      mockQuestion.mockImplementation((q, callback) => {
        callCount++;
        if (callCount === 1) {
          callback(''); // Use default (which is invalid)
        } else {
          callback('valid-value');
        }
      });

      const validator = (value: string) => (value !== 'bad-default' ? null : 'Bad default');
      const result = await promptWithValidation('Project ID', validator, 'bad-default');

      expect(result).toBe('valid-value');
      expect(console.error).toHaveBeenCalledWith('Error: Bad default');
    });

    it('should continue retrying until valid input', async () => {
      let callCount = 0;
      mockQuestion.mockImplementation((q, callback) => {
        callCount++;
        if (callCount < 3) {
          callback('invalid');
        } else {
          callback('valid-input');
        }
      });

      const validator = (value: string) =>
        value === 'valid-input' ? null : 'Must be valid-input';
      const result = await promptWithValidation('Input', validator);

      expect(result).toBe('valid-input');
      expect(mockQuestion).toHaveBeenCalledTimes(3);
      expect(console.error).toHaveBeenCalledTimes(2);
    });
  });

  describe('promptMultiValue', () => {
    it('should split comma-separated values', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('api, web, urgent');
      });

      const result = await promptMultiValue('Tags');

      expect(result).toEqual(['api', 'web', 'urgent']);
    });

    it('should trim whitespace from values', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('  api  ,  web  ,  urgent  ');
      });

      const result = await promptMultiValue('Tags');

      expect(result).toEqual(['api', 'web', 'urgent']);
    });

    it('should filter out empty values', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('api, , web, , urgent');
      });

      const result = await promptMultiValue('Tags');

      expect(result).toEqual(['api', 'web', 'urgent']);
    });

    it('should handle newline separator', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('api\nweb\nurgent');
      });

      const result = await promptMultiValue('Tags');

      expect(result).toEqual(['api', 'web', 'urgent']);
    });

    it('should handle mixed comma and newline separators', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('api, web\nurgent');
      });

      const result = await promptMultiValue('Tags');

      expect(result).toEqual(['api', 'web', 'urgent']);
    });

    it('should return empty array for empty input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('');
      });

      const result = await promptMultiValue('Tags');

      expect(result).toEqual([]);
    });

    it('should handle single value', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('api');
      });

      const result = await promptMultiValue('Tags');

      expect(result).toEqual(['api']);
    });

    it('should use custom separator when provided', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('api|web|urgent');
      });

      const result = await promptMultiValue('Tags', /\|/);

      expect(result).toEqual(['api', 'web', 'urgent']);
    });
  });

  describe('UserInterruptError', () => {
    it('should be throwable and catchable', () => {
      const error = new UserInterruptError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(UserInterruptError);
      expect(error.name).toBe('UserInterruptError');
      expect(error.message).toBe('User interrupted');
    });

    it('should be caught in try-catch', async () => {
      mockOn.mockImplementation((event, handler) => {
        if (event === 'SIGINT') {
          handler();
        }
      });

      mockQuestion.mockImplementation(() => {
        const handler = mockOn.mock.calls.find((call) => call[0] === 'SIGINT')?.[1];
        if (handler) {
          handler();
        }
      });

      let caught = false;
      try {
        await prompt('Enter name: ');
      } catch (error) {
        if (error instanceof UserInterruptError) {
          caught = true;
        }
      }

      expect(caught).toBe(true);
    });
  });
});
