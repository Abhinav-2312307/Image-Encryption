import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ImageToText from "@/components/image-to-text"
import TextToImage from "@/components/text-to-image"
import { HelpCircle, ShieldCheck, Zap } from 'lucide-react'

export default function Home() {
  return (
    <div className="container mx-auto py-8 px-4 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">CryptoImage</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Securely convert your images to encrypted text and back again with optional password protection
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-card border rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-medium text-lg mb-2">Secure Encryption</h3>
            <p className="text-sm text-muted-foreground">
              Your images are encrypted using AES-256, one of the strongest encryption algorithms available.
            </p>
          </div>
          
          <div className="bg-card border rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-medium text-lg mb-2">Fast Processing</h3>
            <p className="text-sm text-muted-foreground">
              Convert your images to encrypted text and back in seconds, right in your browser.
            </p>
          </div>
          
          <div className="bg-card border rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-medium text-lg mb-2">Easy to Use</h3>
            <p className="text-sm text-muted-foreground">
              Simple interface with optional password protection for enhanced security.
            </p>
          </div>
        </div>

        <Tabs defaultValue="image-to-text" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="image-to-text" className="text-sm md:text-base py-3">
              Encrypt Image to Text
            </TabsTrigger>
            <TabsTrigger value="text-to-image" className="text-sm md:text-base py-3">
              Decrypt Text to Image
            </TabsTrigger>
          </TabsList>
          <TabsContent value="image-to-text">
            <ImageToText />
          </TabsContent>
          <TabsContent value="text-to-image">
            <TextToImage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
