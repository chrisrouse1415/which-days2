// Plans and dates share one vocabulary: Open → Crossed off, or Open → Picked.
// ("locked" is the stored status for both a picked date and a decided plan.)
const styles: Record<string, string> = {
  active: 'border-pine-200 bg-pine-50 text-pine-700',
  viable: 'border-pine-200 bg-pine-50 text-pine-700',
  reopened: 'border-pine-200 bg-pine-50 text-pine-700',
  locked: 'border-pine-600 bg-pine-600 text-white',
  eliminated: 'border-cut-200 bg-cut-50 text-cut-600',
  deleted: 'border-cut-200 bg-cut-50 text-cut-600',
}

const labels: Record<string, string> = {
  active: 'Open',
  viable: 'Open',
  reopened: 'Open',
  locked: 'Picked',
  eliminated: 'Crossed off',
  deleted: 'Deleted',
}

export default function StatusBadge({ status }: { status: string }) {
  const style = styles[status]
  if (!style) return null
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold ${style}`}
    >
      {labels[status]}
    </span>
  )
}
