/**
 * Notion-style tag input component used in the admin audit brief upload/edit form.
 *
 * Key responsibilities:
 * - Renders a text input with a dropdown that appears when the user types.
 * - The dropdown shows a "Create" option with the typed text as an inline badge.
 * - Clicking "Create" or pressing Enter adds the tag.
 * - Renders existing tags as removable chip elements below the input.
 * - Manages its own dropdown open/close state internally.
 * - Keeps the same external props interface as the original component.
 *
 * @dependencies lucide-react, shadcn Input/Label, lib/utils
 *
 * Usage example:
 * ```tsx
 * <TagInput
 *   tags={tags}
 *   tagInput={tagInput}
 *   onTagInputChange={setTagInput}
 *   onAddTag={handleAddTag}
 *   onRemoveTag={handleRemoveTag}
 *   inputRef={tagInputRef}
 * />
 * ```
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TagInputProps {
  /** Current list of applied tag strings. */
  tags: string[];
  /** Controlled value for the tag text input. */
  tagInput: string;
  /** Called on every keystroke to update the controlled input value. */
  onTagInputChange: (value: string) => void;
  /**
   * Called on keydown events from the text input.
   * The parent is responsible for detecting Enter and appending to `tags`.
   * Also called with a synthetic Enter event when the user clicks "Create".
   */
  onAddTag: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Called when the user clicks the remove icon on an individual tag chip. */
  onRemoveTag: (tag: string) => void;
  /** Optional ref forwarded to the underlying text input element. */
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

/**
 * Renders a Notion-style tag input with a create dropdown and chip display.
 *
 * When the user types text and the input is focused, a dropdown appears below
 * the input showing a "Create" option with the typed text rendered as an inline
 * badge. Clicking the option or pressing Enter adds the tag and closes the dropdown.
 *
 * @param tags - Array of tag strings currently applied to the audit brief.
 * @param tagInput - Controlled value for the new-tag text input.
 * @param onTagInputChange - Handler to update the controlled input value.
 * @param onAddTag - Keydown handler (parent detects Enter and commits the tag).
 * @param onRemoveTag - Handler called with the tag string to remove.
 * @param inputRef - Optional ref for programmatic focus of the text input.
 * @returns A labelled tag input with dropdown creator and a chip list below it.
 */
export function TagInput({
  tags,
  tagInput,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  inputRef,
}: TagInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement | null>(null);

  /** The resolved ref — uses the forwarded ref if provided, otherwise the internal one. */
  const resolvedInputRef = inputRef ?? internalInputRef;

  const trimmedInput = tagInput.trim();
  const isDuplicate = tags.includes(trimmedInput);
  const showDropdown = isFocused && trimmedInput.length > 0;

  /**
   * Dispatches a synthetic Enter keyboard event to the parent's onAddTag handler.
   * This allows the click-to-create path to reuse the parent's Enter key logic.
   */
  const handleCreateClick = () => {
    const syntheticEvent = {
      key: 'Enter',
      preventDefault: () => {},
      stopPropagation: () => {},
    } as React.KeyboardEvent<HTMLInputElement>;

    onAddTag(syntheticEvent);
    // Keep focus on input so the user can immediately type the next tag
    resolvedInputRef.current?.focus();
  };

  /**
   * Wraps the parent's onAddTag — keeps the input focused and dropdown
   * visible so subsequent tags can be created without re-clicking.
   *
   * @param e - The keyboard event from the input.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onAddTag(e);
    // Dropdown visibility is driven by trimmedInput length + isFocused.
    // After the parent clears the input, the dropdown hides automatically
    // because trimmedInput becomes empty. No need to manually close.
  };

  /**
   * Closes the dropdown when clicking outside the container.
   * Uses mousedown to fire before the input's blur event.
   */
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label htmlFor="tags">Tags</Label>

      {/* Input + dropdown wrapper — relative positioning anchor */}
      <div className="relative">
        <Input
          id="tags"
          ref={resolvedInputRef}
          value={tagInput}
          onChange={(e) => onTagInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          placeholder="Select an option or create one"
          autoComplete="off"
        />

        {/* Dropdown */}
        <div
          className={cn(
            'absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-md',
            /* Emil Kowalski transitions: <200ms, specific properties, ease-out */
            'transition-[opacity,transform] duration-150',
            '[transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
            showDropdown
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-1 opacity-0'
          )}
        >
          {isDuplicate ? (
            /* Tag already exists — show a disabled hint */
            <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
              <span>Tag</span>
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {trimmedInput}
              </span>
              <span>already exists</span>
            </div>
          ) : (
            /* Create option */
            <button
              type="button"
              onMouseDown={(e) => {
                /* Prevent the input from losing focus before the click registers */
                e.preventDefault();
              }}
              onClick={handleCreateClick}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2.5 text-sm',
                'hover:bg-accent/50 active:bg-accent',
                'transition-colors duration-100',
                'cursor-pointer text-left'
              )}
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Create</span>
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {trimmedInput}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Tag chips */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                'inline-flex cursor-pointer items-center rounded-md border border-border/60',
                'bg-secondary/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground',
                'hover:border-border hover:bg-secondary/60',
                'transition-colors duration-100'
              )}
              onClick={() => onRemoveTag(tag)}
            >
              {tag}
              <X className="ml-1 h-3 w-3" />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
