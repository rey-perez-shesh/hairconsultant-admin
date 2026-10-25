"use client";

import {
  collection,
  doc,
  documentId,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";
import { recentDayKeys } from "./format";
import type { DailyStats, GlobalStats, Haircut } from "./model";

type Loadable<T> = { data: T; loading: boolean; error: string | null };

/** Live stats/global (null until the stats functions have written anything). */
export function useGlobalStats(): Loadable<GlobalStats | null> {
  const [state, setState] = useState<Loadable<GlobalStats | null>>({ data: null, loading: true, error: null });
  useEffect(
    () =>
      onSnapshot(
        doc(db, "stats/global"),
        (snap) => setState({ data: (snap.data() as GlobalStats | undefined) ?? null, loading: false, error: null }),
        (error) => setState({ data: null, loading: false, error: error.message }),
      ),
    [],
  );
  return state;
}

/** The last [days] statsDaily rows, oldest first, with missing days filled as zeros. */
export function useDailyStats(days: number): Loadable<DailyStats[]> {
  const [state, setState] = useState<Loadable<DailyStats[]>>({ data: [], loading: true, error: null });
  useEffect(() => {
    const keys = recentDayKeys(days);
    return onSnapshot(
      query(collection(db, "statsDaily"), where(documentId(), ">=", keys[0]), orderBy(documentId())),
      (snap) => {
        const byDay = new Map(snap.docs.map((d) => [d.id, d.data() as DailyStats]));
        setState({ data: keys.map((key) => ({ ...byDay.get(key), date: key })), loading: false, error: null });
      },
      (error) => setState({ data: [], loading: false, error: error.message }),
    );
  }, [days]);
  return state;
}

/** Live catalog, sorted the way the app shows it. */
export function useHaircuts(): Loadable<Haircut[]> {
  const [state, setState] = useState<Loadable<Haircut[]>>({ data: [], loading: true, error: null });
  useEffect(
    () =>
      onSnapshot(
        collection(db, "haircuts"),
        (snap) => {
          const rows = snap.docs.map((d) => ({ ...(d.data() as Omit<Haircut, "id">), id: d.id }));
          rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
          setState({ data: rows, loading: false, error: null });
        },
        (error) => setState({ data: [], loading: false, error: error.message }),
      ),
    [],
  );
  return state;
}
