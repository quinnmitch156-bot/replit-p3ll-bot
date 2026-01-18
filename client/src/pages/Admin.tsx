import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStats, useGenerateKeys } from "@/hooks/use-scout";
import { StatCard } from "@/components/ui/StatCard";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, Search, Copy, Terminal } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Admin() {
  const { toast } = useToast();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { mutate: generateKeys, isPending: isGenerating } = useGenerateKeys();

  const [amount, setAmount] = useState("1");
  const [type, setType] = useState<"lifetime" | "monthly" | "weekly">("monthly");
  const [generatedKeys, setGeneratedKeys] = useState<{ key: string, type: string }[]>([]);

  const handleGenerate = () => {
    generateKeys({ type, amount: parseInt(amount) }, {
      onSuccess: (data) => {
        setGeneratedKeys(data);
        toast({
          title: "Keys Generated",
          description: `Successfully generated ${data.length} ${type} keys.`,
          className: "bg-primary/10 border-primary text-primary-foreground",
        });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to generate keys. Check permissions.",
        });
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Copied to clipboard" });
  };

  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      
      <main className="pt-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-4xl font-bold font-display text-white mb-2">ADMIN CONSOLE</h1>
            <p className="text-muted-foreground font-mono">Restricted Access Area</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              label="Total Users" 
              value={stats?.totalUsers || 0} 
              icon={Users} 
              loading={statsLoading} 
            />
            <StatCard 
              label="Active Subs" 
              value={stats?.activeSubs || 0} 
              icon={Shield} 
              loading={statsLoading} 
              className="border-primary/30 bg-primary/5"
            />
            <StatCard 
              label="Total Lookups" 
              value={stats?.totalLookups || 0} 
              icon={Search} 
              loading={statsLoading} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Generator */}
            <Card className="glass-card border-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-primary" />
                  KEY GENERATOR
                </CardTitle>
                <CardDescription>Create new license keys for distribution.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-muted-foreground uppercase">Key Type</label>
                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                      <SelectTrigger className="bg-zinc-900/50 border-white/10 h-12">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        <SelectItem value="lifetime">Lifetime Elite</SelectItem>
                        <SelectItem value="monthly">Monthly Pro</SelectItem>
                        <SelectItem value="weekly">Weekly Access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-muted-foreground uppercase">Quantity</label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="50"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-zinc-900/50 border-white/10 h-12" 
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating}
                  className="w-full h-12 bg-white text-black hover:bg-white/90 font-bold tracking-wide"
                >
                  {isGenerating ? "GENERATING..." : "GENERATE KEYS"}
                </Button>
              </CardContent>
            </Card>

            {/* Recent Keys Output */}
            <Card className="glass-card border-white/5 bg-black/40">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>OUTPUT CONSOLE</span>
                  {generatedKeys.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs font-mono text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => copyToClipboard(generatedKeys.map(k => k.key).join('\n'))}
                    >
                      COPY ALL
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black/50 rounded-lg border border-white/5 p-4 h-[300px] overflow-y-auto font-mono text-sm space-y-2">
                  {generatedKeys.length === 0 ? (
                    <div className="text-muted-foreground opacity-50 text-center pt-20">
                      // Waiting for command input...
                    </div>
                  ) : (
                    generatedKeys.map((key, i) => (
                      <motion.div 
                        key={key.key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between group p-2 rounded hover:bg-white/5"
                      >
                        <span className="text-primary">{key.key}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground uppercase">{key.type}</span>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(key.key)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
