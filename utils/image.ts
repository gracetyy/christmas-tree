import { COLORS } from '../constants';

/**
 * Processes an image to ensure it is square (1:1 aspect ratio) by adding padding.
 * The logic fits the image within a square canvas based on its largest dimension,
 * ensuring no cropping occurs and padding is added to the shorter dimension.
 * 
 * @param url The source URL of the image (can be a data URL or object URL).
 * @param paddingColor The color to use for the padding (defaults to Polaroid frame color).
 * @returns A Promise that resolves to a data URL of the processed image.
 */
export const processImageWithPadding = (url: string, paddingColor: string = COLORS.POLAROID_FRAME): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const { width, height } = img;
      
      // If already square, return original URL
      if (width === height) {
        resolve(url);
        return;
      }

      // To make it square without cropping, the canvas size must be the larger dimension.
      // This "fits" the larger dimension to the square and "pads" the smaller one.
      // "Fit the width then add padding"
      // We make the canvas square based on the image width.
      // This ensures the image always spans the full width of the Polaroid.
      const size = width;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(url);
        return;
      }

      // Fill background with padding color (exactly the same as Polaroid frame)
      ctx.fillStyle = paddingColor;
      ctx.fillRect(0, 0, size, size);

      // Draw image centered vertically. 
      // If landscape: width fits, height is padded.
      // If portrait: width fits, height is cropped.
      const x = 0;
      const y = (size - height) / 2;
      ctx.drawImage(img, x, y, width, height);

      // Return as PNG for better color accuracy (no JPEG artifacts)
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      console.error("Failed to load image for padding processing:", url);
      // Fallback to original URL if processing fails
      resolve(url);
    };
    img.src = url;
  });
};
