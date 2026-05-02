import { useRoute, Link } from "wouter";
import { useGetEra, getGetEraQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, DollarSign, TrendingUp, Award, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from "recharts";

export default function EraDetail() {
  const [, params] = useRoute("/eras/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  
  const { data: era, isLoading, isError } = useGetEra(id, {
    query: {
      enabled: !!id,
      queryKey: getGetEraQueryKey(id)
    }
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col p-8">
        <div className="h-64 w-full rounded-3xl bg-muted animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-96 rounded-3xl bg-muted animate-pulse" />
          <div className="space-y-4">
            <div className="h-24 rounded-3xl bg-muted animate-pulse" />
            <div className="h-24 rounded-3xl bg-muted animate-pulse" />
            <div className="h-24 rounded-3xl bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !era) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-destructive">Couldn't load era details</h2>
          <Button asChild variant="outline">
            <Link href="/eras">Back to timeline</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isHex = era.colorTheme.startsWith('#');
  const colorStr = isHex ? era.colorTheme : 'var(--color-primary)';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-x-hidden">
      {/* Hero section */}
      <div 
        className="relative pt-24 pb-16 px-4 shrink-0 transition-colors duration-700 overflow-hidden"
        style={{ backgroundColor: isHex ? `${era.colorTheme}15` : 'var(--color-card)' }}
      >
        <div 
          className="absolute top-0 left-0 w-full h-full opacity-30" 
          style={{
            background: `radial-gradient(circle at top right, ${colorStr}, transparent 60%)`
          }}
        />
        
        <div className="container max-w-5xl mx-auto relative z-10">
          <Button variant="ghost" size="icon" asChild className="absolute -top-12 left-0 rounded-full bg-background/50 hover:bg-background/80 backdrop-blur-md">
            <Link href="/eras">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="flex flex-col items-center text-center max-w-3xl mx-auto"
          >
            <div 
              className="text-8xl md:text-9xl mb-6 filter drop-shadow-2xl"
              style={{ textShadow: `0 0 40px ${colorStr}60` }}
            >
              {era.emoji}
            </div>
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-background/40 backdrop-blur-md border border-white/10 mb-6 text-sm font-medium tracking-wide uppercase">
              <Calendar className="w-4 h-4" />
              {era.season} {era.year}
            </div>
            
            <h1 
              className="text-5xl md:text-7xl font-display font-bold mb-4 tracking-tight leading-tight"
              style={{ color: colorStr }}
            >
              {era.name}
            </h1>
            
            <p className="text-xl md:text-2xl text-foreground/80 font-medium mb-6">
              "{era.tagline}"
            </p>

            {era.categoryVibe && (
              <div className="mb-6">
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
                  style={{
                    color: colorStr,
                    borderColor: isHex ? `${era.colorTheme}35` : 'var(--color-border)',
                    backgroundColor: isHex ? `${era.colorTheme}12` : 'var(--color-muted)',
                  }}
                >
                  {era.categoryVibe}
                </span>
              </div>
            )}
            
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              {era.description}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content section */}
      <div className="flex-1 container max-w-5xl mx-auto px-4 py-16">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          
          {/* Main stats col */}
          <motion.div variants={itemVariants} className="lg:col-span-8 space-y-8">
            
            {/* Category Chart */}
            <div className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
                Where it went
              </h3>
              
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={era.categoryBreakdown} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="category" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
                      width={120}
                    />
                    <RechartsTooltip 
                      cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover border border-border p-3 rounded-xl shadow-xl">
                              <p className="font-medium text-foreground mb-1">{payload[0].payload.category}</p>
                              <p className="text-muted-foreground text-sm flex items-center justify-between gap-4">
                                <span>Total:</span>
                                <span className="font-bold text-foreground">${payload[0].value?.toLocaleString()}</span>
                              </p>
                              <p className="text-muted-foreground text-sm flex items-center justify-between gap-4">
                                <span>Transactions:</span>
                                <span className="font-bold text-foreground">{payload[0].payload.transactionCount}</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={32}>
                      {era.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? colorStr : 'hsl(var(--muted-foreground)/0.3)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Merchants */}
            <div className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-muted-foreground" />
                Top Merchants
              </h3>
              <div className="space-y-4">
                {era.topMerchants.map((merchant, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-border/50 hover:border-border transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                        {merchant.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold">{merchant.name}</div>
                        <div className="text-xs text-muted-foreground">{merchant.category} • {merchant.visits} visits</div>
                      </div>
                    </div>
                    <div className="font-medium text-lg">
                      ${merchant.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </motion.div>

          {/* Sidebar col */}
          <motion.div variants={itemVariants} className="lg:col-span-4 space-y-6">
            
            <div className="bg-card border rounded-3xl p-6 shadow-sm">
              <div className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Total Spent
              </div>
              <div className="text-4xl font-display font-bold" style={{ color: colorStr }}>
                ${era.totalSpent.toLocaleString()}
              </div>
            </div>

            <div className="bg-card border rounded-3xl p-6 shadow-sm">
              <div className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" /> Weekly Average
              </div>
              <div className="text-3xl font-display font-bold">
                ${era.weeklyAverage.toLocaleString()}
              </div>
              <div className="mt-4 pt-4 border-t border-border/50 text-sm text-muted-foreground">
                <span className="block mb-1 font-medium text-foreground">Peak Week:</span>
                {era.peakWeek}
              </div>
            </div>

            <div 
              className="rounded-3xl p-6 shadow-sm relative overflow-hidden"
              style={{ backgroundColor: colorStr, color: isHex ? '#fff' : 'inherit' }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-20 text-6xl">✨</div>
              <div className="text-sm font-medium opacity-80 mb-2 uppercase tracking-wider">
                Fun Fact
              </div>
              <div className="text-xl font-medium leading-snug relative z-10">
                {era.funFact}
              </div>
            </div>

          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
