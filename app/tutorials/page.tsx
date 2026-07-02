export default function TutorialsPage() {
  return (
    <div className="flex-1">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-3xl font-bold tracking-tight">Tutorials</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Guides and resources for the fellowship
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-zinc-500">Tutorials coming soon.</p>
        </div>
      </main>
    </div>
  )
}
