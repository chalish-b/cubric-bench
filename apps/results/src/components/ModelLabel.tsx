import { ProviderLogo } from "@/components/ProviderLogo";
import { cn } from "@/lib/utils";

export function ModelLabel({
  provider,
  name,
  reasoning,
  color,
  className,
}: {
  provider: string;
  name: string;
  reasoning?: string;
  color: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <ProviderLogo provider={provider} className="size-4 shrink-0" style={{ color }} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium leading-tight">{name}</div>
        <div className="text-[11px] capitalize leading-tight text-muted-foreground">
          {reasoning ?? "default"}
        </div>
      </div>
    </div>
  );
}
