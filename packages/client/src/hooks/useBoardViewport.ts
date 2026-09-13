import { useEffect, useMemo } from 'react';
import type { AppState } from '@excalidraw/excalidraw/types';

type Viewport = Pick<AppState, 'scrollX' | 'scrollY' | 'zoom'>;

function readViewport(key: string | null): Viewport | undefined {
  if (!key) return;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (
      saved?.version === 1 &&
      Number.isFinite(saved.scrollX) &&
      Number.isFinite(saved.scrollY) &&
      Number.isFinite(saved.zoom) &&
      saved.zoom > 0
    ) {
      return { scrollX: saved.scrollX, scrollY: saved.scrollY, zoom: { value: saved.zoom } };
    }
  } catch {
    // A corrupt entry or unavailable storage must not prevent opening the board.
  }
}

function createViewportStore(key: string | null) {
  const initialViewport = readViewport(key);
  const serialize = (viewport: Viewport) =>
    JSON.stringify({
      version: 1,
      scrollX: viewport.scrollX,
      scrollY: viewport.scrollY,
      zoom: viewport.zoom.value,
    });
  let written = initialViewport ? serialize(initialViewport) : null;
  let pending: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!key || pending === null || pending === written) return;
    try {
      localStorage.setItem(key, pending);
      written = pending;
    } catch {
      // Local view preferences are optional; scene persistence is independent.
    }
  };

  const rememberViewport = (state: AppState) => {
    if (
      !key ||
      state.isLoading ||
      !Number.isFinite(state.scrollX) ||
      !Number.isFinite(state.scrollY) ||
      !Number.isFinite(state.zoom.value) ||
      state.zoom.value <= 0
    )
      return;
    pending = serialize(state);
    // Throttle rather than debounce: long gestures also get periodic checkpoints.
    if (pending !== written && timer === undefined) timer = setTimeout(flush, 200);
  };

  return { initialViewport, rememberViewport, flush };
}

export function useBoardViewport(boardId?: string, shareId?: string) {
  const key = shareId
    ? `doska:viewport:share:${shareId}`
    : boardId
      ? `doska:viewport:board:${boardId}`
      : null;
  const store = useMemo(() => createViewportStore(key), [key]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') store.flush();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', store.flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', store.flush);
      store.flush();
    };
  }, [store]);

  return store;
}
