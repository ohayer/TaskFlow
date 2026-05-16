import { apiClient } from './client';
import type { Project, TaskItem, User, CreateProjectDto, UpdateProjectDto, CreateTaskDto, UpdateTaskDto, TaskItemStatus } from '../types/models';

export interface ProjectMemberDto {
  userId: string;
  email: string;
  displayName: string;
  role: number;                         // 0=Member, 1=Admin, 2=Owner
  joinedAt: string;
  isOwner: boolean;
}

export const projectsApi = {
  list: () => apiClient.get<Project[]>('/api/projects').then(r => r.data),
  get: (id: string) => apiClient.get<Project>(`/api/projects/${id}`).then(r => r.data),
  create: (dto: CreateProjectDto) => apiClient.post<Project>('/api/projects', dto).then(r => r.data),
  update: (id: string, dto: UpdateProjectDto) => apiClient.put<Project>(`/api/projects/${id}`, dto).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/api/projects/${id}`),
  addMember: (id: string, email: string, role: number) =>
    apiClient.post(`/api/projects/${id}/members`, { email, role }),
  listMembers: (id: string) => apiClient.get<ProjectMemberDto[]>(`/api/projects/${id}/members`).then(r => r.data),
  updateMemberRole: (id: string, userId: string, role: number) =>
    apiClient.patch(`/api/projects/${id}/members/${userId}`, { role }),
  removeMember: (id: string, userId: string) =>
    apiClient.delete(`/api/projects/${id}/members/${userId}`),
  memberAudit: (id: string, userId: string) =>
    apiClient.get<AuditEntryDto[]>(`/api/projects/${id}/members/${userId}/audit`).then(r => r.data),
};

export const tasksApi = {
  listByProject: (projectId: string, status?: TaskItemStatus) =>
    apiClient.get<TaskItem[]>(`/api/projects/${projectId}/tasks`, { params: status !== undefined ? { status } : {} }).then(r => r.data),
  get: (id: string) => apiClient.get<TaskItem>(`/api/tasks/${id}`).then(r => r.data),
  create: (projectId: string, dto: CreateTaskDto) => apiClient.post<TaskItem>(`/api/projects/${projectId}/tasks`, dto).then(r => r.data),
  update: (id: string, dto: UpdateTaskDto) => apiClient.put<TaskItem>(`/api/tasks/${id}`, dto).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/api/tasks/${id}`),
};

export const usersApi = {
  me: () => apiClient.get<User>('/api/users/me').then(r => r.data),
  updateNotificationPreference: (channel: number, phoneNumber?: string) =>
    apiClient.put('/api/users/me/notification-preference', { channel, phoneNumber }),
};

export interface ExportedReport {
  fileName: string;
  url: string;
  sizeBytes: number;
  createdAt: string;
}

export const exportsApi = {
  create: (projectId: string) => apiClient.post<ExportedReport>(`/api/projects/${projectId}/exports`).then(r => r.data),
  list: (projectId: string) => apiClient.get<ExportedReport[]>(`/api/projects/${projectId}/exports`).then(r => r.data),
  downloadUrl: (projectId: string, fileName: string) =>
    `${apiClient.defaults.baseURL}/api/projects/${projectId}/exports/${encodeURIComponent(fileName)}`,
};

export interface AttachmentDto {
  id: string;
  taskId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;                    // SAS-signed, time-limited 1h
  thumbnailUrl: string | null;
  aiTags: string[];
  aiCaption: string | null;
  uploadedAt: string;
}

export interface AuditEntryDto {
  id: string;
  action: string;
  performedById: string;
  performedByName: string | null;
  performedByEmail: string | null;
  timestamp: string;
  previousState: string | null;
  newState: string | null;
}

export const attachmentsApi = {
  upload: (taskId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<AttachmentDto>(`/api/tasks/${taskId}/attachments`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  list: (taskId: string) => apiClient.get<AttachmentDto[]>(`/api/tasks/${taskId}/attachments`).then(r => r.data),
  delete: (taskId: string, attachmentId: string) =>
    apiClient.delete(`/api/tasks/${taskId}/attachments/${attachmentId}`),
  audit: (taskId: string) => apiClient.get<AuditEntryDto[]>(`/api/tasks/${taskId}/audit`).then(r => r.data),
};
