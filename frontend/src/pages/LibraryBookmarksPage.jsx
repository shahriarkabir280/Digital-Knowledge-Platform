import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useAuth } from '../app/use-auth.js'
import { apiRequest } from '../services/api/client'
import { ResourceGridSkeleton } from '../components/library/ResourceCardSkeleton.jsx'
import ResourceCard from '../components/library/ResourceCard.jsx'
import { 
  Bookmark, 
  Sparkles, 
  Search
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
                  filePath: doc.filePath,
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

  const getResourceType = (item) => {
    const category = String(item.resourceCategory || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
    if (category === 'textbook') return 'Textbook'
    if (category === 'lecture-slides' || category === 'slides') return 'Lecture Slides'
    if (category === 'lab-manual' || category === 'manual') return 'Lab Manual'
    if (category === 'question-bank' || category === 'qbank') return 'Question Bank'
    if (category === 'assignment') return 'Assignment'
    if (category === 'lab-report') return 'Lab Report'
    if (category === 'media' || category === 'video' || category === 'videos') return 'Video'

    const tags = (item.tags || []).map(t => t.toLowerCase())
    const type = String(item.type || '').toLowerCase()
    if (type === 'paper' || type === 'research paper') return 'Research Paper'
    if (type === 'thesis') return 'Thesis'
    if (type === 'dataset') return 'Dataset'
    return 'Lecture Notes'
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
          {filteredItems.map(item => {
            const type = getResourceType(item)
            const isExternal = item.filePath && (item.filePath.startsWith('http://') || item.filePath.startsWith('https://'))
            const viewerLink = isExternal ? item.filePath : `/viewer/${item.id.replace('doc-', '')}`

            return (
              <ResourceCard
                key={item.id}
                item={item}
                type={type}
                isBookmarked={true}
                onBookmark={removeBookmark}
                viewerLink={viewerLink}
                pdfUrl={item.pdfUrl}
              />
            )
          })}
        </div>
      )}

    </div>
  )
}
