// Note: We use dynamic imports for pdfjs-dist and jspdf to avoid SSR issues
// and ensure these browser-only libraries aren't loaded on the server.

export interface CompressionOptions {
  quality?: number; // 0.1 to 1.0
  scale?: number;   // scale factor for rendering (default 1.5 for decent quality)
  onProgress?: (progress: number) => void;
}

/**
 * Compresses a PDF by rendering pages to images and re-building the PDF.
 * This is the most effective way to reduce size in pure JS, although text selection is lost.
 */
export async function compressPdf(
  file: File | ArrayBuffer,
  options: CompressionOptions = {}
): Promise<Blob> {
  const { quality = 0.7, scale = 1.5, onProgress } = options;
  
  // Dynamic imports to prevent SSR issues
  const pdfjs = await import('pdfjs-dist');
  const { jsPDF } = await import('jspdf');

  // Set worker source to CDN
  // Using a more reliable worker source pattern for PDF.js 4+
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  
  if (onProgress) onProgress(5);

  const data = file instanceof File ? await file.arrayBuffer() : file;
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  
  if (onProgress) onProgress(10);

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'px',
    format: 'a4',
    hotfixes: ['px_scaling'],
  });

    // Remove the initial blank page created by jsPDF
    doc.deletePage(1);

    for (let i = 1; i <= numPages; i++) {
      // Add a small delay every few pages to allow GC to run
      if (i % 3 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const page = await pdf.getPage(i);
      
      // Safety check: Cap the scale if the page is already huge to avoid OOM
      let optimizedScale = scale;
      const baseViewport = page.getViewport({ scale: 1 });
      const maxDimension = 2000; // Reduced from 3000 to 2000 for even more safety
      if (baseViewport.width * scale > maxDimension || baseViewport.height * scale > maxDimension) {
        optimizedScale = Math.min(maxDimension / baseViewport.width, maxDimension / baseViewport.height);
      }

      const viewport = page.getViewport({ scale: optimizedScale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { 
        alpha: false,
        willReadFrequently: false,
      }); 
      
      if (!context) {
        throw new Error('Failed to get canvas context');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render the page
      const renderTask = page.render({
        canvasContext: context,
        viewport: viewport,
      });
      
      await renderTask.promise;
      
      // Convert to compressed JPEG
      // Using a slightly lower quality for better memory/size
      const imgData = canvas.toDataURL('image/jpeg', quality);
      
      // Add page to jspdf with correct dimensions
      doc.addPage([viewport.width, viewport.height], viewport.width > viewport.height ? 'l' : 'p');
      doc.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height, undefined, 'FAST');
      
      // CRITICAL CLEANUP: Free up memory immediately
      renderTask.cancel();
      page.cleanup();
      
      // Zero out canvas to release GPU/RAM memory
      canvas.width = 0;
      canvas.height = 0;
      canvas.remove();

      if (onProgress) {
        const currentProgress = 10 + Math.round((i / numPages) * 90);
        onProgress(currentProgress);
      }
    }
    
    const output = doc.output('blob');
    
    // Clear the loading task
    loadingTask.destroy();
    
    return output;
  }

