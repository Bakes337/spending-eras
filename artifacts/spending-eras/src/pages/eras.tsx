import { useEffect, useRef } from "react";
import {
  useGetEras,
  useGetAccounts,
  useAnalyzeEras,
  useSyncTransactions,
  getGetErasQueryKey,
  getGetErasSummaryQueryKey,
  getGetAccountsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import EraCard from "@/components/era-card";
import TimelinePurchaseDots from "@/components/era-timeline-dots";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const POLL_INTERVAL_MS = 6000;

const ANALYSIS_STEPS = [
  "Categorizing your transactions",
  "Identifying spending patterns",
  "Grouping into seasonal eras",
  "Naming your spending chapters",
  "Calculating highlights & fun facts",
];

function AnalyzingState({ txCount }: { txCount: number }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg text-center space-y-10"
      >
        {/* Animated icon */}
        <div className="relative mx-auto w-24 h-24">
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-display font-bold">Analyzing your spending</h1>
          {txCount > 0 && (
            <p className="text-muted-foreground">
              Crunching{" "}
              <span className="text-foreground font-semibold">{txCount.toLocaleString()} transactions</span>{" "}
              to build your story
            </p>
          )}
        </div>

        {/* Animated step list */}
        <div className="space-y-3 text-left">
          {ANALYSIS_STEPS.map((step, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.3, duration: 0.4 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border"
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-primary flex-shrink-0"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.6,
                  delay: i * 0.25,
                  ease: "easeInOut",
                }}
              />
              <span className="text-sm text-muted-foreground">{step}</span>
            </motion.div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">This usually takes just a moment…</p>
      </motion.div>
    </div>
  );
}

function RebuildingOverlay() {
  return (
    <motion.div
      key="rebuilding-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-3xl bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex flex-col items-center gap-5 text-center px-6"
      >
        <div className="relative w-16 h-16">
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-lg">Rebuilding your timeline</p>
          <p className="text-sm text-muted-foreground">AI is re-analyzing your transactions…</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2, ease: "easeInOut" }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ErasTimeline() {
  const { data: eras, isLoading: erasLoading, isError } = useGetEras();
  const { data: accounts } = useGetAccounts();
  const analyzeEras = useAnalyzeEras();
  const syncTransactions = useSyncTransactions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasAccounts = (accounts?.length ?? 0) > 0;
  const totalTxCount = accounts?.reduce((sum, a) => sum + (a.transactionCount ?? 0), 0) ?? 0;
  const isAnalyzing = !erasLoading && hasAccounts && (eras?.length ?? 0) === 0;

  // Kick off analysis and poll until eras appear
  useEffect(() => {
    if (!isAnalyzing) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    async function runCycle() {
      try {
        await syncTransactions.mutateAsync();
        await analyzeEras.mutateAsync();
        await queryClient.invalidateQueries({ queryKey: getGetErasQueryKey() });
        await queryClient.invalidateQueries({ queryKey: getGetErasSummaryQueryKey() });
        await queryClient.invalidateQueries({ queryKey: getGetAccountsQueryKey() });
      } catch {
        // silent — will retry
      }
    }

    // First attempt immediately
    runCycle();

    // Then poll on interval
    pollingRef.current = setInterval(runCycle, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnalyzing]);

  const handleRefresh = async () => {
    try {
      await syncTransactions.mutateAsync();
      await analyzeEras.mutateAsync();
      queryClient.invalidateQueries({ queryKey: getGetErasQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetErasSummaryQueryKey() });
      toast({ title: "Eras refreshed", description: "Your timeline has been rebuilt from your transactions." });
    } catch {
      toast({ title: "Refresh failed", description: "Could not re-analyze transactions.", variant: "destructive" });
    }
  };

  if (erasLoading) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-12 flex flex-col gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-80 rounded-3xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Couldn't load eras</h2>
          <Button asChild variant="outline">
            <Link href="/connect">Check connection status</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Accounts connected but analysis still running
  if (isAnalyzing) {
    return <AnalyzingState txCount={totalTxCount} />;
  }

  // No accounts connected and no eras — prompt to connect
  if (!eras || eras.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-4xl mb-6">
          👻
        </div>
        <h2 className="text-2xl font-bold mb-2">No eras yet</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Connect a bank account to see your spending story.
        </p>
        <Button asChild>
          <Link href="/connect">Get Started</Link>
        </Button>
      </div>
    );
  }

  const isRefreshing = analyzeEras.isPending || syncTransactions.isPending;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight">Your Timeline</h1>
          <p className="text-muted-foreground mt-2">A journey through your spending habits.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-full gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Rebuilding…" : "Refresh eras"}
          </Button>
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </motion.div>

      <div className="relative">
        <AnimatePresence>
          {isRefreshing && <RebuildingOverlay />}
        </AnimatePresence>
        <div className="absolute left-8 top-8 bottom-8 w-px bg-border hidden md:block" />
        <AnimatePresence>
          <div className={`space-y-16 transition-opacity duration-300 ${isRefreshing ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
            {eras.map((era, index) => (
              <div key={era.id}>
                <EraCard era={era} index={index} />
                <TimelinePurchaseDots merchants={era.topMerchants} color={era.colorTheme} />
              </div>
            ))}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
}
