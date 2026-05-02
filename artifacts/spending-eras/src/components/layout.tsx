import { ReactNode } from "react";
import { Link } from "wouter";
import { Sparkles, Wallet } from "lucide-react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container max-w-5xl mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">Spending Eras</span>
          </Link>
          
          <nav className="flex items-center gap-4">
            <Link 
              href="/connect" 
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Wallet className="h-4 w-4" />
              <span>Accounts</span>
            </Link>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
