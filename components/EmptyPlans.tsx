/** Dashboard empty state: a blank desk-calendar page with a red pencil resting on it. */
export default function EmptyPlans() {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="relative h-32 w-28" aria-hidden="true">
        {/* Binder rings */}
        <div className="absolute -top-1.5 left-0 right-0 z-10 flex justify-center gap-10">
          <span className="h-4 w-1.5 rounded-full border-2 border-stone-400 bg-paper" />
          <span className="h-4 w-1.5 rounded-full border-2 border-stone-400 bg-paper" />
        </div>
        {/* Pad thickness */}
        <div className="absolute inset-x-1.5 -bottom-1.5 h-full rounded-lg border border-stone-200 bg-white" />
        {/* Blank page */}
        <div className="card absolute inset-0 overflow-hidden !rounded-lg">
          <div className="h-5 bg-ink" />
          <div className="mx-auto mt-5 h-2 w-10 rounded-full bg-stone-100" />
          <div className="mx-auto mt-2.5 h-7 w-12 rounded-md bg-stone-100" />
        </div>
        {/* Red pencil */}
        <svg viewBox="0 0 120 20" className="absolute -right-10 bottom-3 z-20 w-32 -rotate-[28deg] drop-shadow-sm">
          <path d="M0 10 L22 2 L22 18 Z" fill="#E9D8BC" />
          <path d="M0 10 L7 7.45 L7 12.55 Z" className="fill-cut-700" />
          <rect x="22" y="2" width="84" height="16" className="fill-cut-500" />
          <rect x="22" y="2" width="84" height="5" className="fill-white/15" />
          <rect x="106" y="2" width="8" height="16" className="fill-stone-300" />
          <rect x="114" y="2.5" width="6" height="15" rx="2.5" className="fill-cut-100" />
        </svg>
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold text-ink">No plans yet</h2>
      <p className="mt-1 max-w-xs text-sm text-stone-500">
        Pick a few dates and send the link to your group.
      </p>
    </div>
  )
}
