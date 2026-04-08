"use client";

import { useSneakerTryOn } from "@/lib/useSneakerTryOn";

export default function Home() {
  const {
    personFile,
    setPersonFile,
    shoeFile,
    setShoeFile,
    shoeImageUrl,
    setShoeImageUrl,
    isGenerating,
    error,
    result,
    history,
    canSubmit,
    personPreviewUrl,
    shoePreviewUrl,
    handleSubmit,
    clearHistory,
  } = useSneakerTryOn();

  return (
    <div className="mx-auto max-w-[560px] px-4 pt-8 pb-28 sm:px-5 sm:pt-12">
      <header className="mb-10">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
          Sneaker Try-On
        </p>
        <h1 className="m-0 text-[26px] font-light leading-[1.15] tracking-[-0.03em] sm:text-[32px]">
          Visualise the fit
          <br />
          before you buy.
        </h1>
      </header>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="cursor-pointer">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
            Person
          </span>
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded border border-neutral-200 bg-white transition-colors hover:border-neutral-400">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPersonFile(e.target.files?.[0] ?? null)}
              hidden
            />
            {personPreviewUrl ? (
              <img src={personPreviewUrl} alt="Person" className="h-full w-full object-cover" />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-neutral-300">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
            )}
          </div>
        </label>

        <label className="cursor-pointer">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
            Sneaker
          </span>
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded border border-neutral-200 bg-white transition-colors hover:border-neutral-400">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setShoeFile(e.target.files?.[0] ?? null)}
              hidden
            />
            {shoePreviewUrl ? (
              <img src={shoePreviewUrl} alt="Sneaker" className="h-full w-full object-cover" />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-neutral-300">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
            )}
          </div>
        </label>
      </div>

      <div className="mb-1">
        <input
          type="url"
          placeholder="Or sneaker image / product page URL"
          value={shoeImageUrl}
          onChange={(e) => setShoeImageUrl(e.target.value)}
          className="w-full border-0 border-b border-neutral-200 bg-transparent py-3.5 text-[15px] text-neutral-900 placeholder:text-neutral-300 transition-colors focus:outline-none focus:border-neutral-900"
        />
      </div>

      {error && (
        <p className="mt-4 text-[13px] font-medium text-red-700">{error}</p>
      )}

      {result && (
        <section className="mt-12">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
            Generated
          </p>
          <img src={result.image.dataUrl} alt="Generated try-on" className="w-full rounded-sm" />
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-12">
          <div className="mb-5 flex items-center justify-between">
            <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
              History
            </p>
            <button
              type="button"
              onClick={clearHistory}
              className="border-none bg-transparent p-0 text-[13px] text-neutral-500 underline underline-offset-[3px] cursor-pointer"
            >
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {history.map((entry) => (
              <img
                key={entry.id}
                src={entry.imageDataUrl}
                alt="Past generation"
                className="aspect-square w-full rounded-[2px] bg-neutral-200 object-cover"
              />
            ))}
          </div>
        </section>
      )}

      {/* Sticky FAB */}
      <button
        className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-40px)] max-w-[520px] -translate-x-1/2 rounded border border-neutral-900 bg-neutral-900 px-4 py-4 text-[14px] font-semibold uppercase tracking-[0.04em] text-white shadow-md backdrop-blur-md transition-all hover:bg-transparent hover:text-neutral-900 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-300 disabled:text-neutral-400"
        disabled={!canSubmit}
        onClick={() => handleSubmit()}
      >
        {isGenerating ? "Generating…" : "Generate"}
      </button>
    </div>
  );
}
