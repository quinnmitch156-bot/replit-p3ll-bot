import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Check, Zap, Crown, Calendar } from "lucide-react";
import { motion } from "framer-motion";

const plans = [
  {
    name: "WEEKLY ACCESS",
    price: "$10",
    period: "/ week",
    icon: Calendar,
    features: ["Full Bot Access", "24/7 Support", "Basic Lookups", "XBL Resolver"],
    color: "bg-blue-500",
    borderColor: "border-blue-500/20",
    glowColor: "group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]",
  },
  {
    name: "MONTHLY PRO",
    price: "$20",
    period: "/ month",
    icon: Zap,
    features: ["Everything in Weekly", "Priority Queue", "Advanced API Access", "Instant IP Resolution"],
    popular: true,
    color: "bg-primary",
    borderColor: "border-primary/20",
    glowColor: "group-hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]",
  },
  {
    name: "LIFETIME ELITE",
    price: "$35",
    period: "one-time",
    icon: Crown,
    features: ["Permanent Access", "All Future Updates", "Private Discord Role", "Direct Developer Support"],
    color: "bg-purple-500",
    borderColor: "border-purple-500/20",
    glowColor: "group-hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]",
  },
];

export default function Purchase() {
  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      
      <main className="pt-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold font-display text-white mb-6 text-glow">
            CHOOSE YOUR ARSENAL
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock the full potential of Scout with our premium access tiers. Instant delivery via Discord.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="h-full"
            >
              <Card className={`h-full glass-card border-white/5 relative overflow-hidden group hover:-translate-y-2 transition-all duration-300 ${plan.glowColor}`}>
                {plan.popular && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
                )}
                
                <CardHeader className="text-center pb-2">
                  <div className={`w-16 h-16 mx-auto rounded-2xl ${plan.color} bg-opacity-10 flex items-center justify-center mb-4 border ${plan.borderColor} group-hover:scale-110 transition-transform duration-300`}>
                    <plan.icon className={`w-8 h-8 ${plan.color.replace('bg-', 'text-')}`} />
                  </div>
                  <h3 className="text-xl font-bold font-display tracking-wider text-white">
                    {plan.name}
                  </h3>
                </CardHeader>
                
                <CardContent className="text-center flex-grow">
                  <div className="flex items-center justify-center gap-1 mb-8">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-muted-foreground text-sm font-mono">{plan.period}</span>
                  </div>
                  
                  <ul className="space-y-4 text-left mx-auto max-w-[200px]">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground group-hover:text-white transition-colors">
                        <Check className="w-5 h-5 text-primary shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter className="pt-8">
                  <Button 
                    className={`w-full h-12 font-bold tracking-wide ${
                      plan.popular 
                        ? 'bg-primary text-black hover:bg-primary/90' 
                        : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                    }`}
                  >
                    SELECT PLAN
                  </Button>
                </CardFooter>

                {/* Background decorative glow */}
                <div className={`absolute -bottom-20 -right-20 w-40 h-40 ${plan.color} opacity-5 blur-[60px] group-hover:opacity-20 transition-opacity duration-500`} />
              </Card>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
