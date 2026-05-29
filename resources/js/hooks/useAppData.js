import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api.js";

const emptyState = {
  clients: [],
  products: [],
  proposals: [],
  settings: null,
  rep: null,
  nextProposalId: null,
};

export function useAppData({ enabled = false } = {}) {
  const [state, setState] = useState(emptyState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setError(null);
    setReady(false);
    try {
      const data = await api.getAppState();
      setState(data);
      setReady(true);
    } catch (err) {
      setError(err.message);
      setReady(false);
    }
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { state, ready, reload, error };
}
