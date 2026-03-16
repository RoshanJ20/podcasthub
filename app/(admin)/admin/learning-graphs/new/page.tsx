/**
 * Create new learning path page.
 *
 * Renders a form for creating a new learning graph with title,
 * description, domain, and path type (linear or graph).
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LEARNING_SERIES_DOMAINS } from '@/lib/schemas/common';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function NewLearningPathPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('');
  const [pathType, setPathType] = useState<'linear' | 'graph'>('linear');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !domain) {
      toast.error('Title and domain are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/learning-graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          domain,
          pathType,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to create learning path');
      }

      const { data } = await response.json();
      toast.success('Learning path created');
      router.push(`/admin/learning-graphs/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create learning path');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Create New Learning Path</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define the structure and metadata for a new learning journey.
        </p>
      </div>
      <Card className="rounded-xl border border-border bg-card">
        <CardHeader className="border-b border-border px-6 py-4">
          <CardTitle className="text-sm font-semibold">Learning Path Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Introduction to Audit Methodology"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what learners will gain from this path"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Domain</Label>
              <Select
                value={domain}
                onValueChange={(value) => {
                  if (value) setDomain(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a domain" />
                </SelectTrigger>
                <SelectContent>
                  {LEARNING_SERIES_DOMAINS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Path Type</Label>
              <Select value={pathType} onValueChange={(v) => setPathType(v as 'linear' | 'graph')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear (step-by-step sequence)</SelectItem>
                  <SelectItem value="graph">Graph (connected nodes)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Learning Path'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
