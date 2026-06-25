import type { WebSummary } from "@cubric/bench/web";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SuiteView } from "@/components/SuiteView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GitHubLink } from "@/components/GitHubLink";
import { suiteMeta } from "@/lib/suites";

export function Dashboard({ summary }: { summary: WebSummary }) {
  const suites = summary.suites.filter((s) =>
    summary.entries.some((e) => e.suiteId === s.suiteId && e.complete),
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Cubric Bench</h1>
          <p className="mt-2 text-muted-foreground">
            How well can LLMs reason about Rubik&apos;s cube states?
          </p>
        </div>
        <div className="flex items-center gap-1">
          <GitHubLink />
          <ThemeToggle />
        </div>
      </header>

      {suites.length === 0 ? (
        <p className="text-muted-foreground">No completed runs yet.</p>
      ) : (
        <Tabs defaultValue={suites[0].suiteId}>
          <TabsList>
            {suites.map((s) => (
              <TabsTrigger key={s.suiteId} value={s.suiteId}>
                {suiteMeta(s.suiteId).title}
              </TabsTrigger>
            ))}
          </TabsList>
          {suites.map((s) => (
            <TabsContent key={s.suiteId} value={s.suiteId} className="mt-6">
              <SuiteView
                suite={s}
                entries={summary.entries.filter((e) => e.suiteId === s.suiteId)}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <footer className="mt-12 text-xs text-muted-foreground">
        Generated {new Date(summary.generatedAt).toLocaleString()}
      </footer>
    </div>
  );
}
