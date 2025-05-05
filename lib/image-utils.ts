/**
 * Utility functions for image processing
 */

/**
 * Compresses an image file to a specified quality and maximum size
 * Returns a Promise that resolves to a compressed File object
 */
export async function compressImage(file: File, maxSizeMB = 1, quality = 0.7): Promise<File> {
  // If the file is already smaller than the max size, return it as is
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file
  }

  // For GIFs, we'll use a different approach since they can't be easily compressed with canvas
  if (file.type === "image/gif") {
    // For GIFs, we'll convert to PNG (losing animation but preserving the image)
    return await convertGifToPng(file, quality)
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string

      img.onload = () => {
        // Create canvas
        const canvas = document.createElement("canvas")

        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width
        let height = img.height

        // If the image is very large, scale it down
        const MAX_DIMENSION = 1800 // Max width or height
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round(height * (MAX_DIMENSION / width))
            width = MAX_DIMENSION
          } else {
            width = Math.round(width * (MAX_DIMENSION / height))
            height = MAX_DIMENSION
          }
        }

        canvas.width = width
        canvas.height = height

        // Draw image on canvas
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Start with the provided quality
        let currentQuality = quality
        let dataUrl = canvas.toDataURL(file.type, currentQuality)

        // Check if the size is still too large
        let currentSize = Math.round((dataUrl.length * 3) / 4) // Approximate size in bytes

        // If still too large, reduce quality until it fits
        while (currentSize > maxSizeMB * 1024 * 1024 && currentQuality > 0.1) {
          currentQuality -= 0.1
          dataUrl = canvas.toDataURL(file.type, currentQuality)
          currentSize = Math.round((dataUrl.length * 3) / 4)
        }

        // If we still can't get it small enough, reduce dimensions
        if (currentSize > maxSizeMB * 1024 * 1024) {
          const scaleFactor = Math.sqrt((maxSizeMB * 1024 * 1024) / currentSize)
          canvas.width = Math.floor(width * scaleFactor)
          canvas.height = Math.floor(height * scaleFactor)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          dataUrl = canvas.toDataURL(file.type, currentQuality)
        }

        // Convert data URL to Blob
        fetch(dataUrl)
          .then((res) => res.blob())
          .then((blob) => {
            // Create a new File from the blob
            const compressedFile = new File([blob], `compressed-${file.name}`, {
              type: file.type,
              lastModified: Date.now(),
            })

            resolve(compressedFile)
          })
          .catch(reject)
      }

      img.onerror = () => {
        reject(new Error("Failed to load image"))
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }
  })
}

/**
 * Converts a GIF to PNG format
 */
async function convertGifToPng(file: File, quality = 0.7): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string

      img.onload = () => {
        // Create canvas
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height

        // Draw image on canvas
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        ctx.drawImage(img, 0, 0)

        // Convert to PNG
        const dataUrl = canvas.toDataURL("image/png", quality)

        // Convert data URL to Blob
        fetch(dataUrl)
          .then((res) => res.blob())
          .then((blob) => {
            // Create a new File from the blob
            const pngFile = new File([blob], file.name.replace(/\.gif$/i, ".png"), {
              type: "image/png",
              lastModified: Date.now(),
            })

            resolve(pngFile)
          })
          .catch(reject)
      }

      img.onerror = () => {
        reject(new Error("Failed to load image"))
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }
  })
}

/**
 * Splits a base64 string into smaller chunks
 */
export function splitBase64IntoChunks(base64: string, chunkSize: number): string[] {
  const chunks = []
  for (let i = 0; i < base64.length; i += chunkSize) {
    chunks.push(base64.substring(i, i + chunkSize))
  }
  return chunks
}

/**
 * Extracts the mime type from a base64 data URL
 */
export function getMimeTypeFromBase64(base64: string): string {
  const match = base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/)
  return match ? match[1] : "image/png"
}
