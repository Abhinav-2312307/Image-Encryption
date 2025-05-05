"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { convertImageToEncryptedText } from "@/lib/actions"
import { compressImage } from "@/lib/image-utils"
import {
  Loader2,
  Copy,
  Download,
  Upload,
  Lock,
  Unlock,
  ImageIcon,
  Info,
  CheckCircle2,
  Share2,
  AlertTriangle,
  FileWarning,
  Zap,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

export default function ImageToText() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [encryptedText, setEncryptedText] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [usePassword, setUsePassword] = useState(false)
  const [password, setPassword] = useState("")
  const [progress, setProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [isShareSupported, setIsShareSupported] = useState(false)
  const [autoCompress, setAutoCompress] = useState(true)
  const [compressionQuality, setCompressionQuality] = useState(0.7)
  const [processingStage, setProcessingStage] = useState<string | null>(null)
  const { toast } = useToast()

  // Check if Web Share API is supported
  useEffect(() => {
    setIsShareSupported(typeof navigator !== "undefined" && !!navigator.share)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0])
    }
  }

  const processSelectedFile = (selectedFile: File) => {
    // Reset any previous errors
    setError(null)

    // Check file type
    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, GIF, etc.)")
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, GIF, etc.)",
        variant: "destructive",
      })
      return
    }

    // Warn about very large files
    if (selectedFile.size > 5 * 1024 * 1024) {
      // 5MB
      toast({
        title: "Large file detected",
        description: "This file will be automatically compressed for better compatibility",
        variant: "warning",
      })
    }

    setFile(selectedFile)

    // Create preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setPreview(event.target?.result as string)
    }
    reader.readAsDataURL(selectedFile)

    // Reset encrypted text when new file is selected
    setEncryptedText("")

    toast({
      title: "Image selected",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    if (usePassword && !password.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter a password or disable password protection.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setProgress(0)
    setError(null)
    setProcessingStage("Preparing image...")

    try {
      // Process the file in stages to avoid memory issues
      let processedFile = file

      // Step 1: Compress the image if needed
      if (autoCompress && file.size > 1024 * 1024) {
        setProcessingStage("Compressing image...")
        setProgress(10)
        processedFile = await compressImage(file, 1, compressionQuality)

        // Log compression results
        console.log(`Compressed from ${(file.size / 1024).toFixed(1)}KB to ${(processedFile.size / 1024).toFixed(1)}KB`)

        if (processedFile.size < file.size) {
          toast({
            title: "Image compressed",
            description: `Reduced from ${(file.size / 1024).toFixed(1)}KB to ${(processedFile.size / 1024).toFixed(1)}KB`,
            icon: <Zap className="h-4 w-4 text-green-500" />,
          })
        }
      }

      // Step 2: Convert to base64
      setProcessingStage("Converting to base64...")
      setProgress(30)

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result)
          } else {
            reject(new Error("Failed to convert file to base64"))
          }
        }
        reader.onerror = () => reject(new Error("Error reading file"))
        reader.readAsDataURL(processedFile)
      })

      // Step 3: Encrypt the image
      setProcessingStage("Encrypting image...")
      setProgress(50)

      // Use the server action with the base64 data
      const result = await convertImageToEncryptedText(
        base64,
        processedFile.name,
        processedFile.type,
        processedFile.size,
        usePassword ? password : undefined,
      )

      setEncryptedText(result)
      setProgress(100)
      setProcessingStage(null)

      toast({
        title: "Encryption Complete",
        description: "Your image has been successfully encrypted.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error details:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to process the image. Please try again."
      setError(errorMessage)
      setShowErrorDialog(true)

      toast({
        title: "Encryption Failed",
        description: "An error occurred. Click for details.",
        variant: "destructive",
        action: (
          <Button variant="outline" size="sm" onClick={() => setShowErrorDialog(true)}>
            Details
          </Button>
        ),
      })
    } finally {
      setIsLoading(false)
      setProcessingStage(null)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(encryptedText)
    toast({
      title: "Copied to clipboard",
      description: "Encrypted text has been copied to your clipboard.",
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    })
  }

  const downloadTextFile = () => {
    const blob = new Blob([encryptedText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `encrypted-image-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Download started",
      description: "Your encrypted text file is being downloaded.",
    })
  }

  const shareEncryptedText = async () => {
    if (!navigator.share) {
      toast({
        title: "Sharing not supported",
        description: "Your browser doesn't support the Web Share API. Use the download button instead.",
        variant: "destructive",
      })
      return
    }

    try {
      // First try sharing as a file
      try {
        const blob = new Blob([encryptedText], { type: "text/plain" })
        const file = new File([blob], `encrypted-image-${new Date().toISOString().slice(0, 10)}.txt`, {
          type: "text/plain",
        })

        await navigator.share({
          title: "Encrypted Image",
          text: "Here's my encrypted image from CryptoImage",
          files: [file],
        })
      } catch (fileError) {
        // If sharing as a file fails, try sharing just the text
        // But only if the text isn't too long
        if (encryptedText.length < 100000) {
          await navigator.share({
            title: "Encrypted Image",
            text: encryptedText,
          })
        } else {
          throw new Error("Text too long to share directly")
        }
      }

      toast({
        title: "Shared successfully",
        description: "Your encrypted text has been shared.",
      })
    } catch (error) {
      console.error("Error sharing:", error)
      toast({
        title: "Sharing failed",
        description: "Could not share the encrypted text. Please use the download button instead.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/50">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Image to Encrypted Text
          </CardTitle>
          <CardDescription>Upload an image to convert it into encrypted text</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 transition-colors",
                dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                !file && "hover:border-primary/50 hover:bg-primary/5",
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center gap-4">
                {preview ? (
                  <div className="relative w-full max-w-xs mx-auto">
                    <img
                      src={preview || "/placeholder.svg"}
                      alt="Preview"
                      className="rounded-md max-h-64 mx-auto object-contain"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
                      onClick={() => {
                        setFile(null)
                        setPreview(null)
                        setEncryptedText("")
                        setError(null)
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="bg-primary/10 rounded-full p-4">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium mb-1">Drag and drop your image here</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Supports PNG, JPG, GIF, WebP, and other image formats
                      </p>
                      <Button type="button" variant="secondary" size="sm" asChild>
                        <label htmlFor="image-upload" className="cursor-pointer">
                          Browse Files
                          <Input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4 border rounded-md p-5 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use-password"
                    checked={usePassword}
                    onCheckedChange={(checked) => setUsePassword(checked === true)}
                  />
                  <Label htmlFor="use-password" className="cursor-pointer flex items-center">
                    {usePassword ? (
                      <Lock className="h-4 w-4 mr-2 text-amber-500" />
                    ) : (
                      <Unlock className="h-4 w-4 mr-2" />
                    )}
                    Password Protect Encryption
                  </Label>
                </div>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Info className="h-4 w-4" />
                        <span className="sr-only">About password protection</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Adding a password provides an extra layer of security. The recipient will need this password to
                        decrypt the image.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {usePassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a secure password"
                    className="transition-all focus-visible:ring-amber-500"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    You'll need this password to decrypt the image later.
                  </p>
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch id="auto-compress" checked={autoCompress} onCheckedChange={setAutoCompress} />
                    <Label htmlFor="auto-compress" className="cursor-pointer">
                      Auto-compress large images
                    </Label>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Info className="h-4 w-4" />
                          <span className="sr-only">About compression</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Automatically compresses images larger than 1MB for better compatibility across browsers and
                          devices. Highly recommended for large images.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended for images larger than 1MB to ensure compatibility
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={!file || isLoading} size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {processingStage || "Processing..."}
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Encrypt Image
                </>
              )}
            </Button>

            {isLoading && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  {processingStage || "Processing your image..."} {Math.round(progress)}%
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {encryptedText && (
        <Card className="border-primary/20">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              Encryption Complete
            </CardTitle>
            <CardDescription>Your image has been successfully encrypted into text</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="encrypted-text" className="text-base font-medium">
                  Encrypted Text
                </Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>

                  <Button variant="outline" size="sm" onClick={downloadTextFile}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>

                  {isShareSupported && (
                    <Button variant="outline" size="sm" onClick={shareEncryptedText}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  )}
                </div>
              </div>
              <div className="relative">
                <Textarea
                  id="encrypted-text"
                  value={encryptedText}
                  readOnly
                  className="h-48 font-mono text-xs resize-none pr-12"
                />
                <div className="absolute right-3 top-3 opacity-50">
                  {usePassword ? <Lock className="h-4 w-4 text-amber-500" /> : <Unlock className="h-4 w-4" />}
                </div>
              </div>
              <div
                className={cn(
                  "flex items-start space-x-2 text-sm p-3 rounded-md",
                  usePassword
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "bg-blue-500/10 text-blue-700 dark:text-blue-400",
                )}
              >
                {usePassword ? (
                  <div className="flex items-center">
                    <Lock className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>
                      This encrypted text is password-protected. The recipient will need the password to decrypt it.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Unlock className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>This encrypted text can be decrypted by anyone with access to this website.</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/20 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Share this encrypted text with others to let them view your image.
            </p>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setFile(null)
                setPreview(null)
                setEncryptedText("")
                setPassword("")
                setError(null)
              }}
            >
              Encrypt Another Image
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-destructive" />
              Encryption Error
            </DialogTitle>
            <DialogDescription>An error occurred while processing your image.</DialogDescription>
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
              <li>Try enabling the "Auto-compress large images" option</li>
              <li>Try using a smaller image (under 1MB for best results)</li>
              <li>Convert GIFs to PNG or JPG before uploading</li>
              <li>Make sure your internet connection is stable</li>
              <li>Try a different browser (Chrome or Firefox recommended)</li>
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
