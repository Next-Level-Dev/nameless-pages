export default function TutorialsPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Fixed header */}
      <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tutorials</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Guides and resources for the fellowship!
          </p>
        </div>
      </header>

      {/* Centered empty state */}
      <main className="flex-1 min-h-0 flex items-center justify-center px-4">
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-12 py-16 text-center max-w-sm w-full">
          <p className="text-zinc-500">Tutorials coming soon.</p>
        </div>
      </main>
    </div>
  );
}
