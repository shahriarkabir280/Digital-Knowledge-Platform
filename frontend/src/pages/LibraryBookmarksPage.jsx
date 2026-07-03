import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useAuth } from '../app/use-auth.js'
import { apiRequest } from '../services/api/client'
import PDFThumbnail from '../components/library/PDFThumbnail.jsx'
import { ResourceGridSkeleton } from '../components/library/ResourceCardSkeleton.jsx'
import { 
  Bookmark, 
  Trash2, 
  BookOpen, 
  GraduationCap, 
  Sparkles, 
  Quote, 
  Star,
  Search,
  Filter
} from 'lucide-react'

export default function LibraryBookmarksPage() {
  const { authState } = useAuth()

  // Fetch all published documents from backend
  const [publishedDocs, setPublishedDocs] = useState([])
  const [loadingPublished, setLoadingPublished] = useState(true)

  // Load bookmarks dynamically from localStorage
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    const saved = localStorage.getItem('dkp_bookmarked_resources')
    return saved ? JSON.parse(saved) : []
  })

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('All')

  // Fetch all published documents
  useEffect(() => {
    const fetchAllPublished = async () => {
      if (!authState?.token) {
        setLoadingPublished(false)
        return
      }
      try {
        setLoadingPublished(true)
        const categories = ['textbook', 'lecture-slides', 'lab-manual', 'question-bank', 'assignment', 'lab-report', 'media', 'research-paper', 'thesis', 'dataset']
        const docs = []
        const seenDocIds = new Set()

        for (const resourceCategory of categories) {
          try {
            const response = await apiRequest(`/documents/published?resourceCategory=${resourceCategory}`, {
              authToken: authState?.token,
            })

            if (response?.data?.items?.length) {
              for (const doc of response.data.items) {
                const docId = `doc-${doc.id}`
                if (seenDocIds.has(docId)) continue
                seenDocIds.add(docId)

                docs.push({
                  id: docId,
                  title: doc.title,
                  type: doc.type || 'PDF',
                  resourceCategory: doc.resourceCategory || resourceCategory,
                  pdfUrl: `/api/repository/files/${Number(doc.id) || doc.id}/content`,
                  updatedAt: doc.updatedAt,
                  department: doc.department || 'CSE',
                  course: doc.course || 'N/A',
                  author: doc.author || 'Unknown',
                  tags: doc.keywords || [],
                  rating: 5.0,
                  downloads: 0,
                })
              }
            }
          } catch (error) {
            // silently skip categories with errors
          }
        }

        setPublishedDocs(docs)
        // Cache for the resource detail page
        localStorage.setItem('dkp_published_docs_cache', JSON.stringify(docs))
      } catch (error) {
        console.error('Failed to fetch published documents:', error)
      } finally {
        setLoadingPublished(false)
      }
    }

    fetchAllPublished()
  }, [authState?.token])

  // Sync bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem('dkp_bookmarked_resources', JSON.stringify(bookmarkedIds))
  }, [bookmarkedIds])

  // Get bookmarked resource items
  const savedItems = useMemo(() => {
    return publishedDocs.filter(item => bookmarkedIds.includes(item.id))
  }, [publishedDocs, bookmarkedIds])

  // Filter bookmarked items
  const filteredItems = useMemo(() => {
    return savedItems.filter(item => {
      const type = item.type || 'PDF'
      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.author || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.course || '').toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = 
        selectedType === 'All' || 
        (selectedType === 'Research' && ['Paper', 'Thesis', 'Research Paper'].includes(type)) ||
        (selectedType === 'Academic' && !['Paper', 'Thesis', 'Research Paper'].includes(type))
      
      return matchesSearch && matchesType
    })
  }, [savedItems, searchQuery, selectedType])

  const removeBookmark = (id) => {
    setBookmarkedIds(prev => prev.filter(item => item !== id))
  }

  const copyCitation = (resource) => {
    const year = resource.year || new Date(resource.updatedAt || Date.now()).getFullYear()
    const citation = `${resource.author || 'Anonymous'}. (${year}). ${resource.title}. Department of ${resource.department || 'CSE'}, Library Collections.`
    navigator.clipboard.writeText(citation)
    alert('Citation copied in APA format!')
  }

  const getTypeBadgeStyles = (type) => {
    const normType = String(type).toLowerCase()
    if (['paper', 'research paper', 'thesis'].includes(normType)) {
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    }
    if (normType === 'dataset') {
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    }
    if (normType === 'ppt') {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    }
    return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
  }

  const isShowingSkeleton = loadingPublished && authState?.token

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-2">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-accent/20 p-6 md:p-8 text-white shadow-lg border border-slate-800">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Bookmark size={220} className="fill-white/10 text-white/5" />
        </div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="grid gap-2 max-w-xl">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent uppercase tracking-wider bg-accent/15 px-2.5 py-1 rounded-full w-fit border border-accent/20">
              <Sparkles size={12} className="text-accent" /> Saved Collections
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight">My Favorites</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Access your personal bookshelf of textbooks, lecture slides, datasets, and bookmarked publications compiled across all research semesters.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/40 p-4 rounded-xl border border-white/10 shrink-0 w-fit">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Bookmark size={20} className="fill-accent text-accent" />
            </div>
            <div>
              <div className="text-lg font-black">{savedItems.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Bookmarked Resources</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-b border-border pb-3">
        {/* Type selection tabs */}
        <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/50 self-start">
          <button
            onClick={() => setSelectedType('All')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              selectedType === 'All' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Bookmarks
          </button>
          <button
            onClick={() => setSelectedType('Academic')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              selectedType === 'Academic' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Academic Materials
          </button>
          <button
            onClick={() => setSelectedType('Research')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              selectedType === 'Research' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Research Papers
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookmarked items..."
            className="pl-9 text-xs h-9 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid List */}
      {isShowingSkeleton ? (
        <ResourceGridSkeleton count={6} />
      ) : filteredItems.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-2 border-border">
          <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <Bookmark size={20} />
          </div>
          <h3 className="text-sm font-bold text-foreground">No matching bookmarks found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {savedItems.length === 0 
              ? "Browse through the academic library or research repository and save resources to your bookshelf."
              : "Try adjusting your search criteria or switching active tab categories."}
          </p>
          {savedItems.length === 0 && (
            <div className="flex gap-2 justify-center mt-4">
              <Button asChild size="sm" variant="outline" className="text-xs">
                <Link to="/library">Academic Library</Link>
              </Button>
              <Button asChild size="sm" className="text-xs bg-accent hover:bg-accent/90 text-white">
                <Link to="/repository">Research Repository</Link>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map(item => {
            const isPdfRenderable = ['PDF', 'Paper', 'Thesis', 'Research Paper', 'Question Bank', 'Assignment', 'Lab Report'].includes(item.type) && Boolean(item.pdfUrl)
            
            // Map static previews
            const thumbMap = {
              'PDF':           '/thumbs/thumb_pdf.png',
              'Paper':         '/thumbs/thumb_paper.png',
              'Research Paper':'/thumbs/thumb_paper.png',
              'Thesis':        '/thumbs/thumb_paper.png',
              'PPT':           '/thumbs/thumb_ppt.png',
              'Dataset':       '/thumbs/thumb_dataset.png',
              'Question Bank': '/thumbs/thumb_qbank.png',
              'Assignment':    '/thumbs/thumb_assignment.png',
              'Lab Report':    '/thumbs/thumb_lab_report.png',
            }
            
            const badgeColors = {
              'PDF':           'bg-red-600',
              'Paper':         'bg-blue-600',
              'Research Paper':'bg-blue-600',
              'Thesis':        'bg-indigo-600',
              'PPT':           'bg-amber-500',
              'Dataset':       'bg-purple-600',
              'Question Bank': 'bg-sky-600',
              'Assignment':    'bg-orange-600',
              'Lab Report':    'bg-teal-600',
            }

            const fallbackSrc = thumbMap[item.type] || '/thumbs/thumb_pdf.png'
            const badgeColor  = badgeColors[item.type] || 'bg-slate-600'

            return (
              <Card key={item.id} className="group hover:shadow-md transition-all border-border flex flex-col overflow-hidden bg-card">
                
                {/* Visual Thumbnail */}
                <Link to={`/library/resource/${item.id}`} className="relative block h-36 overflow-hidden bg-muted shrink-0">
                  {isPdfRenderable ? (
                    <PDFThumbnail
                      pdfUrl={item.pdfUrl}
                      fallbackSrc={fallbackSrc}
                      badgeColor={badgeColor}
                      badgeLabel={item.type}
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <img
                        src={fallbackSrc}
                        alt={item.title}
                        className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all duration-200 flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-white bg-white/20 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-white/30">
                          View Details
                        </span>
                      </div>
                      <span className={`absolute bottom-2 left-2 ${badgeColor} text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded`}>
                        {item.type}
                      </span>
                    </div>
                  )}
                </Link>

                <CardHeader className="p-4 pb-1 flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <Badge className={`text-[9px] font-bold px-2 py-0.5 border uppercase ${getTypeBadgeStyles(item.type)}`}>
                      {item.type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-bold">{item.course}</span>
                  </div>
                  <CardTitle className="text-xs font-bold leading-snug mt-2 line-clamp-2 group-hover:text-accent transition-colors">
                    {item.title}
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {item.author || 'Anonymous'} · <span className="font-semibold text-accent-strong">{item.department || 'CSE'}</span>
                  </p>
                </CardHeader>

                <CardContent className="p-4 pt-0 shrink-0 flex flex-col gap-2.5 border-t border-border/40 mt-2 bg-muted/5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2">
                    <span className="flex items-center gap-0.5 text-amber-500 font-bold"><Star size={11} className="fill-amber-500" /> {item.rating || '5.0'}</span>
                    <span>{item.downloads || 0} Downloads</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button asChild size="sm" className="h-7 text-[10px] flex-1 font-bold bg-accent hover:bg-accent/90 text-white border-none">
                      <Link to={`/library/resource/${item.id}`}>Open</Link>
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" onClick={() => copyCitation(item)}>
                      <Quote size={10} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 border border-transparent"
                      onClick={() => removeBookmark(item.id)}>
                      <Trash2 size={11} />
                    </Button>
                  </div>
                </CardContent>

              </Card>
            )
          })}
        </div>
      )}

    </div>
  )
}
