import { useLocation } from "wouter";
import { ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetErasSummary } from "@workspace/api-client-react";
import { motion } from "framer-motion";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: summary, isLoading, isError } = useGetErasSummary();

  const hasEras = (summary?.totalEras ?? 0) > 0;
  const isConnected = summary?.connected;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-3xl text-center space-y-8"
      >
        <div className="inline-flex items-center justify-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Sparkles className="mr-2 h-4 w-4" />
          Your financial story, decoded
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-balance">
          Meet Your <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-violet-400">
            Spending Eras
          </span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
          We analyzed your transactions and grouped them into colorful, personality-driven "eras". Discover the hidden rhythms of your money.
        </p>

        <div className="pt-8 space-y-6">
          {/* Stats row — skeleton while loading, real numbers when ready */}
          {isLoading ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="h-24 w-44 bg-muted animate-pulse rounded-2xl" />
              <div className="h-24 w-44 bg-muted animate-pulse rounded-2xl" />
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Couldn't reach the server. Try refreshing.</span>
            </div>
          ) : hasEras ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-left">
              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <div className="text-4xl font-display font-bold text-primary mb-1">{summary!.totalEras}</div>
                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Distinct Eras</div>
              </div>
              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <div className="text-4xl font-display font-bold text-primary mb-1">${(summary!.totalSpent / 1000).toFixed(1)}k</div>
                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Spent</div>
              </div>
            </div>
          ) : null}

          {/* CTA button — always visible, resolves to correct action once loaded */}
          {!isLoading && isConnected && hasEras ? (
            <Button
              size="lg"
              className="rounded-full px-8 h-14 text-lg font-medium"
              onClick={() => setLocation('/eras')}
            >
              View Your Eras
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : !isLoading ? (
            <div className="space-y-4">
              <Button
                size="lg"
                className="rounded-full px-8 h-14 text-lg font-medium shadow-lg shadow-primary/25"
                onClick={() => setLocation('/connect')}
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-sm text-muted-foreground">Connect your bank or use sample data.</p>
            </div>
          ) : (
            <Button
              size="lg"
              className="rounded-full px-8 h-14 text-lg font-medium"
              disabled
              onClick={() => setLocation('/eras')}
            >
              View Your Eras
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
