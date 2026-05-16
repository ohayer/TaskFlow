import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '../pages/DashboardPage';

vi.mock('../api/endpoints', () => ({
  projectsApi: {
    list: vi.fn().mockResolvedValue([
      { id: '1', name: 'Test Project', description: 'Hello', ownerId: 'u1', createdAt: '2026-01-01', memberCount: 3, taskCount: 5 },
    ]),
    create: vi.fn(),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heading "Twoje projekty"', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByRole('heading', { name: /Twoje projekty/i })).toBeInTheDocument();
  });

  it('renders project from API with name and counts', async () => {
    renderWithProviders(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
    expect(screen.getByText(/5 zadań/i)).toBeInTheDocument();
    expect(screen.getByText(/3 członków/i)).toBeInTheDocument();
  });
});
