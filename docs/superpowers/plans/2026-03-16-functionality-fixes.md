# Functionality Fixes — Learning Paths, Auto-Save, Auto-Publish, Error Handling

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix broken learning path functionality, add auto-save across editors, auto-publish all learning paths, add proper error feedback, and implement missing PRD features.

**Architecture:** The learning path editor uses a Zustand store (`graph-editor-store.ts`) that drives both Linear and Graph editors. The bulk save API currently deletes all episodes and recreates them, which orphans UserProgress records (cascade delete). We'll switch to an upsert pattern that preserves episode IDs, add debounced auto-save to the store, remove the draft/publish concept entirely, and add toast feedback for all mutating operations.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma ORM, Zustand, sonner (toasts), @dnd-kit, @xyflow/react

---

## Chunk 1: Fix Core Save Infrastructure

### Task 1: Fix bulk save API to use upsert instead of delete-all

The current `PUT /api/learning-graphs/[id]/data` deletes ALL episodes then recreates them. This causes:

- Episode IDs change on every save
- UserProgress records cascade-deleted (data loss)
- UserActivity records lose episode references

Switch to upsert: update existing episodes by ID, create new ones (temp IDs), delete removed ones.

**Files:**

- Modify: `app/api/learning-graphs/[id]/data/route.ts`

- [ ] **Step 1: Rewrite the PUT handler to use upsert logic**

Replace the entire PUT handler body (lines 20-93) with:

```typescript
export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['admin', 'superadmin']);

    const { id } = await context.params;

    const graph = await prisma.learningGraph.findUnique({
      where: { id },
      include: { episodes: { select: { id: true } } },
    });
    if (!graph) {
      return createErrorResponse(notFound('Learning graph'));
    }

    const body = await request.json();
    const { episodes, edges } = body;

    if (!Array.isArray(episodes)) {
      return createErrorResponse(badRequest('episodes array is required'));
    }

    const existingEpisodeIds = new Set(graph.episodes.map((e) => e.id));
    const incomingIds = new Set<string>();
    const tempIdToRealId = new Map<string, string>();

    // Upsert episodes: update existing, create new
    for (const ep of episodes) {
      const isExisting = existingEpisodeIds.has(ep.id);
      const isTemp = typeof ep.id === 'string' && ep.id.startsWith('temp-');

      const episodeData = {
        title: ep.title || 'Untitled Episode',
        description: ep.description || null,
        audioUrl: ep.audioUrl || '',
        thumbnailUrl: ep.thumbnailUrl || null,
        transcript: ep.transcript
          ? typeof ep.transcript === 'string'
            ? [ep.transcript]
            : ep.transcript
          : [],
        positionX: ep.positionX ?? 0,
        positionY: ep.positionY ?? 0,
        nodeType: ep.nodeType || 'default',
        sortOrder: ep.sortOrder ?? 0,
      };

      if (isExisting && !isTemp) {
        // Update existing episode in place (preserves ID and UserProgress)
        await prisma.episode.update({
          where: { id: ep.id },
          data: episodeData,
        });
        incomingIds.add(ep.id);
      } else {
        // Create new episode
        const created = await prisma.episode.create({
          data: { graphId: id, ...episodeData },
        });
        tempIdToRealId.set(ep.id, created.id);
        incomingIds.add(created.id);
      }
    }

    // Delete episodes that were removed by the user
    const idsToDelete = [...existingEpisodeIds].filter((eid) => !incomingIds.has(eid));
    if (idsToDelete.length > 0) {
      await prisma.learningPathEdge.deleteMany({
        where: {
          graphId: id,
          OR: [{ sourceEpisodeId: { in: idsToDelete } }, { targetEpisodeId: { in: idsToDelete } }],
        },
      });
      await prisma.episode.deleteMany({ where: { id: { in: idsToDelete } } });
    }

    // Recreate edges (edges are cheap, no user data attached)
    await prisma.learningPathEdge.deleteMany({ where: { graphId: id } });
    if (Array.isArray(edges) && edges.length > 0) {
      for (const edge of edges) {
        const sourceId = tempIdToRealId.get(edge.sourceEpisodeId) ?? edge.sourceEpisodeId;
        const targetId = tempIdToRealId.get(edge.targetEpisodeId) ?? edge.targetEpisodeId;
        await prisma.learningPathEdge.create({
          data: {
            graphId: id,
            sourceEpisodeId: sourceId,
            targetEpisodeId: targetId,
            label: edge.label || null,
          },
        });
      }
    }

    // Return the saved graph so the client can update IDs
    const saved = await prisma.learningGraph.findUnique({
      where: { id },
      include: { episodes: { orderBy: { sortOrder: 'asc' } }, edges: true },
    });

    return NextResponse.json({ data: saved });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    console.error('Learning graph data save error:', error);
    return createErrorResponse(internalError());
  }
}
```

- [ ] **Step 2: Verify the API compiles**

Run: `npx tsc --noEmit`
Expected: No errors in the modified file

- [ ] **Step 3: Commit**

```bash
git add app/api/learning-graphs/[id]/data/route.ts
git commit -m "fix: use upsert pattern in learning path bulk save to preserve episode IDs"
```

---

### Task 2: Fix Zustand store save — add error handling, response processing, and ID reconciliation

> **IMPORTANT:** Task 2 changes the save payload to send `id` instead of `tempId`. This requires Task 1's API changes to be deployed first. Tasks 1 and 2 must be committed and deployed together.

The store's `save()` method ignores the API response and unconditionally sets `isDirty: false`. It also needs to update temp IDs with real IDs from the server response.

**Files:**

- Modify: `stores/graph-editor-store.ts`

- [ ] **Step 1: Add `isSaving` and `lastSaveError` state fields**

Add to the interface and initial state:

```typescript
// Add to GraphEditorState interface:
isSaving: boolean;
lastSaveError: string | null;

// Add to initial state in create():
isSaving: false,
lastSaveError: null,
```

- [ ] **Step 2: Rewrite the `save` method with error handling and ID reconciliation**

```typescript
save: async (graphId) => {
  if (get().isSaving) return; // Prevent concurrent saves
  set({ isSaving: true, lastSaveError: null });

  try {
    const { nodes, edges } = get();
    const response = await fetch(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        episodes: nodes.map((n, i) => ({
          id: n.id,
          title: n.title,
          podcastId: n.podcastId,
          positionX: n.positionX,
          positionY: n.positionY,
          nodeType: n.nodeType,
          sortOrder: i,
          description: n.description ?? '',
          audioUrl: n.audioUrl ?? '',
          thumbnailUrl: n.thumbnailUrl ?? '',
          transcript: n.transcript ?? '',
        })),
        edges: edges.map((e) => ({
          sourceEpisodeId: e.source,
          targetEpisodeId: e.target,
        })),
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Save failed (${response.status})`);
    }

    const { data } = await response.json();

    // Reconcile temp IDs with server-assigned real IDs
    if (data?.episodes) {
      const serverEpisodes = data.episodes as Array<{
        id: string;
        title: string;
        nodeType: string;
        positionX: number;
        positionY: number;
        audioUrl: string;
        thumbnailUrl: string | null;
        description: string | null;
        transcript: unknown;
        sortOrder: number;
      }>;

      const reconciledNodes: GraphNode[] = serverEpisodes.map((ep) => ({
        id: ep.id,
        title: ep.title,
        nodeType: ep.nodeType as GraphNode['nodeType'],
        podcastId: '',
        positionX: ep.positionX,
        positionY: ep.positionY,
        audioUrl: ep.audioUrl ?? '',
        thumbnailUrl: ep.thumbnailUrl ?? '',
        description: ep.description ?? '',
        transcript: typeof ep.transcript === 'string'
          ? ep.transcript
          : Array.isArray(ep.transcript)
            ? (ep.transcript as string[]).join('\n')
            : '',
      }));

      const reconciledEdges: GraphEdge[] = (data.edges ?? []).map(
        (e: { id: string; sourceEpisodeId: string; targetEpisodeId: string }) => ({
          id: e.id,
          source: e.sourceEpisodeId,
          target: e.targetEpisodeId,
        })
      );

      set({ nodes: reconciledNodes, edges: reconciledEdges, isDirty: false, isSaving: false });
    } else {
      set({ isDirty: false, isSaving: false });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Save failed';
    set({ isSaving: false, lastSaveError: message });
    throw error; // Re-throw so callers (auto-save) can handle
  }
},
```

- [ ] **Step 3: Verify the store compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add stores/graph-editor-store.ts
git commit -m "fix: add error handling and ID reconciliation to graph editor save"
```

---

### Task 3: Add debounced auto-save to the store

Add a debounced auto-save mechanism that triggers 2 seconds after the last change. The store already tracks `isDirty`. We'll add an `autoSave` method that components call to register the graph ID, and use `setTimeout`/`clearTimeout` for debouncing.

**Files:**

- Modify: `stores/graph-editor-store.ts`

- [ ] **Step 1: Add auto-save infrastructure to the store**

Add these fields to the interface and state:

```typescript
// Add to GraphEditorState interface:
autoSaveGraphId: string | null;
setAutoSaveGraphId: (graphId: string | null) => void;

// Add outside the store (module-level):
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_SAVE_DELAY_MS = 2000;
```

- [ ] **Step 2: Implement setAutoSaveGraphId**

```typescript
setAutoSaveGraphId: (graphId) => set({ autoSaveGraphId: graphId }),
```

- [ ] **Step 3: Add auto-save trigger to all mutating methods**

Modify `addNode`, `removeNode`, `updateNode`, `addEdge`, `removeEdge`, `setLayout` to trigger auto-save after setting `isDirty: true`. Add a helper function inside the store:

```typescript
// Add as exported module-level function:
export function scheduleAutoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    const state = useGraphEditorStore.getState();
    if (state.isDirty && state.autoSaveGraphId && !state.isSaving) {
      try {
        await state.save(state.autoSaveGraphId);
      } catch {
        // Error already stored in lastSaveError
      }
    }
  }, AUTO_SAVE_DELAY_MS);
}
```

Then call `scheduleAutoSave()` at the end of each mutating method:

```typescript
addNode: (node) => {
  set((s) => ({ nodes: [...s.nodes, node], isDirty: true }));
  scheduleAutoSave();
},
// ... same pattern for removeNode, updateNode, addEdge, removeEdge, setLayout
```

> **IMPORTANT:** The `LinearEditor` component's `handleDragEnd` calls `store.setState()` directly to reorder nodes, bypassing the store's named methods. This means `scheduleAutoSave()` won't fire for drag-reorder. Fix this in Task 4 by calling `scheduleAutoSave()` after the `setState` call in the component's `handleDragEnd` handler. Import `scheduleAutoSave` from the store module (export it).

- [ ] **Step 4: Add initial state for autoSaveGraphId**

```typescript
autoSaveGraphId: null,
```

- [ ] **Step 5: Verify compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add stores/graph-editor-store.ts
git commit -m "feat: add debounced auto-save to graph editor store"
```

---

## Chunk 2: Update Editor UI — Remove Save Buttons, Add Auto-Save Status, Wire Up

### Task 4: Wire auto-save into the editor page and show save status

The editor page needs to set the `autoSaveGraphId` on mount. Both editors need to replace the Save button with an auto-save status indicator.

**Files:**

- Modify: `components/learning-path/graph-editor-initializer.tsx`
- Modify: `components/learning-path/linear-editor.tsx`
- Modify: `components/learning-path/graph-editor.tsx`

- [ ] **Step 1: Set autoSaveGraphId in the initializer**

In `graph-editor-initializer.tsx`, add `graphId` prop and call `setAutoSaveGraphId`:

```typescript
interface GraphEditorInitializerProps {
  graphId: string; // Add this prop
  episodes: Episode[];
  edges: Edge[];
}

export function GraphEditorInitializer({ graphId, episodes, edges }: GraphEditorInitializerProps) {
  useEffect(() => {
    // ... existing node/edge mapping ...
    useGraphEditorStore.getState().loadFromApi(nodes, graphEdges);
    useGraphEditorStore.getState().setAutoSaveGraphId(graphId);

    return () => {
      useGraphEditorStore.getState().setAutoSaveGraphId(null);
      useGraphEditorStore.getState().reset();
    };
  }, [graphId, episodes, edges]);

  return null;
}
```

- [ ] **Step 2: Update the editor page to pass graphId to initializer**

In `app/(admin)/admin/learning-graphs/[id]/page.tsx`, pass `graphId={id}`:

```tsx
<GraphEditorInitializer graphId={id} episodes={graph.episodes} edges={graph.edges} />
```

- [ ] **Step 3: Create a shared auto-save status indicator component**

Create file `components/learning-path/auto-save-status.tsx`:

```typescript
'use client';

/**
 * Auto-save status indicator for learning path editors.
 *
 * Shows current save state: saving, saved, error, or unsaved changes.
 */
import { useGraphEditorStore } from '@/stores/graph-editor-store';
import { CheckCircle2, AlertCircle, Loader2, Circle } from 'lucide-react';

export function AutoSaveStatus() {
  const { isSaving, isDirty, lastSaveError } = useGraphEditorStore();

  if (isSaving) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (lastSaveError) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>Save failed</span>
      </div>
    );
  }

  if (isDirty) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-yellow-600">
        <Circle className="h-3.5 w-3.5" />
        <span>Unsaved changes</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-green-600">
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span>Saved</span>
    </div>
  );
}
```

- [ ] **Step 4: Replace Save button with AutoSaveStatus in LinearEditor and fix drag-reorder auto-save**

In `linear-editor.tsx`:

1. Remove the Save button import (`Save` from lucide) and the save button JSX
2. Import `scheduleAutoSave` from the store module
3. Call `scheduleAutoSave()` after the `store.setState()` in `handleDragEnd`

```tsx
// Add import:
import { useGraphEditorStore, scheduleAutoSave } from '@/stores/graph-editor-store';
import { AutoSaveStatus } from './auto-save-status';

// Remove: import { Save } from 'lucide-react';
// Remove: const { ..., isDirty, save } = useGraphEditorStore();
// Change to:
const { nodes, addNode, removeNode, updateNode } = useGraphEditorStore();

// Fix handleDragEnd to trigger auto-save:
const handleDragEnd = useCallback(
  (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const state = store.getState();
      const oldIndex = state.nodes.findIndex((n) => n.id === active.id);
      const newIndex = state.nodes.findIndex((n) => n.id === over.id);
      store.setState({ nodes: arrayMove(state.nodes, oldIndex, newIndex), isDirty: true });
      scheduleAutoSave(); // Trigger auto-save after drag reorder
    }
  },
  [store]
);

// In the header div, replace the save button and unsaved warning with:
<div className="flex justify-between items-center mb-4">
  <h3 className="font-semibold">Linear Path</h3>
  <div className="flex items-center gap-3">
    <AutoSaveStatus />
    <Button variant="outline" size="sm" onClick={handleAddEpisode}>
      <Plus className="h-4 w-4 mr-1" /> Add Episode
    </Button>
  </div>
</div>;
```

Remove the yellow "Unsaved changes" banner (lines 256-259).

> **Note:** `scheduleAutoSave` must be exported from `stores/graph-editor-store.ts` (see Task 3). Add `export` to the function declaration.

- [ ] **Step 5: Replace Save button with AutoSaveStatus in GraphEditor**

In `graph-editor.tsx`, remove the Save button and replace with `AutoSaveStatus`:

```tsx
// Remove Save import from lucide
// Remove save and isDirty from store destructuring
// Remove handleSave callback

// Replace the button bar (lines 97-104) with:
<div className="absolute top-2 right-2 z-10 flex items-center gap-2">
  <AutoSaveStatus />
  <Button variant="outline" size="sm" onClick={setLayout}>
    <LayoutGrid className="h-4 w-4 mr-1" /> Auto Layout
  </Button>
</div>
```

Remove the yellow "Unsaved changes" banner (lines 92-96).

- [ ] **Step 6: Verify compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add components/learning-path/auto-save-status.tsx \
  components/learning-path/graph-editor-initializer.tsx \
  components/learning-path/linear-editor.tsx \
  components/learning-path/graph-editor.tsx \
  app/(admin)/admin/learning-graphs/[id]/page.tsx
git commit -m "feat: replace manual save buttons with auto-save status indicator"
```

---

### Task 5: Add unsaved changes warning on navigation

Prevent accidental data loss by warning users when navigating away with unsaved changes.

**Files:**

- Create: `hooks/use-unsaved-changes-warning.ts`
- Modify: `components/learning-path/linear-editor.tsx`
- Modify: `components/learning-path/graph-editor.tsx`

- [ ] **Step 1: Create the hook**

```typescript
/**
 * Hook that warns users when navigating away with unsaved changes.
 *
 * Listens to the beforeunload event and shows a browser-native
 * confirmation dialog when the condition is true.
 */
'use client';

import { useEffect } from 'react';

/**
 * Shows a browser-native "unsaved changes" dialog when navigating away.
 *
 * @param shouldWarn - Whether to show the warning (typically isDirty state)
 */
export function useUnsavedChangesWarning(shouldWarn: boolean): void {
  useEffect(() => {
    if (!shouldWarn) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [shouldWarn]);
}
```

- [ ] **Step 2: Wire into both editors**

In both `linear-editor.tsx` and `graph-editor.tsx`, add:

```typescript
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';

// Inside the component:
const isDirty = useGraphEditorStore((s) => s.isDirty);
useUnsavedChangesWarning(isDirty);
```

- [ ] **Step 3: Verify compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add hooks/use-unsaved-changes-warning.ts \
  components/learning-path/linear-editor.tsx \
  components/learning-path/graph-editor.tsx
git commit -m "feat: warn on navigation away with unsaved learning path changes"
```

---

## Chunk 3: Auto-Publish & Remove Draft/Publish Flow

### Task 6: Auto-publish learning paths on creation

Learning paths should always be published. Remove the draft concept entirely.

**Files:**

- Modify: `app/api/learning-graphs/route.ts` (POST handler)
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Change schema default for isPublished to true**

In `prisma/schema.prisma`, line 77:

```prisma
isPublished  Boolean  @default(true) @map("is_published")
```

- [ ] **Step 2: Create and apply migration**

Run: `npx prisma migrate dev --name auto-publish-learning-paths`
Expected: Migration created and applied

- [ ] **Step 3: Force isPublished=true in the POST handler**

In `app/api/learning-graphs/route.ts`, modify the create call (line 86-89):

```typescript
const graph = await prisma.learningGraph.create({
  data: {
    ...result.data,
    createdBy: user.userId,
    isPublished: true,
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ app/api/learning-graphs/route.ts
git commit -m "feat: auto-publish learning paths on creation"
```

---

### Task 7: Remove publish/draft toggle from admin table

Since all paths are auto-published, remove the toggle button and Published column from the admin table.

**Files:**

- Modify: `components/admin/learning-graphs-table.tsx`
- Modify: `app/(public)/learning-path/page.tsx` (remove isPublished filter)
- Modify: `app/(public)/learning-path/[id]/page.tsx` (remove isPublished filter)
- Modify: `app/api/learning-graphs/route.ts` (remove isPublished filter in GET)
- Modify: `app/api/learning-graphs/[id]/route.ts` (remove isPublished check in GET)

- [ ] **Step 1: Remove publish column and handler from admin table**

In `learning-graphs-table.tsx`:

- Remove the `handlePublishToggle` function entirely (lines 48-55)
- Remove the "Published" `<TableHead>` (line 84)
- Remove the entire Published `<TableCell>` block (lines 99-107)
- Update the `colSpan` in the empty state row from 6 to 5

- [ ] **Step 2: Remove isPublished filter from public listing page**

In `app/(public)/learning-path/page.tsx`, change the query (line 17-20):

```typescript
const paths = await prisma.learningGraph.findMany({
  where: {
    ...(domain ? { domain } : {}),
  },
  include: { _count: { select: { episodes: true } } },
  orderBy: { createdAt: 'desc' },
});
```

- [ ] **Step 3: Remove isPublished filter from public viewer page**

In `app/(public)/learning-path/[id]/page.tsx`, change the query (line 17-19):

```typescript
const graph = await prisma.learningGraph.findUnique({
  where: { id },
  include: {
    episodes: { orderBy: { sortOrder: 'asc' } },
    edges: true,
  },
});
```

- [ ] **Step 4: Remove isPublished filter from API GET list**

In `app/api/learning-graphs/route.ts`, remove lines 37-39 (the `if (!isAdmin)` block that adds `isPublished: true`).

- [ ] **Step 5: Remove isPublished check from API GET single**

In `app/api/learning-graphs/[id]/route.ts`, remove lines 43-45 (the `if (!graph.isPublished && !isAdmin)` check).

- [ ] **Step 6: Remove isPublished from PUT handler**

In `app/api/learning-graphs/[id]/route.ts`, remove the `isPublished` extraction and handling (lines 76, 89-91).

- [ ] **Step 7: Verify compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 8: Commit**

```bash
git add components/admin/learning-graphs-table.tsx \
  app/\(public\)/learning-path/page.tsx \
  app/\(public\)/learning-path/\[id\]/page.tsx \
  app/api/learning-graphs/route.ts \
  app/api/learning-graphs/\[id\]/route.ts
git commit -m "feat: remove draft/publish toggle, all learning paths are always published"
```

---

## Chunk 4: Error Feedback Across the App

### Task 8: Add toast notifications for learning path operations

Add sonner toast feedback for all mutating operations that currently fail silently.

**Files:**

- Modify: `components/admin/learning-graphs-table.tsx`
- Modify: `components/learning-path/episode-player.tsx`
- Modify: `components/learning-path/linear-editor.tsx` (auto-save error toast)
- Modify: `components/learning-path/graph-editor.tsx` (auto-save error toast)

- [ ] **Step 1: Add error handling to admin table delete**

In `learning-graphs-table.tsx`, add `import { toast } from 'sonner';` and update `handleDelete`:

```typescript
const handleDelete = async () => {
  if (!deleteId) return;
  setIsDeleting(true);
  try {
    const res = await fetch(`/api/learning-graphs/${deleteId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    toast.success('Learning path deleted');
  } catch {
    toast.error('Failed to delete learning path');
  } finally {
    setDeleteId(null);
    setIsDeleting(false);
    router.refresh();
  }
};
```

- [ ] **Step 2: Add error feedback to episode player mark-complete**

In `episode-player.tsx`, add `import { toast } from 'sonner';` and update `handleMarkComplete`:

```typescript
const handleMarkComplete = async () => {
  setMarking(true);
  try {
    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ graphId, episodeId }),
    });
    if (!res.ok) throw new Error('Failed to mark complete');
    onComplete();
    toast.success('Episode marked as complete');
  } catch {
    toast.error('Failed to mark episode as complete');
  } finally {
    setMarking(false);
  }
};
```

- [ ] **Step 3: Add auto-save error toast to editors**

In both `linear-editor.tsx` and `graph-editor.tsx`, subscribe to `lastSaveError` changes:

```typescript
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

// Inside the component:
const lastSaveError = useGraphEditorStore((s) => s.lastSaveError);
const prevError = useRef<string | null>(null);

useEffect(() => {
  if (lastSaveError && lastSaveError !== prevError.current) {
    toast.error(lastSaveError);
  }
  prevError.current = lastSaveError;
}, [lastSaveError]);
```

- [ ] **Step 4: Verify compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add components/admin/learning-graphs-table.tsx \
  components/learning-path/episode-player.tsx \
  components/learning-path/linear-editor.tsx \
  components/learning-path/graph-editor.tsx
git commit -m "feat: add toast notifications for all mutating operations"
```

---

## Chunk 5: Missing PRD Features

### Task 9: Add transcript download button

The PRD requires a transcript download option. Add a download button to the episode player transcript section.

**Files:**

- Modify: `components/learning-path/episode-player.tsx`

- [ ] **Step 1: Add download button to transcript section**

In `episode-player.tsx`, add a download button next to the "Transcript" heading (line 213-214):

```typescript
import { Download } from 'lucide-react';

// Replace the transcript heading with:
<div className="flex items-center justify-between mb-2">
  <h4 className="text-sm font-medium">Transcript</h4>
  <Button
    variant="ghost"
    size="sm"
    onClick={() => {
      const blob = new Blob([transcriptText!], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}-transcript.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }}
  >
    <Download className="h-3.5 w-3.5 mr-1" />
    Download
  </Button>
</div>
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/learning-path/episode-player.tsx
git commit -m "feat: add transcript download button to episode player"
```

---

### Task 10: Update existing learning paths to be published

Run a one-time data migration to set all existing learning paths to published.

**Files:**

- Create: `prisma/seed-publish-all.ts` (temporary script)

- [ ] **Step 1: Run a Prisma query to publish all existing paths**

Run directly via the Prisma CLI:

```bash
npx prisma db execute --stdin <<< "UPDATE learning_graphs SET is_published = true WHERE is_published = false;"
```

Expected: All draft learning paths are now published.

- [ ] **Step 2: Verify**

Run: `npx prisma db execute --stdin <<< "SELECT count(*) FROM learning_graphs WHERE is_published = false;"`
Expected: count = 0

- [ ] **Step 3: Commit (no code change needed — this is a data migration)**

No commit needed for data-only change.

---

## Chunk 6: Cleanup and final verification

### Task 11: Remove unused path-viewer.tsx (legacy component)

The `path-viewer.tsx` component appears to be a legacy viewer superseded by `path-viewer-wrapper.tsx`.

**Files:**

- Check: `components/learning-path/path-viewer.tsx` — verify it's not imported anywhere
- Delete if unused

- [ ] **Step 1: Search for imports of path-viewer**

Run: `grep -r "path-viewer" --include="*.tsx" --include="*.ts" -l`

If only `path-viewer.tsx` itself appears (or it's not imported by any other file), delete it.

- [ ] **Step 2: Delete if unused**

```bash
rm components/learning-path/path-viewer.tsx
git add -u components/learning-path/path-viewer.tsx
git commit -m "chore: remove unused legacy path-viewer component"
```

---

### Task 12: Final verification

- [ ] **Step 1: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Lint**

Run: `npx eslint .`
Expected: No errors (warnings are acceptable)

- [ ] **Step 3: Start dev server and smoke test**

Run: `npm run dev`

Manual verification checklist:

- [ ] Navigate to `/admin/learning-graphs` — no Published column
- [ ] Click "New Path" → create a path → verify it appears in public listing immediately
- [ ] In the editor, add an episode → wait 2s → see "Saved" indicator
- [ ] Edit episode title → wait 2s → see "Saved" indicator
- [ ] Refresh the page → verify changes persisted
- [ ] Navigate away → verify beforeunload warning (if dirty)
- [ ] Delete a learning path → see success toast
- [ ] View a learning path → mark episode complete → see success toast
- [ ] Check transcript download button works
