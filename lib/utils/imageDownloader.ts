import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import stream from 'stream';

const pipeline = promisify(stream.pipeline);

/**
 * Download an image from a URL and save it locally
 * @param imageUrl The URL of the image to download
 * @param destinationDir The directory where the image should be saved (relative to public/)
 * @returns The relative path to the saved image (e.g., /generated/bulk/image-123.png)
 */
export async function downloadAndSaveImage(
  imageUrl: string,
  destinationDir: string = 'generated/bulk'
): Promise<string> {
  try {
    // Create the full directory path
    const publicDir = path.join(process.cwd(), 'public');
    const fullDestinationDir = path.join(publicDir, destinationDir);

    // Ensure the directory exists
    if (!fs.existsSync(fullDestinationDir)) {
      fs.mkdirSync(fullDestinationDir, { recursive: true });
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const extension = getExtensionFromUrl(imageUrl);
    const filename = `image-${timestamp}-${randomString}${extension}`;
    const fullPath = path.join(fullDestinationDir, filename);

    // Download the image
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream',
      timeout: 60000, // 60 second timeout
    });

    // Save the image
    await pipeline(response.data, fs.createWriteStream(fullPath));

    // Return the relative path (for URL access)
    return `/${destinationDir}/${filename}`;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw new Error(`Failed to download image from ${imageUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract file extension from URL, defaults to .png if not found
 */
function getExtensionFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const ext = path.extname(pathname);

    // If we found an extension and it's a common image format, use it
    if (ext && ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext.toLowerCase())) {
      return ext.toLowerCase();
    }

    // Default to .png
    return '.png';
  } catch (error) {
    // If URL parsing fails, default to .png
    return '.png';
  }
}

/**
 * Delete a locally saved image
 * @param localPath The relative path of the image (e.g., /generated/bulk/image-123.png)
 */
export async function deleteLocalImage(localPath: string): Promise<void> {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const fullPath = path.join(publicDir, localPath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`Deleted local image: ${localPath}`);
    }
  } catch (error) {
    console.error('Error deleting local image:', error);
    // Don't throw - deletion errors shouldn't block the main flow
  }
}
