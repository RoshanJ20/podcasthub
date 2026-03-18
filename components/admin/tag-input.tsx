/**
 * Controlled tag input component used in the admin podcast upload/edit form.
 *
 * Key responsibilities:
 * - Renders a text input where pressing Enter adds a new tag to a list.
 * - Renders existing tags as removable chip elements.
 * - Calls parent-supplied callbacks for all state mutations; holds no internal state.
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

import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
   */
  onAddTag: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Called when the user clicks the remove icon on an individual tag chip. */
  onRemoveTag: (tag: string) => void;
  /** Optional ref forwarded to the underlying text input element. */
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

/**
 * Renders a labelled tag entry field with chip display and one-click removal.
 *
 * @param tags - Array of tag strings currently applied to the podcast.
 * @param tagInput - Controlled value for the new-tag text input.
 * @param onTagInputChange - Handler to update the controlled input value.
 * @param onAddTag - Keydown handler (parent detects Enter and commits the tag).
 * @param onRemoveTag - Handler called with the tag string to remove.
 * @param inputRef - Optional ref for programmatic focus of the text input.
 * @returns A labelled tag input with a scrollable chip list below it.
 */
export function TagInput({
  tags,
  tagInput,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  inputRef,
}: TagInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="tags">Tags</Label>
      <Input
        id="tags"
        ref={inputRef}
        value={tagInput}
        onChange={(e) => onTagInputChange(e.target.value)}
        onKeyDown={onAddTag}
        placeholder="Type a tag and press Enter"
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex cursor-pointer items-center rounded-md border border-border/60 bg-secondary/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:border-border hover:bg-secondary/60 transition-colors"
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
