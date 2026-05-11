/**
 * Testes de integração — AuthContext.jsx
 * Cobre: estado inicial, loginUser, logoutUser, subscribe reactivo, useAuth fora do provider.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Hoisted mocks (devem ser definidos antes de vi.mock) ──────────────────────

const mockNavigate = vi.hoisted(() => vi.fn());
const mockQueryClear = vi.hoisted(() => vi.fn());

// Captura o listener registado via subscribe para simular mudanças de estado
let capturedListener = null;

const mockAuthManager = vi.hoisted(() => ({
  authState: {
    getState: vi.fn(() => ({
      user: null,
      isLoading: false,
      isLoggingOut: false,
    })),
  },
  subscribe: vi.fn((listener) => {
    capturedListener = listener;
    return vi.fn(); // unsubscribe fn
  }),
  login: vi.fn(),
  logout: vi.fn(),
  tokenManager: { refreshToken: vi.fn() },
  toggleDarkMode: vi.fn(),
  toggleVacationStatus: vi.fn(),
}));

// ── vi.mock (hoistado automaticamente para o topo do ficheiro) ────────────────

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/home' }),
  };
});

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useQueryClient: () => ({ clear: mockQueryClear }),
  };
});

vi.mock('@/services/permissionService', () => ({
  default: { setUser: vi.fn(), clearUser: vi.fn() },
}));

vi.mock('@/core/config/appContext', () => ({
  IS_PORTAL: false,
}));

vi.mock('@/services/auth/AuthManager', () => ({
  default: mockAuthManager,
}));

// ── Imports após mocks ─────────────────────────────────────────────────────────

import { AuthProvider, useAuth } from '@/core/contexts/AuthContext';

// ── Wrapper para renderHook ────────────────────────────────────────────────────

function Wrapper({ children }) {
  return (
    <MemoryRouter initialEntries={['/home']}>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedListener = null;

    // Restaurar estado inicial padrão
    mockAuthManager.authState.getState.mockReturnValue({
      user: null,
      isLoading: false,
      isLoggingOut: false,
    });
    mockAuthManager.subscribe.mockImplementation((listener) => {
      capturedListener = listener;
      return vi.fn();
    });
  });

  // ── useAuth fora do provider ──────────────────────────────────────────────

  describe('useAuth() fora do provider', () => {
    it('lança erro com mensagem clara', () => {
      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth must be used within AuthProvider'
      );
    });
  });

  // ── Estado inicial ─────────────────────────────────────────────────────────

  describe('estado inicial', () => {
    it('user=null e isAuthenticated=false quando não há sessão guardada', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('isAuthenticated=true quando authManager tem utilizador na inicialização', () => {
      const mockUser = { user_id: 42, user_name: 'Teste', profil: '1' };
      mockAuthManager.authState.getState.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isLoggingOut: false,
      });

      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('todas as funções necessárias estão presentes no contexto', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

      expect(typeof result.current.loginUser).toBe('function');
      expect(typeof result.current.logoutUser).toBe('function');
      expect(typeof result.current.refreshToken).toBe('function');
      expect(typeof result.current.toggleDarkMode).toBe('function');
      expect(typeof result.current.toggleVacationStatus).toBe('function');
    });
  });

  // ── loginUser ─────────────────────────────────────────────────────────────

  describe('loginUser()', () => {
    it('chama authManager.login com as credenciais correctas', async () => {
      mockAuthManager.login.mockResolvedValue({ user_id: 42 });
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.loginUser('utilizador', 'password123');
      });

      expect(mockAuthManager.login).toHaveBeenCalledWith('utilizador', 'password123');
    });

    it('navega para /home após login bem-sucedido (backoffice)', async () => {
      mockAuthManager.login.mockResolvedValue({ user_id: 42 });
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.loginUser('utilizador', 'password123');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });

    it('propaga o erro quando authManager.login rejeita', async () => {
      mockAuthManager.login.mockRejectedValue(new Error('Credenciais inválidas.'));
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

      await expect(
        act(async () => result.current.loginUser('user', 'wrong'))
      ).rejects.toThrow('Credenciais inválidas.');
    });
  });

  // ── logoutUser ────────────────────────────────────────────────────────────

  describe('logoutUser()', () => {
    it('chama authManager.logout', async () => {
      mockAuthManager.logout.mockResolvedValue();
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

      await act(async () => { await result.current.logoutUser(); });

      expect(mockAuthManager.logout).toHaveBeenCalled();
    });

    it('limpa a query cache do React Query no logout', async () => {
      mockAuthManager.logout.mockResolvedValue();
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

      await act(async () => { await result.current.logoutUser(); });

      expect(mockQueryClear).toHaveBeenCalled();
    });

    it('navega para / após logout (backoffice, sem sessão expirada)', async () => {
      mockAuthManager.logout.mockResolvedValue();
      // Garantir que sessionStorage não tem session_expired
      sessionStorage.removeItem('session_expired');
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

      await act(async () => { await result.current.logoutUser(); });

      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('navega para /login com state sessionExpired quando sessão expirou', async () => {
      mockAuthManager.logout.mockResolvedValue();
      sessionStorage.setItem('session_expired', 'true');
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

      await act(async () => { await result.current.logoutUser(); });

      expect(mockNavigate).toHaveBeenCalledWith(
        '/login',
        { replace: true, state: { sessionExpired: true } }
      );
      sessionStorage.removeItem('session_expired');
    });

    it('navega mesmo quando authManager.logout rejeita (logout resiliente)', async () => {
      mockAuthManager.logout.mockRejectedValue(new Error('Erro de rede'));
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

      // Não deve lançar exceção
      await act(async () => { await result.current.logoutUser(); });

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  // ── subscribe / estado reactivo ───────────────────────────────────────────

  describe('subscribe / estado reactivo', () => {
    it('actualiza user quando o AuthManager notifica mudança de estado', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
      expect(result.current.user).toBeNull();

      const newUser = { user_id: 42, user_name: 'Teste' };
      act(() => {
        capturedListener({
          user: newUser,
          isLoading: false,
          isLoggingOut: false,
        });
      });

      expect(result.current.user).toEqual(newUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('limpa user quando o AuthManager notifica logout', () => {
      // Começar com utilizador autenticado
      mockAuthManager.authState.getState.mockReturnValue({
        user: { user_id: 42 },
        isLoading: false,
        isLoggingOut: false,
      });

      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
      expect(result.current.user).not.toBeNull();

      // Simular logout via subscriber
      act(() => {
        capturedListener({ user: null, isLoading: false, isLoggingOut: false });
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('cancela a subscrição ao desmontar o provider (sem memory leaks)', () => {
      const mockUnsubscribe = vi.fn();
      mockAuthManager.subscribe.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useAuth(), { wrapper: Wrapper });
      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  // ── toggleDarkMode ────────────────────────────────────────────────────────

  describe('toggleDarkMode()', () => {
    it('delega para authManager.toggleDarkMode', async () => {
      mockAuthManager.toggleDarkMode.mockResolvedValue();
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

      await act(async () => { await result.current.toggleDarkMode(); });

      expect(mockAuthManager.toggleDarkMode).toHaveBeenCalled();
    });
  });
});
