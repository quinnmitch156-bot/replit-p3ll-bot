import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Section from "@/pages/Section";
import Article from "@/pages/Article";
import SearchResults from "@/pages/SearchResults";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/section/:slug" component={Section} />
      <Route path="/article/:slug" component={Article} />
      <Route path="/search" component={SearchResults} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
