/**
 * Testes unitários — permissionService.js
 * Classe pura, sem dependências externas.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import permissionService from '../permissionService';

// Utilizadores de teste reutilizáveis
const USER_NORMAL = {
  profil: '1',
  permissions: ['docs.view', 'portal.access', 'operation.access'],
  interfaces: [100, 200, 300],
};

const USER_ADMIN = {
  profil: '0',
  permissions: [],
  interfaces: [],
};

describe('permissionService', () => {
  beforeEach(() => {
    permissionService.clearUser();
  });

  // ── setUser / clearUser ────────────────────────────────────────────────────

  describe('setUser / clearUser', () => {
    it('sem utilizador definido, não está autenticado', () => {
      expect(permissionService.isAuthenticated()).toBe(false);
    });

    it('após setUser, está autenticado', () => {
      permissionService.setUser(USER_NORMAL);
      expect(permissionService.isAuthenticated()).toBe(true);
    });

    it('após clearUser, volta a não estar autenticado', () => {
      permissionService.setUser(USER_NORMAL);
      permissionService.clearUser();
      expect(permissionService.isAuthenticated()).toBe(false);
    });
  });

  // ── hasPermission ──────────────────────────────────────────────────────────

  describe('hasPermission()', () => {
    it('retorna false quando não há utilizador', () => {
      expect(permissionService.hasPermission('docs.view')).toBe(false);
    });

    it('retorna true para permissão string que o utilizador tem', () => {
      permissionService.setUser(USER_NORMAL);
      expect(permissionService.hasPermission('docs.view')).toBe(true);
    });

    it('retorna false para permissão string que o utilizador não tem', () => {
      permissionService.setUser(USER_NORMAL);
      expect(permissionService.hasPermission('admin.only')).toBe(false);
    });

    it('admin (profil=0) tem sempre acesso independentemente da permissão', () => {
      permissionService.setUser(USER_ADMIN);
      expect(permissionService.hasPermission('qualquer.permissao')).toBe(true);
      expect(permissionService.hasPermission('admin.only')).toBe(true);
    });

    it('suporta permissão numérica (legacy) via interfaces', () => {
      permissionService.setUser(USER_NORMAL);
      expect(permissionService.hasPermission(100)).toBe(true);
      expect(permissionService.hasPermission(999)).toBe(false);
    });

    it('retorna false para tipo desconhecido de permissão', () => {
      permissionService.setUser(USER_NORMAL);
      expect(permissionService.hasPermission(null)).toBe(false);
    });
  });

  // ── hasAnyPermission ───────────────────────────────────────────────────────

  describe('hasAnyPermission()', () => {
    it('retorna false para array vazio', () => {
      permissionService.setUser(USER_NORMAL);
      expect(permissionService.hasAnyPermission([])).toBe(false);
    });

    it('retorna true se pelo menos uma permissão existe', () => {
      permissionService.setUser(USER_NORMAL);
      expect(
        permissionService.hasAnyPermission(['nenhuma', 'docs.view'])
      ).toBe(true);
    });

    it('retorna false quando nenhuma permissão existe', () => {
      permissionService.setUser(USER_NORMAL);
      expect(
        permissionService.hasAnyPermission(['admin.only', 'super.admin'])
      ).toBe(false);
    });
  });

  // ── hasAllPermissions ──────────────────────────────────────────────────────

  describe('hasAllPermissions()', () => {
    it('retorna true quando todas as permissões existem', () => {
      permissionService.setUser(USER_NORMAL);
      expect(
        permissionService.hasAllPermissions(['docs.view', 'portal.access'])
      ).toBe(true);
    });

    it('retorna false quando pelo menos uma permissão falta', () => {
      permissionService.setUser(USER_NORMAL);
      expect(
        permissionService.hasAllPermissions(['docs.view', 'admin.only'])
      ).toBe(false);
    });

    it('retorna false para array vazio', () => {
      permissionService.setUser(USER_NORMAL);
      expect(permissionService.hasAllPermissions([])).toBe(false);
    });
  });

  // ── checkBatchPermissions ──────────────────────────────────────────────────

  describe('checkBatchPermissions()', () => {
    it('retorna mapa de booleanos correcto', () => {
      permissionService.setUser(USER_NORMAL);
      const result = permissionService.checkBatchPermissions({
        canViewDocs: 'docs.view',
        canAccessPortal: 'portal.access',
        canAdmin: 'admin.only',
      });
      expect(result).toEqual({
        canViewDocs: true,
        canAccessPortal: true,
        canAdmin: false,
      });
    });
  });

  // ── helpers ────────────────────────────────────────────────────────────────

  describe('helpers', () => {
    it('getUserPermissions retorna array de strings do utilizador', () => {
      permissionService.setUser(USER_NORMAL);
      expect(permissionService.getUserPermissions()).toEqual(USER_NORMAL.permissions);
    });

    it('getUserPermissions retorna array vazio quando sem utilizador', () => {
      expect(permissionService.getUserPermissions()).toEqual([]);
    });

    it('isAdmin retorna true para profil=0', () => {
      permissionService.setUser(USER_ADMIN);
      expect(permissionService.isAdmin()).toBe(true);
    });

    it('isAdmin retorna false para profil!=0', () => {
      permissionService.setUser(USER_NORMAL);
      expect(permissionService.isAdmin()).toBe(false);
    });

    it('getUserProfile retorna o perfil do utilizador', () => {
      permissionService.setUser(USER_NORMAL);
      expect(permissionService.getUserProfile()).toBe('1');
    });
  });
});
