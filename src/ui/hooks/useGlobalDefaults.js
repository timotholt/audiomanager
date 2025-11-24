import { useState, useEffect } from 'react';
import { getGlobalDefaults, updateGlobalDefaults } from '../api/client.js';

export function useGlobalDefaults() {
  const [defaults, setDefaults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDefaults = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getGlobalDefaults();
      setDefaults(result.defaults);
    } catch (err) {
      console.error('Failed to load global defaults:', err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const updateDefaults = async (contentType, newSettings) => {
    try {
      setError(null);
      const result = await updateGlobalDefaults(contentType, newSettings);
      setDefaults(result.defaults);
      return result;
    } catch (err) {
      console.error('Failed to update global defaults:', err);
      setError(err.message || String(err));
      throw err;
    }
  };

  useEffect(() => {
    loadDefaults();
  }, []);

  return {
    defaults,
    loading,
    error,
    updateDefaults,
    reload: loadDefaults
  };
}
