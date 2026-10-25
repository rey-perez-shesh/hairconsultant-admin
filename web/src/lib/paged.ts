"use client";

import { getDocs, limit, query, startAfter, type Query, type QueryDocumentSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "./admin-api";

type Page<T> = { rows: T[]; cursor: QueryDocumentSnapshot | null; hasMore: boolean };

async function fetchPage<T>(base: Query, after: QueryDocumentSnapshot | null, size: number): Promise<Page<T>> {
  const snap = await getDocs(after ? query(base, startAfter(after), limit(size)) : query(base, limit(size)));
  return {
    rows: snap.docs.map((d) => ({ ...d.data(), id: d.id }) as T),
    cursor: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.size === size,
  };
}

/**
 * Cursor pagination over a Firestore query. Pass a memoized [base] (useMemo); a new query starts
 * again from the first page. [reload] refetches the first page after a change.
 */
export function usePagedQuery<T>(base: Query, pageSize = 25) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<Page<T> & { loadedFor: Query | null; loadedVersion: number }>({
    rows: [],
    cursor: null,
    hasMore: false,
    loadedFor: null,
    loadedVersion: -1,
  });
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let active = true;
    fetchPage<T>(base, null, pageSize)
      .then((page) => active && setState({ ...page, loadedFor: base, loadedVersion: version }))
      .catch((error) => {
        if (!active) return;
        toast.error(errorMessage(error));
        setState({ rows: [], cursor: null, hasMore: false, loadedFor: base, loadedVersion: version });
      });
    return () => {
      active = false;
    };
  }, [base, pageSize, version]);

  const loadMore = useCallback(async () => {
    if (!state.cursor) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage<T>(base, state.cursor, pageSize);
      setState((current) => ({ ...current, rows: [...current.rows, ...page.rows], cursor: page.cursor, hasMore: page.hasMore }));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  }, [base, pageSize, state.cursor]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const loading = state.loadedFor !== base || state.loadedVersion !== version;

  return { rows: state.rows, hasMore: state.hasMore, loading, loadingMore, loadMore, reload };
}
