"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { convertEncryptedTextToImage } from "@/lib/actions"
import {
  Loader2,
  Download,
  Lock,
  Key,
  FileText,
  ImageIcon,
  Info,
  CheckCircle2,
  Share2,
  AlertTriangle,
  FileWarning,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export default function TextToImage() {
  const [encryptedText, setEncryptedText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [progress, setProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [isShareSupported, setIsShareSupported] = useState(false)
  const [processingStage, setProcessingStage] = useState<string | null>(null)
  const { toast } = useToast()

  // Check if Web Share API is supported
  useState(() => {
    setIsShareSupported(typeof navigator !== "undefined" && !!navigator.share)
  })

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEncryptedText(e.target.value)
    setImageUrl(null)
    setError(null)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0])
    }
  }

  const processSelectedFile = (selectedFile: File) => {
    setFile(selectedFile)
    setError(null)

    // Read file content
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setEncryptedText(event.target.result as string)
        setImageUrl(null)
      }
    }
    reader.onerror = () => {
      setError("Failed to read the file. Please try again.")
      toast({
        title: "File Error",
        description: "Failed to read the file. Please try again.",
        variant: "destructive",
      })
    }
    reader.readAsText(selectedFile)

    toast({
      title: "File loaded",
      description: `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`,
    })
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0])
    }
  }

  const processDecryption = async (passwordToUse?: string) => {
    if (!encryptedText.trim()) return

    setIsLoading(true)
    setPasswordError("")
    setError(null)
    setProgress(0)
    setProcessingStage("Analyzing encrypted data...")

    // Check if this is a chunked encryption (large file)
    const isChunkedEncryption = encryptedText.startsWith("CHUNKED_ENCRYPTION")

    // Simulate progress for better UX
    const progressInterval = setInterval(
      () => {
        setProgress((prev) => {
          // Slower progress for chunked encryptions
          const increment = isChunkedEncryption ? Math.random() * 3 : Math.random() * 10
          const newProgress = prev + increment
          return newProgress >= 90 ? 90 : newProgress
        })
      },
      isChunkedEncryption ? 800 : 300,
    )

    try {
      // For chunked encryptions, we need to process in stages
      if (isChunkedEncryption) {
        setProcessingStage("Decrypting chunks...")
      } else {
        setProcessingStage("Decrypting image...")
      }

      const result = await convertEncryptedTextToImage(encryptedText, passwordToUse)
      setImageUrl(result)
      setPasswordDialogOpen(false)
      setProgress(100)
      setProcessingStage(null)

      toast({
        title: "Decryption Complete",
        description: "Your image has been successfully decrypted.",
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      })
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        if (error.message === "PASSWORD_REQUIRED") {
          setPasswordDialogOpen(true)
          clearInterval(progressInterval)
          setIsLoading(false)
          setProcessingStage(null)
          return
        } else if (error.message === "INCORRECT_PASSWORD") {
          setPasswordError("Incorrect password. Please try again.")
          clearInterval(progressInterval)
          setIsLoading(false)
          setProcessingStage(null)
          return
        } else {
          setError(error.message)
        }
      } else {
        setError("Unknown error occurred during decryption")
      }

      setShowErrorDialog(true)
      toast({
        title: "Decryption Failed",
        description: "Failed to convert text to image. Click for details.",
        variant: "destructive",
        action: (
          <Button variant="outline" size="sm" onClick={() => setShowErrorDialog(true)}>
            Details
          </Button>
        ),
      })
    } finally {
      clearInterval(progressInterval)
      setIsLoading(false)
      setProcessingStage(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await processDecryption()
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await processDecryption(password)
  }

  const downloadImage = () => {
    if (!imageUrl) return

    try {
      // Create a temporary link element
      const a = document.createElement("a")
      a.href = imageUrl
      a.download = `decrypted-image-${new Date().toISOString().slice(0, 10)}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      toast({
        title: "Download started",
        description: "Your decrypted image is being downloaded.",
      })
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Download failed",
        description: "Failed to download the image. Try right-clicking and saving it manually.",
        variant: "destructive",
      })
    }
  }

  const shareImage = async () => {
    if (!imageUrl || !navigator.share) return

    try {
      // Try to share the image
      try {
        // Convert base64 to blob
        const fetchResponse = await fetch(imageUrl)
        const blob = await fetchResponse.blob()

        // Get file extension from MIME type
        const mimeType = blob.type
        const extension = mimeType.split("/")[1] || "png"

        // Create a file to share
        const file = new File([blob], `decrypted-image-${new Date().toISOString().slice(0, 10)}.${extension}`, {
          type: mimeType,
        })

        await navigator.share({
          title: "Decrypted Image",
          files: [file],
        })
      } catch (fileError) {
        // If sharing as a file fails, try sharing just the URL
        // This is a fallback that likely won't work in most cases
        await navigator.share({
          title: "Decrypted Image",
          text: "Check out this decrypted image",
        })
      }

      toast({
        title: "Shared successfully",
        description: "Your decrypted image has been shared.",
      })
    } catch (error) {
      console.error("Error sharing:", error)
      toast({
        title: "Sharing failed",
        description: "Could not share the image. Please use the download button instead.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/50">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Text to Image Decryption
          </CardTitle>
          <CardDescription>Paste encrypted text or upload a text file to convert back to an image</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="text-upload" className="text-base font-medium">
                  Upload Text File (Optional)
                </Label>
              </div>

              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 transition-colors",
                  dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                  "hover:border-primary/50 hover:bg-primary/5",
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center gap-2 py-2">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium mb-1">Drag and drop your text file here</p>
                    <p className="text-xs text-muted-foreground mb-3">or click to browse (.txt files)</p>
                    <Button type="button" variant="secondary" size="sm" asChild>
                      <label htmlFor="text-upload" className="cursor-pointer">
                        Browse Files
                        <Input
                          id="text-upload"
                          type="file"
                          accept=".txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="encrypted-text-input" className="text-base font-medium">
                Encrypted Text
              </Label>
              <Textarea
                id="encrypted-text-input"
                value={encryptedText}
                onChange={handleTextChange}
                placeholder="Paste the encrypted text here..."
                className="h-48 font-mono text-xs resize-none"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Paste the encrypted text you received or upload a text file.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={!encryptedText.trim() || isLoading} size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {processingStage || "Decrypting..."}
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Decrypt to Image
                </>
              )}
            </Button>

            {isLoading && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  {processingStage || "Processing..."} {Math.round(progress)}%
                  {(encryptedText.startsWith("CHUNKED_ENCRYPTION") || encryptedText.length > 100000) && (
                    <span className="ml-1">(Large file, this may take a moment)</span>
                  )}
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {imageUrl && (
        <Card className="border-primary/20">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              Decryption Complete
            </CardTitle>
            <CardDescription>Your encrypted text has been successfully converted back to an image</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Decrypted Image</Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={downloadImage}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>

                  {isShareSupported && (
                    <Button variant="outline" size="sm" onClick={shareImage}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex justify-center p-4 bg-muted/30 rounded-lg border">
                <img
                  src={imageUrl || "/placeholder.svg"}
                  alt="Decrypted"
                  className="rounded-md max-h-96 object-contain"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/20 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Your image has been successfully decrypted and is ready to download.
            </p>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setEncryptedText("")
                setImageUrl(null)
                setFile(null)
                setError(null)
              }}
            >
              Decrypt Another Image
            </Button>
          </CardFooter>
        </Card>
      )}

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Lock className="h-5 w-5 mr-2 text-amber-500" />
              Password Protected Image
            </DialogTitle>
            <DialogDescription>
              This encrypted image is password protected. Please enter the password to decrypt it.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="decrypt-password">Password</Label>
                <div className="relative">
                  <Input
                    id="decrypt-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className={cn("pr-10", passwordError ? "border-destructive ring-destructive" : "")}
                    autoFocus
                  />
                  <Key className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                </div>
                {passwordError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <Info className="h-3 w-3" /> {passwordError}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!password.trim() || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Decrypting...
                  </>
                ) : (
                  "Decrypt"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-destructive" />
              Decryption Error
            </DialogTitle>
            <DialogDescription>An error occurred while processing your encrypted text.</DialogDescription>
          </DialogHeader>

          <div className="bg-destructive/10 p-4 rounded-md border border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive mb-1">Error details:</p>
                <p className="text-sm">{error || "Unknown error occurred"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium">Troubleshooting tips:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Make sure you've pasted the complete encrypted text</li>
              <li>Check if the text requires a password</li>
              <li>Try a different browser (Chrome or Firefox recommended)</li>
              <li>Make sure you're using text from this application</li>
              <li>For large images, try using the original application that created the encrypted text</li>
            </ul>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowErrorDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
