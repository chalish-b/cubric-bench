import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={150}>
        <div className="min-h-svh bg-background text-foreground">
          <Outlet />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}
