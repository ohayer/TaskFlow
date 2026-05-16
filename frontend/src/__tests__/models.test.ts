import { describe, it, expect } from 'vitest';
import { TaskStatusLabels } from '../types/models';

describe('TaskStatusLabels', () => {
  it('maps all 5 statuses to human labels', () => {
    expect(TaskStatusLabels[0]).toBe('Todo');
    expect(TaskStatusLabels[1]).toBe('In Progress');
    expect(TaskStatusLabels[2]).toBe('In Review');
    expect(TaskStatusLabels[3]).toBe('Done');
    expect(TaskStatusLabels[4]).toBe('Cancelled');
  });

  it('has exactly 5 entries matching backend TaskItemStatus enum', () => {
    expect(Object.keys(TaskStatusLabels)).toHaveLength(5);
  });
});
