/**
 * Utility to force clear all authentication data
 * Use this in browser console if you need to manually clear corrupted auth state
 */

export const clearAuthData = () => {
  console.log('[ClearAuthData] Starting complete data wipe...');

  // Clear all localStorage
  console.log('[ClearAuthData] Clearing localStorage...');
  localStorage.clear();

  // Clear all sessionStorage
  console.log('[ClearAuthData] Clearing sessionStorage...');
  sessionStorage.clear();

  // Clear all cookies (if any)
  console.log('[ClearAuthData] Clearing cookies...');
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });

  console.log('[ClearAuthData] All data cleared!');
  console.log('[ClearAuthData] Please refresh the page.');

  return 'Data cleared successfully! Please refresh the page.';
};

// Make it available globally in development
if (import.meta.env.DEV) {
  window.clearAuthData = clearAuthData;
}

export default clearAuthData;
