import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, MapPin } from 'lucide-react'

const CATEGORY_COLORS = {
  BOOK: 'from-accent/25 to-accent/5 text-accent',
  TEXTBOOK: 'from-accent/25 to-accent/5 text-accent',
  JOURNAL: 'from-purple-500/25 to-purple-500/5 text-purple-500',
  MAGAZINE: 'from-amber-500/25 to-amber-500/5 text-amber-500',
  THESIS: 'from-indigo-500/25 to-indigo-500/5 text-indigo-500',
  DVD: 'from-rose-500/25 to-rose-500/5 text-rose-500',
  REFERENCE: 'from-teal-500/25 to-teal-500/5 text-teal-500',
}

function categoryClass(category) {
  const key = String(category || '').toUpperCase()
  return CATEGORY_COLORS[key] || 'from-slate-500/25 to-slate-500/5 text-slate-500'
}

export default function CatalogItemCard({ item }) {
  const available = Number(item.available_copies) > 0

  return (
    <Link to={`/library/resource/${item.id}`} className="group block h-full">
      <Card className="h-full border-border hover:border-accent/40 hover:shadow-md transition-all overflow-hidden">
        <div className={`h-24 flex items-center justify-center bg-gradient-to-br ${categoryClass(item.category)}`}>
          {item.cover_image ? (
            <img
              src={item.cover_image}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <BookOpen size={26} strokeWidth={1.5} />
          )}
        </div>
        <CardContent className="p-3.5 grid gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <Badge variant="outline" className="text-[9px] font-bold uppercase px-1.5 py-0 bg-background">
              {item.category || 'Other'}
            </Badge>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
              available
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-red-500/10 text-red-600 border-red-500/20'
            }`}>
              {available ? `${item.available_copies} avail.` : 'Out'}
            </span>
          </div>

          <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug group-hover:text-accent transition-colors">
            {item.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">{item.authors || 'Unknown author'}</p>

          <div className="flex items-center justify-between gap-2 pt-1 text-[10px] text-muted-foreground">
            {item.isbn ? <span className="font-mono truncate">ISBN {item.isbn}</span> : <span />}
            {item.location && (
              <span className="flex items-center gap-0.5 shrink-0">
                <MapPin size={10} /> {item.location}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
