import { motion } from "framer-motion";
import type { TopMerchant } from "@workspace/api-client-react";

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface Props {
  merchants: TopMerchant[];
  color?: string;
}

export default function TimelinePurchaseDots({ merchants, color }: Props) {
  if (!merchants || merchants.length === 0) return null;

  const isHex = color?.startsWith("#");
  const accent = isHex ? color! : "var(--color-primary)";

  return (
    <motion.div
      className="hidden md:block pl-16 py-4"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: 0.25 }}
    >
      <div
        className="rounded-2xl overflow-hidden border"
        style={{
          backgroundColor: isHex ? `${accent}08` : "var(--color-card)",
          borderColor: isHex ? `${accent}25` : "var(--color-border)",
        }}
      >
        {merchants.map((merchant, i) => (
          <motion.div
            key={`${merchant.name}-${i}`}
            className="flex items-center justify-between px-5 py-3.5"
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: 0.35 + i * 0.1 }}
            style={{
              borderBottom:
                i < merchants.length - 1
                  ? `1px solid ${isHex ? `${accent}15` : "var(--color-border)"}`
                  : "none",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: isHex ? `${accent}90` : "var(--color-primary)" }}
              />
              <span className="text-sm font-medium text-foreground/85">
                {merchant.name}
              </span>
              {merchant.visits != null && merchant.visits > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-md font-medium"
                  style={{
                    color: accent,
                    backgroundColor: isHex ? `${accent}18` : "var(--color-muted)",
                  }}
                >
                  {merchant.visits}×
                </span>
              )}
            </div>
            <span
              className="text-sm font-bold font-mono tabular-nums"
              style={{ color: accent }}
            >
              {formatAmount(merchant.amount)}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
