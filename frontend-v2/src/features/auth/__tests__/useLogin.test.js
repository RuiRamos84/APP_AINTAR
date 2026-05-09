/**
 * Testes unitários — useLogin.js
 * Hook de formulário de login com validação Zod.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/core/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/core/services/notification', () => ({
  notification: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

// ── Imports após mocks ─────────────────────────────────────────────────────────

import { useAuth } from '@/core/contexts/AuthContext';
import { notification } from '@/core/services/notification';
import { useLogin } from '../hooks/useLogin';

// ── Constantes ────────────────────────────────────────────────────────────────

const VALID_FORM = { username: 'utilizador', password: 'password123' };

// ── Testes ────────────────────────────────────────────────────────────────────

describe('useLogin', () => {
  const mockLoginUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ loginUser: mockLoginUser });
  });

  // ── Estado inicial ────────────────────────────────────────────────────────

  describe('estado inicial', () => {
    it('campos vazios, sem erros, não submetendo', () => {
      const { result } = renderHook(() => useLogin());
      expect(result.current.formData.username).toBe('');
      expect(result.current.formData.password).toBe('');
      expect(result.current.errors).toEqual({});
      expect(result.current.isLoading).toBe(false);
    });
  });

  // ── updateField ───────────────────────────────────────────────────────────

  describe('updateField()', () => {
    it('actualiza o valor do campo', () => {
      const { result } = renderHook(() => useLogin());

      act(() => result.current.updateField('username', 'rui.ramos'));

      expect(result.current.formData.username).toBe('rui.ramos');
    });

    it('limpa o erro do campo ao actualizar', () => {
      const { result } = renderHook(() => useLogin());

      // Criar erro via validate
      act(() => result.current.validate());
      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

      // Actualizar campo limpa o seu erro
      act(() => result.current.updateField('username', 'alguem'));
      expect(result.current.errors.username).toBeUndefined();
    });
  });

  // ── validate ──────────────────────────────────────────────────────────────

  describe('validate()', () => {
    it('retorna false e define erros com campos vazios', () => {
      const { result } = renderHook(() => useLogin());

      let isValid;
      act(() => { isValid = result.current.validate(); });

      expect(isValid).toBe(false);
      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);
    });

    it('retorna true com username e password preenchidos', () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.updateField('username', VALID_FORM.username);
        result.current.updateField('password', VALID_FORM.password);
      });

      let isValid;
      act(() => { isValid = result.current.validate(); });

      expect(isValid).toBe(true);
      expect(result.current.errors).toEqual({});
    });

    it('hasError e getFieldError reflectem os erros correctamente', () => {
      const { result } = renderHook(() => useLogin());

      act(() => result.current.validate());

      expect(result.current.hasError('username')).toBe(true);
      expect(result.current.getFieldError('username')).toBeDefined();
    });
  });

  // ── handleSubmit ──────────────────────────────────────────────────────────

  describe('handleSubmit()', () => {
    it('não chama loginUser quando os dados são inválidos', async () => {
      const { result } = renderHook(() => useLogin());

      await act(async () => { await result.current.handleSubmit(); });

      expect(mockLoginUser).not.toHaveBeenCalled();
    });

    it('retorna { success: false } quando dados são inválidos', async () => {
      const { result } = renderHook(() => useLogin());

      let response;
      await act(async () => { response = await result.current.handleSubmit(); });

      expect(response.success).toBe(false);
    });

    it('chama loginUser com as credenciais correctas', async () => {
      mockLoginUser.mockResolvedValue({ user_id: 42 });
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.updateField('username', VALID_FORM.username);
        result.current.updateField('password', VALID_FORM.password);
      });

      await act(async () => { await result.current.handleSubmit(); });

      expect(mockLoginUser).toHaveBeenCalledWith(
        VALID_FORM.username,
        VALID_FORM.password
      );
    });

    it('retorna { success: true } após login bem-sucedido', async () => {
      mockLoginUser.mockResolvedValue({ user_id: 42 });
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.updateField('username', VALID_FORM.username);
        result.current.updateField('password', VALID_FORM.password);
      });

      let response;
      await act(async () => { response = await result.current.handleSubmit(); });

      expect(response.success).toBe(true);
    });

    it('mostra notificação de erro quando login falha', async () => {
      mockLoginUser.mockRejectedValue(new Error('Credenciais inválidas.'));
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.updateField('username', VALID_FORM.username);
        result.current.updateField('password', 'errada');
      });

      await act(async () => { await result.current.handleSubmit(); });

      expect(notification.error).toHaveBeenCalledWith('Credenciais inválidas.');
    });

    it('retorna { success: false, error } quando login falha', async () => {
      mockLoginUser.mockRejectedValue(new Error('Credenciais inválidas.'));
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.updateField('username', VALID_FORM.username);
        result.current.updateField('password', 'errada');
      });

      let response;
      await act(async () => { response = await result.current.handleSubmit(); });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Credenciais inválidas.');
    });

    it('isLoading=true durante submissão, false após conclusão', async () => {
      let resolveLogin;
      mockLoginUser.mockReturnValue(
        new Promise((r) => { resolveLogin = r; })
      );
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.updateField('username', VALID_FORM.username);
        result.current.updateField('password', VALID_FORM.password);
      });

      act(() => { result.current.handleSubmit(); });
      expect(result.current.isLoading).toBe(true);

      await act(async () => { resolveLogin({ user_id: 42 }); });
      expect(result.current.isLoading).toBe(false);
    });
  });

  // ── reset ─────────────────────────────────────────────────────────────────

  describe('reset()', () => {
    it('limpa os campos do formulário', () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.updateField('username', 'alguem');
        result.current.updateField('password', 'algo');
      });

      act(() => result.current.reset());

      expect(result.current.formData.username).toBe('');
      expect(result.current.formData.password).toBe('');
    });

    it('limpa os erros de validação', () => {
      const { result } = renderHook(() => useLogin());

      act(() => result.current.validate());
      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

      act(() => result.current.reset());
      expect(result.current.errors).toEqual({});
    });
  });
});
