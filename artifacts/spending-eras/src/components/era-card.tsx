import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import type { SpendingEra } from "@workspace/api-client-react";

// Clean up primary Plaid category labels for display.
// "GENERAL MERCHANDISE" → "General Merchandise", "FOOD AND DRINK" → "Food & Drink"
function formatCategory(cat: string): string {
  return cat
    .toLowerCase()
    .replace(/\band\b/g, "&")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function EraCard({ era, index }: { era: SpendingEra, index: number }) {
  const isHex = era.colorTheme.startsWith('#');
  const accentColor = isHex ? era.colorTheme : 'var(--color-primary)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="relative md:pl-16 group"
    >
      {/* Timeline dot */}
      <div
        className="absolute left-[31px] top-12 w-3 h-3 rounded-full border-2 border-background z-10 hidden md:block transition-transform group-hover:scale-150"
        style={{ backgroundColor: accentColor }}
      />

      <Link href={`/eras/${era.id}`} className="block">
        <div
          className="overflow-hidden rounded-[2rem] border transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl"
          style={{
            backgroundColor: isHex ? `${era.colorTheme}15` : 'var(--color-card)',
            borderColor: isHex ? `${era.colorTheme}30` : 'var(--color-border)'
          }}
        >
          <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start">

            {/* Emoji circle */}
            <div
              className="w-24 h-24 md:w-28 md:h-28 shrink-0 rounded-full flex items-center justify-center text-5xl shadow-inner border-4 border-background/50 mt-1"
              style={{ backgroundColor: accentColor }}
            >
              {era.emoji}
            </div>

            <div className="flex-1 space-y-4 min-w-0">

              {/* Timing */}
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                {era.season} {era.year}
              </div>

              {/* Title */}
              <h2
                className="text-3xl md:text-4xl font-display font-bold leading-tight"
                style={{ color: accentColor }}
              >
                {era.name}
              </h2>

              {/* Tagline — the cinematic narrator line */}
              <p className="text-base text-foreground/80 leading-relaxed italic">
                "{era.description}"
              </p>

              {/* Therapy says */}
              <div
                className="rounded-xl px-4 py-3 border"
                style={{
                  backgroundColor: isHex ? `${era.colorTheme}10` : 'var(--color-muted)',
                  borderColor: isHex ? `${era.colorTheme}25` : 'var(--color-border)',
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: accentColor }}>
                  Therapy says
                </p>
                <p className="text-sm text-foreground/85 leading-relaxed">
                  {era.tagline}
                </p>
              </div>

              {/* Bottom row: categories */}
              {era.topCategories && era.topCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {era.topCategories.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
                      style={{
                        color: accentColor,
                        borderColor: isHex ? `${era.colorTheme}35` : 'var(--color-border)',
                        backgroundColor: isHex ? `${era.colorTheme}12` : 'var(--color-muted)',
                      }}
                    >
                      {formatCategory(cat)}
                    </span>
                  ))}
                </div>
              )}

            </div>

            {/* Arrow on hover */}
            <div className="shrink-0 p-4 rounded-full bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex self-center">
              <ArrowRight className="w-6 h-6" style={{ color: accentColor }} />
            </div>

          </div>
        </div>
      </Link>
    </motion.div>
  );
}
