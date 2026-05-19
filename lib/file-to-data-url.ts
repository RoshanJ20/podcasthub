/**
 * fileToDataUrl — Reads a File or Blob into a `data:` URL string.
 *
 * Used in place of `URL.createObjectURL` for image previews when the
 * environment's Content-Security-Policy `img-src` directive permits
 * `data:` but not `blob:` (e.g. some reverse-proxy hardened deployments).
 *
 * The returned string can be assigned directly to `<img src>` or passed to
 * libraries like `react-easy-crop` that accept any URL.
 *
 * @example
 * const dataUrl = await fileToDataUrl(file);
 * setPreview(dataUrl);
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('FileReader did not return a string result'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed to read the file'));
    reader.readAsDataURL(file);
  });
}
