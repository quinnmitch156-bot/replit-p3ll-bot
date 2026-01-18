import { Link, useLocation } from "wouter";
import { Terminal, Shield, BarChart3, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  const navItems = [
    { name: "Dashboard", href: "/", icon: Terminal },
    { name: "Purchase", href: "/purchase", icon: Shield },
    { name: "Admin", href: "/admin", icon: BarChart3 },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="relative w-10 h-10 flex items-center justify-center bg-primary/10 rounded-lg border border-primary/20 group-hover:border-primary/50 group-hover:bg-primary/20 transition-all duration-300">
              <Terminal className="w-6 h-6 text-primary group-hover:text-glow transition-all" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-50 transition-opacity" />
            </div>
            <span className="text-xl font-bold tracking-wider text-white group-hover:text-primary transition-colors font-display">
              SCOUT<span className="text-primary">.BOT</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-all duration-200 hover:text-primary font-mono",
                  location === item.href ? "text-primary text-glow" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
            
            <div className="h-6 w-px bg-white/10 mx-2" />
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden lg:block">
                <div className="text-xs text-muted-foreground font-mono">LOGGED IN AS</div>
                <div className="text-sm font-bold text-white font-display">USER_01</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center">
                <span className="font-bold text-primary">U1</span>
              </div>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5"
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-white/5 bg-zinc-950"
          >
            <div className="px-4 py-6 space-y-4">
              {navItems.map((item) => (
                <Link 
                  key={item.name} 
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all",
                    location === item.href 
                      ? "bg-primary/10 text-primary border border-primary/20" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
