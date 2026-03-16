/**
 * Date range picker component for filtering analytics data.
 *
 * Key responsibilities:
 * - Provides start/end date inputs for analytics filtering
 * - Communicates selected range to parent via callback props
 */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateRangePickerProps {
  onDateChange: (from: string, to: string) => void;
}

/**
 * Renders date range inputs for filtering analytics data.
 *
 * @param props - Component props
 * @param props.onDateChange - Callback invoked with (from, to) strings when the user applies a date range
 * @returns Date range picker with from/to date inputs
 */
export function DateRangePicker({ onDateChange }: DateRangePickerProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  return (
    <div className="flex items-end gap-3">
      <div>
        <Label htmlFor="date-from">From</Label>
        <Input id="date-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="date-to">To</Label>
        <Input id="date-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <Button variant="outline" onClick={() => onDateChange(from, to)}>
        Apply
      </Button>
    </div>
  );
}
