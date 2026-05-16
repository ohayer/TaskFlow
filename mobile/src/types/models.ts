export type TaskItemStatus = 0 | 1 | 2 | 3 | 4;            // Todo / InProgress / InReview / Done / Cancelled

export const TaskStatusLabels: Record<TaskItemStatus, string> = {
  0: 'Todo',
  1: 'In Progress',
  2: 'In Review',
  3: 'Done',
  4: 'Cancelled',
};

export type NotificationChannel = 0 | 1 | 2;              // Email / Sms / InApp

export interface Project {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  memberCount: number;
  taskCount: number;
}

export interface TaskItem {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskItemStatus;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  notificationPreference: NotificationChannel;
}

export interface CreateProjectDto { name: string; description?: string | null; }
export interface UpdateProjectDto { name: string; description?: string | null; }
export interface CreateTaskDto { title: string; description?: string | null; assigneeId?: string | null; dueDate?: string | null; }
export interface UpdateTaskDto { title: string; description?: string | null; status: TaskItemStatus; assigneeId?: string | null; dueDate?: string | null; }
