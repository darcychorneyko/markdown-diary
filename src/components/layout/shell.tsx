import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_SIDEBAR_WIDTH = 280;
const DEFAULT_SPLITTER_WIDTH = 8;
const MIN_SIDEBAR_WIDTH = 180;
const MIN_CONTENT_WIDTH = 240;

type DragTarget = 'sidebar-editor' | 'editor-preview';

type DragState =
  | {
      target: DragTarget;
      startX: number;
      startSidebarWidth: number;
      startEditorWidth: number;
      startPreviewWidth: number;
    }
  | null;

function splitEvenly(width: number) {
  const left = Math.floor(width / 2);
  return { left, right: width - left };
}

function readPointerCoordinate(source: unknown, key: 'clientX' | 'pageX' | 'screenX') {
  if (!source || typeof source !== 'object') {
    return null;
  }

  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readPointerX(event: unknown) {
  return (
    readPointerCoordinate(event, 'clientX') ??
    readPointerCoordinate(event, 'pageX') ??
    readPointerCoordinate(event, 'screenX') ??
    readPointerCoordinate((event as { nativeEvent?: unknown } | null)?.nativeEvent, 'clientX') ??
    readPointerCoordinate((event as { nativeEvent?: unknown } | null)?.nativeEvent, 'pageX') ??
    readPointerCoordinate((event as { nativeEvent?: unknown } | null)?.nativeEvent, 'screenX') ??
    null
  );
}

function measureShellWidth(element: HTMLElement | null) {
  const measuredWidth = element?.getBoundingClientRect().width ?? 0;
  if (measuredWidth > 0) {
    return measuredWidth;
  }

  if (typeof window !== 'undefined' && window.innerWidth > 0) {
    return window.innerWidth;
  }

  return null;
}

function resolveInitialPaneWidths(
  shellWidth: number | null,
  sidebarWidth: number,
  editorWidth: number | null,
  previewWidth: number | null,
  isSidebarCollapsed: boolean
) {
  const resolvedSidebarWidth = isSidebarCollapsed ? 0 : sidebarWidth;
  const resolvedLeftSplitterWidth = isSidebarCollapsed ? 0 : DEFAULT_SPLITTER_WIDTH;
  const availableContentWidth =
    shellWidth === null
      ? null
      : Math.max(
          MIN_CONTENT_WIDTH * 2,
          shellWidth - resolvedSidebarWidth - resolvedLeftSplitterWidth - DEFAULT_SPLITTER_WIDTH
        );

  let resolvedEditorWidth = editorWidth;
  let resolvedPreviewWidth = previewWidth;

  if (resolvedEditorWidth === null && resolvedPreviewWidth === null) {
    if (availableContentWidth === null) {
      resolvedEditorWidth = MIN_CONTENT_WIDTH;
      resolvedPreviewWidth = MIN_CONTENT_WIDTH;
    } else {
      resolvedEditorWidth = Math.floor(availableContentWidth / 2);
      resolvedPreviewWidth = availableContentWidth - resolvedEditorWidth;
    }
  } else if (resolvedEditorWidth === null) {
    resolvedPreviewWidth = resolvedPreviewWidth ?? MIN_CONTENT_WIDTH;
    resolvedEditorWidth =
      availableContentWidth === null
        ? resolvedPreviewWidth
        : Math.max(MIN_CONTENT_WIDTH, availableContentWidth - resolvedPreviewWidth);
  } else if (resolvedPreviewWidth === null) {
    resolvedPreviewWidth =
      availableContentWidth === null
        ? resolvedEditorWidth
        : Math.max(MIN_CONTENT_WIDTH, availableContentWidth - resolvedEditorWidth);
  }

  return {
    sidebarWidth: resolvedSidebarWidth,
    editorWidth: resolvedEditorWidth,
    previewWidth: resolvedPreviewWidth
  };
}

function resolveDragStartX(
  target: DragTarget,
  pointerX: number | null,
  widths: { sidebarWidth: number; editorWidth: number }
) {
  if (pointerX !== null) {
    return pointerX;
  }

  if (target === 'sidebar-editor') {
    return widths.sidebarWidth;
  }

  return widths.sidebarWidth + DEFAULT_SPLITTER_WIDTH + widths.editorWidth;
}

function redistributeWidths(
  leftWidth: number | null,
  rightWidth: number | null,
  delta: number
) {
  if (leftWidth === null || rightWidth === null) {
    return { leftWidth, rightWidth, appliedDelta: delta };
  }

  if (delta >= 0) {
    const { left, right } = splitEvenly(delta);

    return {
      leftWidth: leftWidth + left,
      rightWidth: rightWidth + right,
      appliedDelta: delta
    };
  }

  const widthToReclaim = Math.abs(delta);
  const { left: initialLeft, right: initialRight } = splitEvenly(widthToReclaim);
  const maxLeftReduction = Math.max(0, leftWidth - MIN_CONTENT_WIDTH);
  const maxRightReduction = Math.max(0, rightWidth - MIN_CONTENT_WIDTH);

  let leftReduction = Math.min(initialLeft, maxLeftReduction);
  let rightReduction = Math.min(initialRight, maxRightReduction);
  let remainingWidth = widthToReclaim - leftReduction - rightReduction;

  if (remainingWidth > 0) {
    const availableLeft = maxLeftReduction - leftReduction;
    const extraLeft = Math.min(remainingWidth, availableLeft);
    leftReduction += extraLeft;
    remainingWidth -= extraLeft;
  }

  if (remainingWidth > 0) {
    const availableRight = maxRightReduction - rightReduction;
    const extraRight = Math.min(remainingWidth, availableRight);
    rightReduction += extraRight;
  }

  return {
    leftWidth: leftWidth - leftReduction,
    rightWidth: rightWidth - rightReduction,
    appliedDelta: -(leftReduction + rightReduction)
  };
}

export function Shell({
  sidebar,
  editor,
  preview
}: {
  sidebar: React.ReactNode;
  editor: React.ReactNode;
  preview: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [editorWidth, setEditorWidth] = useState<number | null>(null);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [lastExpandedSidebarWidth, setLastExpandedSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [dragState, setDragState] = useState<DragState>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  const dragStateRef = useRef<DragState>(null);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const activeDragState = dragStateRef.current;
      if (!activeDragState) {
        return;
      }

      const pointerX = readPointerX(event);
      if (pointerX === null) {
        return;
      }

      const delta = pointerX - activeDragState.startX;

      if (activeDragState.target === 'sidebar-editor') {
        const minDelta = MIN_SIDEBAR_WIDTH - activeDragState.startSidebarWidth;
        const maxDelta = activeDragState.startEditorWidth - MIN_CONTENT_WIDTH;
        const appliedDelta = Math.min(Math.max(delta, minDelta), maxDelta);

        setSidebarWidth(activeDragState.startSidebarWidth + appliedDelta);
        setEditorWidth(activeDragState.startEditorWidth - appliedDelta);
        return;
      }

      const minDelta = MIN_CONTENT_WIDTH - activeDragState.startEditorWidth;
      const maxDelta = activeDragState.startPreviewWidth - MIN_CONTENT_WIDTH;
      const appliedDelta = Math.min(Math.max(delta, minDelta), maxDelta);

      setEditorWidth(activeDragState.startEditorWidth + appliedDelta);
      setPreviewWidth(activeDragState.startPreviewWidth - appliedDelta);
    }

    function handlePointerUp() {
      dragStateRef.current = null;
      setDragState(null);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const gridTemplateColumns = useMemo(() => {
    const sidebarColumn = isSidebarCollapsed ? '0px' : `${sidebarWidth}px`;
    const leftSplitterColumn = isSidebarCollapsed ? '0px' : `${DEFAULT_SPLITTER_WIDTH}px`;
    const editorColumn = editorWidth === null ? '1fr' : `${editorWidth}px`;
    const rightSplitterColumn = `${DEFAULT_SPLITTER_WIDTH}px`;
    const previewColumn = previewWidth === null ? '1fr' : `${previewWidth}px`;

    return `${sidebarColumn} ${leftSplitterColumn} ${editorColumn} ${rightSplitterColumn} ${previewColumn}`;
  }, [editorWidth, isSidebarCollapsed, previewWidth, sidebarWidth]);

  function handleToggleSidebar() {
    const resolvedWidths = resolveInitialPaneWidths(
      measureShellWidth(shellRef.current),
      sidebarWidth,
      editorWidth,
      previewWidth,
      isSidebarCollapsed
    );

    if (isSidebarCollapsed) {
      const requestedOccupiedWidth = lastExpandedSidebarWidth + DEFAULT_SPLITTER_WIDTH;
      const redistributed = redistributeWidths(
        resolvedWidths.editorWidth,
        resolvedWidths.previewWidth,
        -requestedOccupiedWidth
      );
      const restoredSidebarWidth = Math.max(
        0,
        Math.abs(redistributed.appliedDelta) - DEFAULT_SPLITTER_WIDTH
      );

      setSidebarWidth(restoredSidebarWidth);
      setEditorWidth(redistributed.leftWidth);
      setPreviewWidth(redistributed.rightWidth);
      setIsSidebarCollapsed(false);
      return;
    }

    const freedWidth = sidebarWidth + DEFAULT_SPLITTER_WIDTH;
    const redistributed = redistributeWidths(
      resolvedWidths.editorWidth,
      resolvedWidths.previewWidth,
      freedWidth
    );

    setLastExpandedSidebarWidth(sidebarWidth);
    setSidebarWidth(0);
    setEditorWidth(redistributed.leftWidth);
    setPreviewWidth(redistributed.rightWidth);
    setIsSidebarCollapsed(true);
  }

  function captureDragState(target: DragTarget, event: {
    clientX?: number;
    pageX?: number;
    screenX?: number;
    nativeEvent?: unknown;
  }) {
    const resolvedWidths = resolveInitialPaneWidths(
      measureShellWidth(shellRef.current),
      sidebarWidth,
      editorWidth,
      previewWidth,
      isSidebarCollapsed
    );
    const pointerX = readPointerX(event);

    const nextDragState = {
      target,
      startX: resolveDragStartX(target, pointerX, resolvedWidths),
      startSidebarWidth: resolvedWidths.sidebarWidth,
      startEditorWidth: resolvedWidths.editorWidth,
      startPreviewWidth: resolvedWidths.previewWidth
    };

    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  }

  return (
    <main
      ref={shellRef}
      className={`app-shell${isSidebarCollapsed ? ' app-shell-sidebar-collapsed' : ''}`}
      aria-label="Markdown vault workspace"
      style={{ gridTemplateColumns }}
    >
      <header className="app-toolbar">
        <button
          type="button"
          className="sidebar-toggle"
          aria-expanded={!isSidebarCollapsed}
          aria-controls="vault-sidebar"
          aria-label={isSidebarCollapsed ? 'Expand vault sidebar' : 'Collapse vault sidebar'}
          onClick={handleToggleSidebar}
        >
          <span aria-hidden="true">{isSidebarCollapsed ? '▸' : '◂'}</span>
        </button>
      </header>
      <aside
        id="vault-sidebar"
        className={`sidebar${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}
        aria-label="Vault explorer"
      >
        {sidebar}
      </aside>
      <div
        className="pane-splitter"
        role="separator"
        aria-label="Resize vault and editor"
        onPointerDown={(event) => {
          captureDragState('sidebar-editor', event);
        }}
      />
      <section className="editor">
        {editor}
      </section>
      <div
        className="pane-splitter"
        role="separator"
        aria-label="Resize editor and preview"
        onPointerDown={(event) => {
          captureDragState('editor-preview', event);
        }}
      />
      <section className="preview">
        {preview}
      </section>
    </main>
  );
}
