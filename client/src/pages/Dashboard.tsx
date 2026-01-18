import { Navbar } from "@/components/layout/Navbar";
import { StatCard } from "@/components/ui/StatCard";
import { useUser, useRedeemKey, useSyncUser } from "@/hooks/use-scout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Zap, Clock, Shield, Key, Loader2, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// MOCK USER ID FOR DEMO - In a real app this comes from auth context
const DEMO_DISCORD_ID = "123456789";

export default function Dashboard() {
  const { toast } = useToast();
  const [keyInput, setKeyInput] = useState("");
  
  // Hooks
  const { data: user, isLoading: userLoading } = useUser(DEMO_DISCORD_ID);
  const { mutate: syncUser } = useSyncUser();
  const { mutate: redeemKey, isPending: isRedeeming } = useRedeemKey();

  // Sync user on mount for demo purposes
  useEffect(() => {
    syncUser({ discordId: DEMO_DISCORD_ID, username: "DemoUser" });
  }, [syncUser]);

  const handleRedeem = () => {
    if (!keyInput.trim()) return;
    
    redeemKey({ key: keyInput, discordId: DEMO_DISCORD_ID }, {
      onSuccess: (data) => {
        toast({
          title: "Access Granted",
          description: `Key successfully redeemed! Expires: ${data.expiresAt ? format(new Date(data.expiresAt), 'PPP') : 'Never'}`,
          className: "bg-primary/10 border-primary text-primary-foreground",
        });
        setKeyInput("");
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Redemption Failed",
          description: err.message,
        });
      }
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      
      <main className="pt-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 text-glow">
                COMMAND CENTER
              </h1>
              <p className="text-muted-foreground font-mono">
                System Status: <span className="text-primary">ONLINE</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-mono text-primary font-bold">LIVE CONNECTION</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div variants={itemVariants}>
              <StatCard 
                label="Subscription" 
                value={user?.subscriptionTier ? user.subscriptionTier.toUpperCase() : "INACTIVE"} 
                icon={Shield} 
                loading={userLoading}
                className={!user?.subscriptionTier ? "border-red-500/20" : "border-primary/20"}
              />
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <StatCard 
                label="Expires" 
                value={user?.subscriptionExpiresAt ? format(new Date(user.subscriptionExpiresAt), 'MMM dd, yyyy') : "N/A"} 
                icon={Clock} 
                loading={userLoading}
              />
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <StatCard 
                label="Account Age" 
                value={user?.createdAt ? format(new Date(user.createdAt), 'MMM yyyy') : "Unknown"} 
                icon={Zap} 
                loading={userLoading}
              />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Redeem Section */}
            <motion.div variants={itemVariants} className="h-full">
              <Card className="glass-card h-full flex flex-col justify-center border-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-display">
                    <Key className="w-5 h-5 text-primary" />
                    REDEEM ACCESS KEY
                  </CardTitle>
                  <CardDescription>
                    Enter your license key to activate or extend your subscription.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Input 
                      placeholder="XXXX-XXXX-XXXX-XXXX" 
                      className="bg-black/40 border-white/10 h-14 pl-4 font-mono text-lg tracking-widest uppercase focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-muted-foreground font-mono">
                      SECURE INPUT
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full h-12 text-base font-bold tracking-wide bg-primary text-black hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all duration-300"
                    onClick={handleRedeem}
                    disabled={isRedeeming || !keyInput}
                  >
                    {isRedeeming ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        VERIFYING...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        ACTIVATE LICENSE
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions / Status */}
            <motion.div variants={itemVariants} className="h-full">
              <Card className="glass-card h-full border-white/5 bg-gradient-to-br from-zinc-900/50 to-primary/5">
                <CardHeader>
                  <CardTitle className="text-xl font-display">SYSTEM LOGS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 font-mono text-sm">
                    <div className="flex gap-3 items-start opacity-50">
                      <span className="text-primary whitespace-nowrap">[{format(new Date(), 'HH:mm:ss')}]</span>
                      <span className="text-muted-foreground">System initialized. Connection established.</span>
                    </div>
                    <div className="flex gap-3 items-start opacity-70">
                      <span className="text-primary whitespace-nowrap">[{format(new Date(), 'HH:mm:ss')}]</span>
                      <span className="text-muted-foreground">User authentication successful. ID: {DEMO_DISCORD_ID}</span>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="text-primary whitespace-nowrap">[{format(new Date(), 'HH:mm:ss')}]</span>
                      <span className="text-white">Waiting for input...</span>
                      <span className="w-2 h-4 bg-primary animate-pulse inline-block align-middle"/>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
