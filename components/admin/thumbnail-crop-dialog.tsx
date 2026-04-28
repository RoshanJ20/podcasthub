/**
 * ThumbnailCropDialog — Modal for cropping an uploaded thumbnail to 1:1.
 *
 * Uses react-easy-crop for the crop UI and a canvas to produce the cropped output.
 * Opens automatically when an image file is provided.
 *
 * @dependencies react-easy-crop, shadcn Dialog, shadcn Slider
 */
'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { createLogger } from '@/lib/logger';

const log = createLogger('thumbnail-crop-dialog');

/**
 * Props for ThumbnailCropDialog.
 *
 * @property imageSrc - Object URL of the raw image to crop.
 * @property open - Whether the dialog is visible.
 * @property onCrop - Called with the cropped File when the user confirms.
 * @property onCancel - Called when the user dismisses without cropping.
 */
interface ThumbnailCropDialogProps {
  imageSrc: string | null;
  open: boolean;
  onCrop: (file: File) => void;
  onCancel: () => void;
}

/**
 * Crops a source image to the given pixel area and returns a File.
 *
 * @param imageSrc - Object URL or data URL of the source image.
 * @param cropArea - Pixel coordinates and dimensions of the crop region.
 * @returns A Promise resolving to the cropped image as a File (JPEG).
 */
/** Max output dimension in pixels — keeps file size small for thumbnails. */
const MAX_OUTPUT_PX = 512;

async function getCroppedFile(imageSrc: string, cropArea: Area): Promise<File> {
  const image = new Image();
  // Listeners must be attached BEFORE setting src to avoid missing a synchronous
  // load event when the browser serves the blob from cache.
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Failed to load image for cropping'));
    image.src = imageSrc;
    if (image.complete && image.naturalWidth > 0) resolve();
  });

  const size = Math.min(cropArea.width, cropArea.height, MAX_OUTPUT_PX);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not acquire 2D canvas context');
  ctx.drawImage(image, cropArea.x, cropArea.y, cropArea.width, cropArea.height, 0, 0, size, size);

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas encoding failed'));
          return;
        }
        resolve(new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92
    );
  });
}

/**
 * Renders a modal with a 1:1 crop interface, zoom slider, and Crop/Cancel buttons.
 *
 * @param props - Component props.
 * @returns The crop dialog UI.
 */
export function ThumbnailCropDialog({
  imageSrc,
  open,
  onCrop,
  onCancel,
}: ThumbnailCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels || isProcessing) return;
    try {
      setIsProcessing(true);
      const file = await getCroppedFile(imageSrc, croppedAreaPixels);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      onCrop(file);
    } catch (error) {
      log.error({ err: error }, 'Thumbnail crop failed');
      toast.error(error instanceof Error ? error.message : 'Could not crop the thumbnail');
    } finally {
      setIsProcessing(false);
    }
  }, [imageSrc, croppedAreaPixels, isProcessing, onCrop]);

  const handleCancel = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onCancel();
  }, [onCancel]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crop Thumbnail</DialogTitle>
        </DialogHeader>

        {/*
         * Explicit height (h-80 = 20rem). Do NOT use `aspect-square` here —
         * react-easy-crop renders absolutely-positioned children, so it cannot
         * grow this box. Inside the dialog's `display: grid` parent the row
         * would collapse to 0px and the Cropper would render invisibly,
         * preventing onCropComplete from ever firing.
         */}
        <div className="relative w-full h-80 bg-muted rounded-lg overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-xs shrink-0">Zoom</Label>
          <Slider
            min={1}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={(vals) => setZoom(Array.isArray(vals) ? vals[0] : vals)}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!croppedAreaPixels || isProcessing}>
            {isProcessing ? 'Cropping…' : 'Crop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
