'use client';

/**
 * Tabbed wrapper for learning path editors.
 *
 * Allows admins to switch between Linear and Graph editor views
 * regardless of the learning path's pathType setting.
 */
import { type ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EditorTabsProps {
  /** Which tab to show initially: 'linear' or 'graph'. */
  defaultTab: 'linear' | 'graph';
  /** Expects exactly two children: [LinearEditor, GraphEditor]. */
  children: [ReactNode, ReactNode];
}

export function EditorTabs({ defaultTab, children }: EditorTabsProps) {
  const [linearEditor, graphEditor] = children;

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        <TabsTrigger value="linear">Linear Editor</TabsTrigger>
        <TabsTrigger value="graph">Graph Editor</TabsTrigger>
      </TabsList>
      <TabsContent value="linear">{linearEditor}</TabsContent>
      <TabsContent value="graph">{graphEditor}</TabsContent>
    </Tabs>
  );
}
