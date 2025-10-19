/**
 * 🗄️ SERVIÇO DE CACHE DE METADADOS DE PERMISSÕES
 *
 * Carrega metadados da BD uma vez e cacheia para uso em toda a aplicação
 */

class PermissionMetadataService {
  constructor() {
    this._metadataCache = new Map(); // Map<permissionId, metadata>
    this._loaded = false;
  }

  /**
   * Carrega metadados de todas as permissões
   * Esta função deve ser chamada quando as interfaces são carregadas
   */
  loadMetadata(interfacesFromAPI) {
    if (!interfacesFromAPI || !Array.isArray(interfacesFromAPI)) {
      console.warn('[PermissionMetadata] Nenhuma interface recebida da API');
      return;
    }

    this._metadataCache.clear();

    interfacesFromAPI.forEach(perm => {
      if (perm.pk) {
        this._metadataCache.set(perm.pk, {
          id: perm.pk,
          key: perm.name || perm.value || `unknown.${perm.pk}`,
          category: perm.category || 'Outros',
          label: perm.label || `Permissão ${perm.pk}`,
          description: perm.description || 'Sem descrição',
          icon: perm.icon || 'help_outline',
          requires: perm.requires || [],
          is_critical: perm.is_critical || false,
          is_sensitive: perm.is_sensitive || false,
          sort_order: perm.sort_order || 999,
        });
      }
    });

    this._loaded = true;
    console.log(`[PermissionMetadata] ${this._metadataCache.size} permissões carregadas da BD`);
  }

  /**
   * Obtém metadados de uma permissão do cache
   */
  getMetadata(permissionId) {
    return this._metadataCache.get(permissionId) || null;
  }

  /**
   * Verifica se os metadados já foram carregados
   */
  isLoaded() {
    return this._loaded;
  }

  /**
   * Obtém todas as permissões do cache
   */
  getAllMetadata() {
    return Array.from(this._metadataCache.values());
  }

  /**
   * Limpa o cache
   */
  clear() {
    this._metadataCache.clear();
    this._loaded = false;
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    return {
      loaded: this._loaded,
      total: this._metadataCache.size,
      categories: [...new Set(this.getAllMetadata().map(m => m.category))],
    };
  }
}

// Singleton instance
const permissionMetadataService = new PermissionMetadataService();

export default permissionMetadataService;
