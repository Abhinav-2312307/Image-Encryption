import Link from "next/link"
import { Github, Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t py-8 md:py-12">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div>
          <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            CryptoImage
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Secure image encryption made simple
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 md:gap-8 text-sm">
          <Link href="#privacy" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link href="#terms" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
          <Link href="#contact" className="hover:text-primary transition-colors">
            Contact
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
            <span className="sr-only">GitHub</span>
          </a>
        </div>
      </div>
      
      <div className="container mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
        <p className="flex items-center justify-center gap-1">
          Made with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> using Next.js and Tailwind CSS
        </p>
        <p className="mt-1">
          © {new Date().getFullYear()} CryptoImage. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
