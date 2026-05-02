import { useState, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { usePlaidLink } from "react-plaid-link";
import {
  useGetAccounts,
  useCreateLinkToken,
  useExchangeToken,
  useSyncTransactions,
  getGetAccountsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Wallet, Building2, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function PlaidAutoOpen({
  linkToken,
  onSuccess,
  onExit,
}: {
  linkToken: string;
  onSuccess: (publicToken: string, institutionName: string) => void;
  onExit: () => void;
}) {
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      const name = metadata?.institution?.name ?? "Your Bank";
      onSuccess(public_token, name);
    },
    onExit: () => {
      onExit();
    },
  });

  useEffect(() => {
    if (ready) {
      open();
    }
  }, [ready, open]);

  return null;
}

export default function Connect() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts, isLoading: accountsLoading } = useGetAccounts();
  const createLinkToken = useCreateLinkToken();
  const exchangeToken = useExchangeToken();
  const syncTransactions = useSyncTransactions();

  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(false);

  const handleOpenPlaid = async () => {
    try {
      const result = await createLinkToken.mutateAsync();
      setLinkToken(result.linkToken);
    } catch {
      toast({
        title: "Could not start Plaid",
        description: "Failed to create a Plaid Link session. Check your credentials.",
        variant: "destructive",
      });
    }
  };

  const handlePlaidSuccess = useCallback(
    async (publicToken: string, institutionName: string) => {
      setIsExchanging(true);
      setLinkToken(null);
      try {
        await exchangeToken.mutateAsync({
          data: { publicToken, institutionName },
        });

        queryClient.invalidateQueries({ queryKey: getGetAccountsQueryKey() });
        toast({ title: "Bank connected!", description: "Pulling your transactions…" });

        await syncTransactions.mutateAsync();

        // Navigate to eras — that page handles analysis and shows a loading state
        setLocation("/eras");
      } catch {
        toast({
          title: "Connection failed",
          description: "Something went wrong after connecting. Try again.",
          variant: "destructive",
        });
        setIsExchanging(false);
      }
    },
    [exchangeToken, syncTransactions, queryClient, toast, setLocation],
  );

  const handlePlaidExit = useCallback(() => {
    setLinkToken(null);
  }, []);

  const isProcessing = isExchanging || syncTransactions.isPending || createLinkToken.isPending;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-display font-bold">Connect Accounts</h1>
          <p className="text-muted-foreground">
            Link your bank accounts to generate your personal spending eras.
          </p>
        </div>

        <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-6">
          {accountsLoading ? (
            <div className="h-20 bg-muted animate-pulse rounded-xl" />
          ) : accounts && accounts.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Connected Institutions
              </h3>
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-background border"
                  data-testid={`card-account-${acc.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">{acc.institutionName}</div>
                      <div className="text-xs text-muted-foreground">
                        {acc.accountName}{acc.mask ? ` •••• ${acc.mask}` : ""}
                      </div>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
              ))}

              <Button asChild className="w-full rounded-xl h-12 mt-4">
                <Link href="/eras">
                  View Your Eras <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {linkToken && (
                <PlaidAutoOpen
                  linkToken={linkToken}
                  onSuccess={handlePlaidSuccess}
                  onExit={handlePlaidExit}
                />
              )}

              <Button
                onClick={handleOpenPlaid}
                disabled={isProcessing || createLinkToken.isPending}
                className="w-full h-14 rounded-2xl text-lg relative overflow-hidden group"
                data-testid="button-connect-plaid"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    <span className="relative z-10">
                      {isExchanging ? "Pulling transactions…" : "Opening Plaid…"}
                    </span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-5 h-5 mr-2" />
                    <span className="relative z-10">Connect with Plaid</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground max-w-xs mx-auto">
          We use Plaid to securely connect to your bank. We never see your login credentials or
          store your passwords.
        </p>
      </motion.div>
    </div>
  );
}
