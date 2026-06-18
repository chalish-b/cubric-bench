import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TooltipProvider } from "@/components/ui/tooltip";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-svh bg-background text-foreground">
        <Outlet />
      </div>
    </TooltipProvider>
  );
}
