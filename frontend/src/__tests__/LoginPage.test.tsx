import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../pages/LoginPage';

const login = vi.fn(async () => ({ ok: true as const }));
const register = vi.fn(async () => ({ ok: true as const }));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    login,
    register,
    logout: vi.fn(),
  }),
}));

describe('LoginPage', () => {
  it('renders TaskFlow heading and login form', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { name: /TaskFlow/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Hasło/i)).toBeInTheDocument();
  });

  it('calls login when submitting login mode', async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Hasło/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /^Zaloguj$/i }));
    await waitFor(() => expect(login).toHaveBeenCalledWith('a@b.com', 'password123'));
  });

  it('switches to register mode and shows displayName field', () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /Rejestracja/i }));
    expect(screen.getByPlaceholderText(/Imię i nazwisko/i)).toBeInTheDocument();
  });
});
