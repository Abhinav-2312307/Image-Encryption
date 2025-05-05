"use server"

import CryptoJS from "crypto-js"

// Base secret key for encryption/decryption - in a real app, use environment variables
const BASE_SECRET_KEY = "your-secret-key-for-encryption"

// Interface for encrypted data with metadata
interface EncryptedData {
  data: string
  isPasswordProtected: boolean
  fileType: string
  fileName: string
  fileSize: number
  chunks?: number
  chunkIndex?: number
  totalChunks?: number
}

// Ultra small chunk size for maximum compatibility (50KB)
const MAX_CHUNK_SIZE = 50 * 1024

export async function convertImageToEncryptedText(
  base64: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  password?: string,
): Promise<string> {
  try {
    // Determine if password protection is being used
    const isPasswordProtected = !!password && password.trim().length > 0

    // Create the encryption key (either base key or combined with password)
    const encryptionKey = isPasswordProtected ? `${BASE_SECRET_KEY}-${password}` : BASE_SECRET_KEY

    // For all files, we'll use chunking to ensure maximum compatibility
    // Split the base64 string into chunks
    const chunks = splitIntoChunks(base64, MAX_CHUNK_SIZE)

    // Encrypt each chunk separately with minimal data
    const encryptedChunks = chunks.map((chunk, index) => {
      const chunkData: EncryptedData = {
        data: chunk,
        isPasswordProtected,
        fileType,
        fileName,
        fileSize,
        chunks: chunks.length,
        chunkIndex: index,
        totalChunks: chunks.length,
      }

      // Use a simpler encryption approach for chunks to reduce overhead
      return CryptoJS.AES.encrypt(JSON.stringify(chunkData), encryptionKey).toString()
    })

    // Join the encrypted chunks with a special delimiter
    return `CHUNKED_ENCRYPTION_V3|||${chunks.length}|||${encryptedChunks.join("|||CHUNK_DELIMITER|||")}`
  } catch (error) {
    console.error("Encryption error:", error)
    throw new Error("Failed to encrypt the image: " + (error instanceof Error ? error.message : String(error)))
  }
}

export async function convertEncryptedTextToImage(encryptedText: string, password?: string): Promise<string> {
  try {
    // Check if this is a chunked encryption (v3 format)
    if (encryptedText.startsWith("CHUNKED_ENCRYPTION_V3|||")) {
      // Extract the chunks
      const parts = encryptedText.split("|||")
      const totalChunks = Number.parseInt(parts[1], 10)
      const chunksText = parts.slice(2).join("|||")
      const encryptedChunks = chunksText.split("|||CHUNK_DELIMITER|||")

      // Verify we have the right number of chunks
      if (encryptedChunks.length !== totalChunks) {
        throw new Error("Corrupted encrypted data: chunk count mismatch")
      }

      // If password protected but no password provided
      if (!password || password.trim().length === 0) {
        // Try to decrypt the first chunk to check if password is required
        try {
          const firstChunk = encryptedChunks[0]
          const decryptedChunk = CryptoJS.AES.decrypt(firstChunk, BASE_SECRET_KEY).toString(CryptoJS.enc.Utf8)
          const chunkData = JSON.parse(decryptedChunk)

          if (chunkData.isPasswordProtected) {
            throw new Error("PASSWORD_REQUIRED")
          }
        } catch (e) {
          // If we can't decrypt with base key, assume password is required
          throw new Error("PASSWORD_REQUIRED")
        }
      }

      // Determine the decryption key
      const decryptionKey = password ? `${BASE_SECRET_KEY}-${password}` : BASE_SECRET_KEY

      // Decrypt and combine all chunks
      let combinedBase64 = ""

      for (let i = 0; i < encryptedChunks.length; i++) {
        try {
          const decryptedChunk = CryptoJS.AES.decrypt(encryptedChunks[i], decryptionKey).toString(CryptoJS.enc.Utf8)
          const chunkData = JSON.parse(decryptedChunk)
          combinedBase64 += chunkData.data
        } catch (e) {
          throw new Error("INCORRECT_PASSWORD")
        }
      }

      // Validate the base64 data
      if (!combinedBase64.startsWith("data:image")) {
        throw new Error("Invalid encrypted text")
      }

      return combinedBase64
    }

    // Check if this is a chunked encryption (v2 format)
    if (encryptedText.startsWith("CHUNKED_ENCRYPTION_V2|||")) {
      // Extract the chunks
      const parts = encryptedText.split("|||")
      const totalChunks = Number.parseInt(parts[1], 10)
      const chunksText = parts.slice(2).join("|||")
      const encryptedChunks = chunksText.split("|||CHUNK_DELIMITER|||")

      // Verify we have the right number of chunks
      if (encryptedChunks.length !== totalChunks) {
        throw new Error("Corrupted encrypted data: chunk count mismatch")
      }

      // If password protected but no password provided
      if (!password || password.trim().length === 0) {
        // Try to decrypt the first chunk to check if password is required
        try {
          const firstChunk = encryptedChunks[0]
          const decryptedChunk = CryptoJS.AES.decrypt(firstChunk, BASE_SECRET_KEY).toString(CryptoJS.enc.Utf8)
          const chunkData = JSON.parse(decryptedChunk)

          if (chunkData.isPasswordProtected) {
            throw new Error("PASSWORD_REQUIRED")
          }
        } catch (e) {
          // If we can't decrypt with base key, assume password is required
          throw new Error("PASSWORD_REQUIRED")
        }
      }

      // Determine the decryption key
      const decryptionKey = password ? `${BASE_SECRET_KEY}-${password}` : BASE_SECRET_KEY

      // Decrypt and combine all chunks
      let combinedBase64 = ""

      for (let i = 0; i < encryptedChunks.length; i++) {
        try {
          const decryptedChunk = CryptoJS.AES.decrypt(encryptedChunks[i], decryptionKey).toString(CryptoJS.enc.Utf8)
          const chunkData = JSON.parse(decryptedChunk)
          combinedBase64 += chunkData.data
        } catch (e) {
          throw new Error("INCORRECT_PASSWORD")
        }
      }

      // Validate the base64 data
      if (!combinedBase64.startsWith("data:image")) {
        throw new Error("Invalid encrypted text")
      }

      return combinedBase64
    }

    // Check if this is a chunked encryption (v1 format for backward compatibility)
    if (encryptedText.startsWith("CHUNKED_ENCRYPTION|||")) {
      // Extract the chunks
      const chunksText = encryptedText.replace("CHUNKED_ENCRYPTION|||", "")
      const encryptedChunks = chunksText.split("|||CHUNK_DELIMITER|||")

      // If password protected but no password provided
      if (!password || password.trim().length === 0) {
        // Try to decrypt the first chunk to check if password is required
        try {
          const firstChunk = encryptedChunks[0]
          const decryptedChunk = CryptoJS.AES.decrypt(firstChunk, BASE_SECRET_KEY).toString(CryptoJS.enc.Utf8)
          const chunkData = JSON.parse(decryptedChunk)

          if (chunkData.isPasswordProtected) {
            throw new Error("PASSWORD_REQUIRED")
          }
        } catch (e) {
          throw new Error("PASSWORD_REQUIRED")
        }
      }

      // Determine the decryption key
      const decryptionKey = password ? `${BASE_SECRET_KEY}-${password}` : BASE_SECRET_KEY

      // Decrypt and combine all chunks
      let combinedBase64 = ""

      for (let i = 0; i < encryptedChunks.length; i++) {
        try {
          const decryptedChunk = CryptoJS.AES.decrypt(encryptedChunks[i], decryptionKey).toString(CryptoJS.enc.Utf8)
          const chunkData = JSON.parse(decryptedChunk)
          combinedBase64 += chunkData.data
        } catch (e) {
          throw new Error("INCORRECT_PASSWORD")
        }
      }

      // Validate the base64 data
      if (!combinedBase64.startsWith("data:image")) {
        throw new Error("Invalid encrypted text")
      }

      return combinedBase64
    }

    // Standard (non-chunked) decryption
    try {
      // First decrypt the outer layer to get the structure
      const decryptedOuter = CryptoJS.AES.decrypt(encryptedText, BASE_SECRET_KEY).toString(CryptoJS.enc.Utf8)

      // Parse the JSON to get the encrypted data and metadata
      const encryptedData: EncryptedData = JSON.parse(decryptedOuter)

      // If password protected but no password provided
      if (encryptedData.isPasswordProtected && (!password || password.trim().length === 0)) {
        throw new Error("PASSWORD_REQUIRED")
      }

      // Determine the decryption key
      const decryptionKey = encryptedData.isPasswordProtected ? `${BASE_SECRET_KEY}-${password}` : BASE_SECRET_KEY

      // Decrypt the actual data
      const decrypted = CryptoJS.AES.decrypt(encryptedData.data, decryptionKey).toString(CryptoJS.enc.Utf8)

      // The decrypted text should be a base64 image
      if (!decrypted.startsWith("data:image")) {
        if (encryptedData.isPasswordProtected) {
          throw new Error("INCORRECT_PASSWORD")
        }
        throw new Error("Invalid encrypted text")
      }

      return decrypted
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message === "PASSWORD_REQUIRED") {
          throw new Error("PASSWORD_REQUIRED")
        }
        if (error.message === "INCORRECT_PASSWORD") {
          throw new Error("INCORRECT_PASSWORD")
        }
        if (error.message.includes("Malformed UTF-8")) {
          throw new Error("INCORRECT_PASSWORD")
        }
      }

      throw new Error("Failed to decrypt the text. The input may be invalid or corrupted.")
    }
  } catch (error) {
    console.error("Decryption error:", error)

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message === "PASSWORD_REQUIRED") {
        throw new Error("PASSWORD_REQUIRED")
      }
      if (error.message === "INCORRECT_PASSWORD") {
        throw new Error("INCORRECT_PASSWORD")
      }
    }

    throw new Error("Failed to decrypt the text. The input may be invalid or corrupted.")
  }
}

// Helper function to split a string into chunks of specified size
function splitIntoChunks(str: string, chunkSize: number): string[] {
  const chunks = []
  for (let i = 0; i < str.length; i += chunkSize) {
    chunks.push(str.substring(i, i + chunkSize))
  }
  return chunks
}
