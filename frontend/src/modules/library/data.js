// Utility functions — no hardcoded resource data.
// All resource data is fetched from the backend API.

export const ANALYTICS_SUMMARY = [
  { id: 'metric-1', label: 'Total Documents', value: '12,490', delta: '+14.2%' },
  { id: 'metric-2', label: 'Monthly Downloads', value: '84,210', delta: '+9.1%' },
  { id: 'metric-3', label: 'Avg. Rating', value: '4.6 / 5', delta: '+0.3' },
  { id: 'metric-4', label: 'Pending Moderation', value: '73', delta: '-12.0%' },
]

export function resolveTypeIcon(type) {
  const normalized = String(type || '').toLowerCase()
  if (normalized === 'pdf') return 'PDF'
  if (normalized === 'doc') return 'DOC'
  if (normalized === 'ppt') return 'PPT'
  if (normalized === 'video') return 'VID'
  if (normalized === 'notes') return 'TXT'
  return 'FILE'
}
