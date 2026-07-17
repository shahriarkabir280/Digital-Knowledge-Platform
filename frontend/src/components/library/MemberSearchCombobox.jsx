/**
 * Member Search Combobox
 * Debounced name/email search with a dropdown of matches. Shared by the
 * Circulation Desk's checkout panel and the Subscriptions tab.
 */

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { User, Loader2, X } from 'lucide-react'
import { searchMembers } from '../../services/api/library.js'

export default function MemberSearchCombobox({ value, onChange }) {
  const [query, setQuery] = useState(value?.name || '')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleInput = (e) => {
    const q = e.target.value
    setQuery(q)
    onChange(null) // clear selected member when typing
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchMembers(q.trim())
        setResults(data)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  const selectMember = (member) => {
    setQuery(`${member.name} (${member.email})`)
    onChange(member)
    setOpen(false)
    setResults([])
  }

  const clear = () => {
    setQuery('')
    onChange(null)
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleInput}
          placeholder="Search by name or email…"
          className="pl-7 pr-7 text-xs"
        />
        {(query || searching) && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {searching ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          {results.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => selectMember(m)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors border-b border-border/40 last:border-0"
            >
              <div className="w-7 h-7 rounded-full bg-accent/20 text-accent font-bold text-xs flex items-center justify-center shrink-0">
                {(m.name || m.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{m.name || '—'}</p>
                <p className="text-[12px] text-muted-foreground truncate">{m.email}</p>
              </div>
              <Badge variant="outline" className="text-[11px] ml-auto shrink-0">{m.role}</Badge>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && !searching && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg px-3 py-2.5 text-xs text-muted-foreground">
          No members found.
        </div>
      )}
    </div>
  )
}
