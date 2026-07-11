/**
 * CatalogSearchFilters Component
 * Faceted filter sidebar for the physical library catalog.
 * Filters: availability, location, subject, language, item_type.
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { getCatalogFacets } from '../../services/api/library.js'
import { Filter, X, SlidersHorizontal, RefreshCw, Loader2 } from 'lucide-react'

const ITEM_TYPE_LABELS = {
  book:       'Book',
  journal:    'Journal',
  magazine:   'Magazine',
  textbook:   'Textbook',
  thesis:     'Thesis',
  report:     'Report',
  audiovisual:'Audiovisual',
  map:        'Map',
  digital:    'Digital',
  other:      'Other',
}

const LANGUAGE_LABELS = {
  EN: 'English',
  BN: 'Bengali / বাংলা',
  AR: 'Arabic',
  FR: 'French',
  DE: 'German',
  ES: 'Spanish',
  ZH: 'Chinese',
  JA: 'Japanese',
}

/**
 * @param {Object} props
 * @param {Object}   props.filters — current filter values { q, author, isbn, subject, available, location, language, item_type }
 * @param {function} props.onChange — called with updated filters object
 * @param {boolean}  [props.compact] — render as horizontal row instead of vertical sidebar
 */
export default function CatalogSearchFilters({ filters = {}, onChange, compact = false }) {
  const [facets, setFacets] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(!compact)

  useEffect(() => {
    async function loadFacets() {
      setLoading(true)
      try {
        const data = await getCatalogFacets()
        setFacets(data)
      } catch {
        // Facets are optional — silent fail
      } finally {
        setLoading(false)
      }
    }
    loadFacets()
  }, [])

  const set = (key, value) => onChange({ ...filters, [key]: value })
  const clear = () => onChange({ q: filters.q || '' })

  const activeCount = Object.entries(filters).filter(([k, v]) => k !== 'q' && v !== '' && v !== undefined && v !== null).length

  // Subject options: from facets or hardcoded common ones
  const subjects = facets?.subjects?.length ? facets.subjects : []
  const locations = facets?.locations?.length ? facets.locations : []
  const languages = facets?.languages?.length ? facets.languages : Object.keys(LANGUAGE_LABELS)
  const itemTypes = facets?.itemTypes?.length ? facets.itemTypes : Object.keys(ITEM_TYPE_LABELS)

  const filterContent = (
    <div className={compact ? 'flex flex-wrap gap-3 items-end' : 'grid gap-4'}>
      {/* Availability */}
      <div className={compact ? 'flex flex-col gap-1' : 'grid gap-1.5'}>
        <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Availability
        </Label>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { label: 'All',       value: '' },
            { label: 'Available', value: 'true' },
          ].map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => set('available', value)}
              className={`
                px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors
                ${(filters.available ?? '') === value
                  ? 'bg-accent text-white border-accent'
                  : 'bg-card border-border text-foreground hover:border-accent/50 hover:bg-muted/30'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Item Type */}
      <div className={compact ? 'flex flex-col gap-1' : 'grid gap-1.5'}>
        <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Category
        </Label>
        <div className={compact ? 'flex gap-1.5 flex-wrap' : 'grid gap-1'}>
          {['', ...itemTypes].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('item_type', t)}
              className={`
                px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors text-left
                ${(filters.item_type ?? '') === t
                  ? 'bg-accent text-white border-accent'
                  : 'bg-card border-border text-foreground hover:border-accent/50 hover:bg-muted/30'
                }
              `}
            >
              {t === '' ? 'All' : (ITEM_TYPE_LABELS[t] || t)}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className={compact ? 'flex flex-col gap-1' : 'grid gap-1.5'}>
        <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Language
        </Label>
        <select
          value={filters.language || ''}
          onChange={(e) => set('language', e.target.value)}
          className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">All languages</option>
          {languages.map((l) => (
            <option key={l} value={l}>{LANGUAGE_LABELS[l] || l}</option>
          ))}
        </select>
      </div>

      {/* Location */}
      {locations.length > 0 && (
        <div className={compact ? 'flex flex-col gap-1' : 'grid gap-1.5'}>
          <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Location / Shelf
          </Label>
          <select
            value={filters.location || ''}
            onChange={(e) => set('location', e.target.value)}
            className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      )}

      {/* Subject */}
      {subjects.length > 0 && (
        <div className={compact ? 'flex flex-col gap-1' : 'grid gap-1.5'}>
          <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Subject
          </Label>
          <select
            value={filters.subject || ''}
            onChange={(e) => set('subject', e.target.value)}
            className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Author filter */}
      <div className={compact ? 'flex flex-col gap-1' : 'grid gap-1.5'}>
        <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Author
        </Label>
        <Input
          type="text"
          placeholder="Filter by author…"
          value={filters.author || ''}
          onChange={(e) => set('author', e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      {/* Clear button */}
      {activeCount > 0 && (
        <div className={compact ? 'flex items-end' : ''}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <X size={12} /> Clear filters
            <Badge className="text-[9px] ml-0.5 bg-accent/10 text-accent border-accent/20 border">{activeCount}</Badge>
          </Button>
        </div>
      )}
    </div>
  )

  if (compact) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-3">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal size={13} className="text-accent" />
          <span className="text-xs font-semibold text-foreground">Filters</span>
          {loading && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
          {activeCount > 0 && (
            <Badge className="text-[9px] bg-accent/10 text-accent border-accent/20 border">{activeCount} active</Badge>
          )}
        </div>
        {filterContent}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
      {/* Sidebar header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Filter size={13} className="text-accent" />
          Filters
          {loading && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
          {activeCount > 0 && (
            <Badge className="text-[9px] bg-accent/10 text-accent border-accent/20 border">{activeCount}</Badge>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="p-4">
          {filterContent}
        </div>
      )}
    </div>
  )
}
