const styles: Record<string, string> = {
  // plan + date statuses share one visual language
  active: 'border-pine-200 bg-pine-50 text-pine-700',
  viable: 'border-pine-200 bg-pine-50 text-pine-700',
  reopened: 'border-pine-200 bg-pine-50 text-pine-700',
  locked: 'border-stone-200 bg-stone-50 text-stone-500',
  eliminated: 'border-cut-200 bg-cut-50 text-cut-600',
  deleted: 'border-cut-200 bg-cut-50 text-cut-600',
}

const labels: Record<string, string> = {
  active: 'Active',
  viable: 'Viable',
  reopened: 'Reopened',
  locked: 'Locked',
  eliminated: 'Eliminated',
  deleted: 'Deleted',
}

export default function StatusBadge({ status }: { status: string }) {
  const style = styles[status]
  if (!style) return null
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${style}`}
    >
      {labels[status]}
    </span>
  )
}
