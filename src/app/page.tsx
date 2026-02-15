import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black font-sans">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold text-zinc-900 dark:text-white mb-8">
          Welcome to <span className="text-blue-600">Zippy Builder v2</span>
        </h1>

        <p className="mt-3 text-2xl text-zinc-600 dark:text-zinc-400 max-w-2xl">
          The AI-Powered Managed Network Design Builder.
        </p>

        <div className="mt-12 flex flex-wrap justify-center gap-6">
          <a
            href="/admin/catalog"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-zinc-300 hover:bg-zinc-100 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-left w-64 shadow-sm"
          >
            <h2 className="mb-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Admin <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">-&gt;</span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm text-zinc-500 dark:text-zinc-400">
              Manage Equipment Catalog, Ingest Datasheets, and Configure Logic.
            </p>
          </a>

          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-left w-64 opacity-60 cursor-not-allowed">
            <h2 className="mb-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Solutions Architect
            </h2>
            <p className="m-0 max-w-[30ch] text-sm text-zinc-500 dark:text-zinc-400">
              Start a new design flow (Coming Soon).
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
