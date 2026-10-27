import { useState, useCallback } from 'react';
import { getErrorMsg } from '../utils/helpers';

export const useApi = (serviceFunc) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await serviceFunc(...args);
      setData(res.data);
      return res.data;
    } catch (err) {
      const msg = getErrorMsg(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [serviceFunc]);

  return { data, loading, error, execute, setData };
};
