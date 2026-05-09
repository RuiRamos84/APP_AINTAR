/**
 * Testes de integração — ProtectedRoute.jsx
 * Cobre os 4 cenários de acesso: loading, não autenticado, sem permissão, com permissão.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/core/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/core/contexts/PermissionContext', () => ({
  usePermissionContext: vi.fn(),
}));

vi.mock('@/shared/components/feedback', () => ({
  Loading: ({ message }) => (
    <div data-testid="loading-spinner">{message}</div>
  ),
}));

vi.mock('@/core/config/routeConfig', () => ({
  getRoutePermission: vi.fn(() => null),
}));

// ── Imports após mocks ─────────────────────────────────────────────────────────

import { useAuth } from '@/core/contexts/AuthContext';
import { usePermissionContext } from '@/core/contexts/PermissionContext';
import { getRoutePermission } from '@/core/config/routeConfig';
import { ProtectedRoute } from '../components/ProtectedRoute';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderRoute(ui, { path = '/dashboard' } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

const mockUser = { user_id: 42, profil: '1', user_name: 'Teste' };

// ── Testes ────────────────────────────────────────────────────────────────────

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRoutePermission.mockReturnValue(null);
  });

  // ── Loading ──────────────────────────────────────────────────────────────

  it('mostra spinner enquanto autenticação está a carregar', () => {
    useAuth.mockReturnValue({ user: null, isLoading: true });
    usePermissionContext.mockReturnValue({ hasPermission: vi.fn(), initialized: true });

    renderRoute(<ProtectedRoute><div>Conteúdo</div></ProtectedRoute>);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument();
  });

  it('mostra spinner enquanto permissões não estão inicializadas', () => {
    useAuth.mockReturnValue({ user: mockUser, isLoading: false });
    usePermissionContext.mockReturnValue({ hasPermission: vi.fn(), initialized: false });

    renderRoute(<ProtectedRoute><div>Conteúdo</div></ProtectedRoute>);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  // ── Não autenticado ──────────────────────────────────────────────────────

  it('não renderiza conteúdo quando utilizador não está autenticado', () => {
    useAuth.mockReturnValue({ user: null, isLoading: false });
    usePermissionContext.mockReturnValue({
      hasPermission: vi.fn(() => false),
      initialized: true,
    });

    renderRoute(
      <ProtectedRoute><div>Área Privada</div></ProtectedRoute>
    );

    expect(screen.queryByText('Área Privada')).not.toBeInTheDocument();
  });

  // ── Sem permissão ────────────────────────────────────────────────────────

  it('não renderiza conteúdo quando utilizador não tem permissão', () => {
    useAuth.mockReturnValue({ user: mockUser, isLoading: false });
    usePermissionContext.mockReturnValue({
      hasPermission: vi.fn(() => false),
      initialized: true,
    });

    renderRoute(
      <ProtectedRoute requiredPermission="admin.only">
        <div>Área Admin</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Área Admin')).not.toBeInTheDocument();
  });

  it('usa a permissão do routeConfig quando não é passada via prop', () => {
    getRoutePermission.mockReturnValue('operation.access');
    const hasPermission = vi.fn(() => false);
    useAuth.mockReturnValue({ user: mockUser, isLoading: false });
    usePermissionContext.mockReturnValue({ hasPermission, initialized: true });

    renderRoute(
      <ProtectedRoute><div>Operação</div></ProtectedRoute>,
      { path: '/operation' }
    );

    expect(hasPermission).toHaveBeenCalledWith('operation.access');
    expect(screen.queryByText('Operação')).not.toBeInTheDocument();
  });

  // ── Com permissão ────────────────────────────────────────────────────────

  it('renderiza children quando utilizador tem permissão', () => {
    useAuth.mockReturnValue({ user: mockUser, isLoading: false });
    usePermissionContext.mockReturnValue({
      hasPermission: vi.fn(() => true),
      initialized: true,
    });

    renderRoute(
      <ProtectedRoute requiredPermission="docs.view">
        <div>Documentos</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Documentos')).toBeInTheDocument();
  });

  it('renderiza children quando não é necessária nenhuma permissão', () => {
    useAuth.mockReturnValue({ user: mockUser, isLoading: false });
    usePermissionContext.mockReturnValue({
      hasPermission: vi.fn(() => false),
      initialized: true,
    });
    // routeConfig não exige permissão (getRoutePermission → null)

    renderRoute(
      <ProtectedRoute><div>Página Livre</div></ProtectedRoute>
    );

    expect(screen.getByText('Página Livre')).toBeInTheDocument();
  });

  it('admin (profil=0) acede mesmo com hasPermission=true por definição', () => {
    useAuth.mockReturnValue({
      user: { ...mockUser, profil: '0' },
      isLoading: false,
    });
    // permissionService.hasPermission devolve true para admin — simulado via mock
    usePermissionContext.mockReturnValue({
      hasPermission: vi.fn(() => true),
      initialized: true,
    });

    renderRoute(
      <ProtectedRoute requiredPermission="admin.only">
        <div>Área Admin</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Área Admin')).toBeInTheDocument();
  });
});
