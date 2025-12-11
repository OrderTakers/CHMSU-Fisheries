// lib/image-upload.ts - Simple base64 solution
export interface ImageUploadResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export const uploadImageToSupabase = async (file: File): Promise<ImageUploadResponse> => {
  try {
    // Validate file type and size
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return { success: false, error: "Only JPEG, PNG, or WEBP images are allowed" };
    }
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      return { success: false, error: "Image size must be less than 2MB" };
    }

    // Convert to base64 (simple and works immediately)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (result.startsWith("data:image/")) {
          console.log("✅ Image converted to base64, size:", Math.round(result.length / 1024), "KB");
          resolve({
            success: true,
            imageUrl: result
          });
        } else {
          resolve({ success: false, error: "Failed to process image" });
        }
      };
      reader.onerror = () => {
        resolve({ success: false, error: "Failed to read image" });
      };
      reader.readAsDataURL(file);
    });
 } catch (error) {
  console.error('Image upload failed:', error);
  throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

export const deleteImageFromSupabase = async (imageUrl: string): Promise<boolean> => {
  // For base64, we don't need to delete from storage
  return true;
}
