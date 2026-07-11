import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  Search, 
  BookOpen, 
  FileText, 
  Presentation, 
  GraduationCap, 
  Laptop,
  Bookmark,
  Plus, 
  X, 
  Filter, 
  Book,
  Sparkles,
  Link2,
  Upload,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ClipboardCheck,
  FilePlus,
  HelpCircle,
  PlayCircle,
  FileEdit,
  Library
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useAuth } from '../app/use-auth.js'
import { apiRequest } from '../services/api/client'
import { uploadDocument } from '../services/api/documents.js'
import { ResourceGridSkeleton, SidebarSkeleton } from '../components/library/ResourceCardSkeleton.jsx'
import ResourceCard from '../components/library/ResourceCard.jsx'
import CatalogSearchFilters from '../components/library/CatalogSearchFilters.jsx'
import CatalogItemCard from '../components/library/CatalogItemCard.jsx'
import { extractFileMetadata } from '../services/metadataExtractor.js'
import { searchCatalog, getCatalogStats } from '../services/api/library.js'
import { toast } from 'sonner'

export default function LibraryPage() {
  const { authState } = useAuth()
  const queryClient = useQueryClient()

  const { data: publishedDocs = [], isLoading: loadingPublished } = useQuery({
    queryKey: ['library-docs', authState?.token || 'guest'],
    queryFn: async ({ queryKey }) => {
      const token = queryKey[1] === 'guest' ? null : queryKey[1]
      const isGuest = !token
      const categories = ['textbook', 'lecture-slides', 'lab-manual', 'question-bank', 'assignment', 'lab-report', 'media']
      const docs = []
      const seenDocIds = new Set()

      for (const resourceCategory of categories) {
        try {
          const accessTierParam = isGuest ? '&accessTier=PUBLIC' : ''
          const response = await apiRequest(`/documents/published?resourceCategory=${resourceCategory}${accessTierParam}`, {
            authToken: token,
          })

          if (response?.data?.items?.length) {
            for (const doc of response.data.items) {
              const numericDocId = Number(doc.id)
              const pdfUrl = `/api/repository/files/${numericDocId || doc.id}/content`

              const docId = `doc-${doc.id}`
              if (seenDocIds.has(docId)) continue
              seenDocIds.add(docId)

              docs.push({
                id: docId,
                title: doc.title,
                type: doc.type || 'Lecture Notes',
                format: doc.format,
                version: doc.version,
                state: doc.state,
                resourceCategory: doc.resourceCategory || resourceCategory,
                pdfUrl,
                updatedAt: doc.updatedAt,
                department: doc.department || 'CSE',
                course: doc.course || 'N/A',
                author: doc.author || 'Unknown',
                tags: doc.keywords || [],
                rating: 5.0,
                downloads: 0,
                uploaderName: doc.uploaderName || null,
                filePath: doc.filePath,
              })
            }
          }
        } catch (error) {
          console.error(`Failed to fetch published documents for ${resourceCategory}:`, error)
        }
      }

      localStorage.setItem('dkp_published_docs_cache', JSON.stringify(docs))
      return docs
    },
    staleTime: 5 * 60 * 1000,
  })
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [filterDepartment, setFilterDepartment] = useState('All')
  const [filterCourse, setFilterCourse] = useState('All')
  const [sortBy, setSortBy] = useState('downloads')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem('dkp_bookmarked_resources')
    return saved ? JSON.parse(saved) : []
  })
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [newResource, setNewResource] = useState({
    title: '', author: '', department: 'Computer Science and Engineering', course: '', type: 'PDF', tags: '', summary: '', linkUrl: '', resourceCategory: 'textbook', accessTier: 'PUBLIC',
  })
  // Upload-specific state
  const [uploadMode, setUploadMode] = useState('file') // 'url' | 'file'
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [showUploadSuccess, setShowUploadSuccess] = useState(false)
  const uploadIntentRef = useRef('pending')
  const [uploadSuccessTitle, setUploadSuccessTitle] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const fileInputRef = useRef(null)

  // ── Page-level tab: Digital Resources vs Physical Catalog ──────────
  const [pageTab, setPageTab] = useState('digital') // 'digital' | 'catalog'

  // ── Physical catalog state ─────────────────────────────────────────
  const [catalogFilters, setCatalogFilters] = useState({ q: '' })
  const [catalogSearchInput, setCatalogSearchInput] = useState('')
  const [catalogPage, setCatalogPage] = useState(1)

  const { data: catalogData, isLoading: catalogLoading, isError: catalogIsError } = useQuery({
    queryKey: ['physical-catalog', catalogFilters, catalogPage],
    queryFn: () => searchCatalog({ ...catalogFilters, page: catalogPage, limit: 20 }),
    enabled: pageTab === 'catalog',
    staleTime: 2 * 60 * 1000,
  })

  const { data: catalogStats } = useQuery({
    queryKey: ['catalog-stats'],
    queryFn: getCatalogStats,
    staleTime: 5 * 60 * 1000,
  })

  const catalogItems = catalogData?.items || catalogData || []
  const catalogPagination = catalogData?.pagination

  useEffect(() => {
    localStorage.setItem('dkp_bookmarked_resources', JSON.stringify(bookmarks))
  }, [bookmarks])

  // Keep this useEffect for bookmark sync (separate from data fetching)


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
    if (type === 'question bank' || type === 'qbank') return 'Question Bank'
    if (type === 'assignment') return 'Assignment'
    if (type === 'lab report' || type === 'labreport') return 'Lab Report'
    if (type === 'ppt' || tags.includes('slides')) return 'Lecture Slides'
    if (tags.includes('lab') || tags.includes('manual')) return 'Lab Manual'
    if (tags.includes('textbook') || tags.includes('book')) return 'Textbook'
    if (type === 'video' || tags.includes('video')) return 'Video'
    return 'Lecture Notes'
  }

  const getResourceTabKey = (item) => {
    const category = String(item.resourceCategory || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
    if (category === 'textbook') return 'Textbooks'
    if (category === 'lecture-slides' || category === 'slides') return 'Slides'
    if (category === 'lab-manual' || category === 'manual') return 'Manuals'
    if (category === 'question-bank' || category === 'qbank') return 'QuestionBanks'
    if (category === 'assignment') return 'Assignments'
    if (category === 'lab-report') return 'LabReports'
    if (category === 'media' || category === 'video' || category === 'videos') return 'Videos'

    const tags = (item.tags || []).map(t => t.toLowerCase())
    const type = String(item.type || '').toLowerCase()
    if (type === 'ppt' || tags.includes('slides')) return 'Slides'
    if (tags.includes('lab') || tags.includes('manual')) return 'Manuals'
    if (type === 'question bank' || type === 'qbank' || tags.includes('question')) return 'QuestionBanks'
    if (type === 'assignment' || tags.includes('assignment')) return 'Assignments'
    if (type === 'lab report' || type === 'labreport' || tags.includes('lab report')) return 'LabReports'
    if (type === 'video' || tags.includes('video')) return 'Videos'
    if (tags.includes('textbook') || tags.includes('book') || type === 'pdf' || type === 'book') return 'Textbooks'
    return 'Textbooks'
  }

  const departments = useMemo(() => {
    const deps = new Set(publishedDocs.map(r => r.department).filter(Boolean))
    return ['All', ...Array.from(deps)]
  }, [publishedDocs])

  const courses = useMemo(() => {
    const crs = new Set(publishedDocs.map(r => r.course).filter(c => c && c.includes('-')))
    return ['All', ...Array.from(crs)]
  }, [publishedDocs])

  const visibleBookmarks = useMemo(() =>
    bookmarks.filter(id => publishedDocs.some(doc => doc.id === id)),
    [bookmarks, publishedDocs]
  )

  const toggleBookmark = (id) => {
    setBookmarks(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id])
  }

  const resetModal = useCallback(() => {
    setShowUploadModal(false)
    uploadIntentRef.current = 'pending'
    setNewResource({ title: '', author: '', department: 'Computer Science and Engineering', course: '', type: 'PDF', tags: '', summary: '', linkUrl: '', resourceCategory: 'textbook', accessTier: 'PUBLIC' })
    setUploadMode('file')
    setSelectedFile(null)
    setUploadProgress(0)
    setIsUploading(false)
    setUploadError('')
    setIsDragOver(false)
    setIsExtracting(false)
    // Switch to All so the newly uploaded card is always visible
    setSelectedCategory('All')
  }, [])

  // Intercept upload clicks for guests — show login prompt instead
  const handleUploadClick = useCallback(() => {
    if (!authState?.token) {
      setShowLoginPrompt(true)
    } else {
      setShowUploadModal(true)
    }
  }, [authState?.token])

  const handleFileSelect = async (file) => {
    if (!file) return
    // Infer resource type from file extension
    const ext = file.name.split('.').pop().toLowerCase()
    const typeMap = { pdf: 'PDF', ppt: 'PPT', pptx: 'PPT', doc: 'PDF', docx: 'PDF', csv: 'Dataset', zip: 'Dataset' }
    const inferredType = typeMap[ext] || 'PDF'
    
    // Auto-suggest storage category based on type
    let inferredCategory = 'textbook'
    if (inferredType === 'PPT') inferredCategory = 'lecture-slides'
    if (inferredType === 'Dataset') inferredCategory = 'dataset'

    setSelectedFile(file)
    setUploadError('')
    setIsExtracting(true)

    // Extract metadata from file using Gemini AI
    const fileMeta = await extractFileMetadata(file)
    setIsExtracting(false)

    setNewResource(p => {
      const hasExplicitCategory = Boolean(p.resourceCategory) && p.resourceCategory !== 'textbook'
      const nextCategory = hasExplicitCategory ? p.resourceCategory : inferredCategory

      return {
        ...p,
        type: inferredType,
        resourceCategory: nextCategory,
        title: fileMeta.title || p.title || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        author: fileMeta.author || p.author,
        summary: fileMeta.summary || p.summary,
        tags: fileMeta.tags || p.tags,
        _extractionError: fileMeta.success ? null : (fileMeta.error || null),
        _extractionSuccess: fileMeta.success,
      }
    })
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }, [])

  const handleUploadSubmit = async (e, intentOverride) => {
    if (e?.preventDefault) e.preventDefault()
    const intent = intentOverride || uploadIntentRef.current
    setUploadError('')
    if (!newResource.title.trim() || !newResource.author.trim() || !newResource.course.trim()) {
      setUploadError('Please fill in Title, Author, and Course Code.')
      return
    }
    if (uploadMode === 'file' && !selectedFile) {
      setUploadError('Please select a file to upload.')
      return
    }
    if (uploadMode === 'url') {
      const link = newResource.linkUrl.trim()
      if (!link) {
        setUploadError('Please enter a valid link/URL.')
        return
      }
      if (!link.startsWith('http://') && !link.startsWith('https://')) {
        setUploadError('Link/URL must start with http:// or https://')
        return
      }
    }

    if (!authState?.token) {
      setUploadError('You must be logged in to upload resources.')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const keywords = newResource.tags ? newResource.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      if (uploadMode === 'file') {
        await uploadDocument(
          selectedFile,
          {
            title: newResource.title.trim(),
            description: newResource.summary.trim(),
            resourceCategory: newResource.resourceCategory || 'textbook',
            accessTier: newResource.accessTier || 'PUBLIC',
            author: newResource.author.trim(),
            department: newResource.department,
            course: newResource.course.trim(),
            keywords,
            year: new Date().getFullYear(),
            state: intent,
          },
          ({ percent }) => setUploadProgress(percent),
          authState.token
        )
      } else {
        await uploadDocument(
          null,
          {
            title: newResource.title.trim(),
            description: newResource.summary.trim(),
            resourceCategory: newResource.resourceCategory || 'textbook',
            accessTier: newResource.accessTier || 'PUBLIC',
            author: newResource.author.trim(),
            department: newResource.department,
            course: newResource.course.trim(),
            keywords,
            year: new Date().getFullYear(),
            state: intent,
            linkUrl: newResource.linkUrl.trim(),
          },
          ({ percent }) => setUploadProgress(percent),
          authState.token
        )
      }
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.')
      setIsUploading(false)
      return
    }
    setIsUploading(false)

    queryClient.invalidateQueries({ queryKey: ['library-docs'] })

    if (intent === 'draft') {
      setShowUploadModal(false)
      setUploadSuccessTitle('')
      uploadIntentRef.current = 'pending'
      toast.success('Saved as draft', {
        description: `"${newResource.title.trim()}" — submit from the Dashboard when ready.`,
      })
      return
    }

    setUploadSuccessTitle(newResource.title.trim())
    setShowUploadSuccess(true)
    resetModal()
  }

  const filteredResources = useMemo(() => {
    return publishedDocs.filter(item => {
      const type = getResourceType(item)
      const tabKey = getResourceTabKey(item)
      
      // Exclude research-related types from the Academic Resources tab
      if (['Research Paper', 'Thesis', 'Dataset'].includes(type)) {
        return false
      }

      // Filter out pending documents - only show published ones
      if (item.id.startsWith('doc-') && item.state !== 'published') {
        return false
      }

      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.author || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.course || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesTab = selectedCategory === 'All' || tabKey === selectedCategory
      const matchesDept = filterDepartment === 'All' || item.department === filterDepartment
      const matchesCourse = filterCourse === 'All' || item.course === filterCourse
      return matchesSearch && matchesTab && matchesDept && matchesCourse
    }).sort((a, b) => {
      if (sortBy === 'downloads') return (b.downloads || 0) - (a.downloads || 0)
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
      if (sortBy === 'recent') return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      return 0
    })
  }, [publishedDocs, searchQuery, selectedCategory, filterDepartment, filterCourse, sortBy])

  const isShowingSkeleton = loadingPublished && (authState?.token || authState?.role === 'GUEST')

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-accent/20 p-6 md:p-8 text-white shadow-lg border border-slate-800">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <GraduationCap size={200} />
        </div>
        <div className="relative grid gap-4 max-w-2xl">
          <div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent uppercase tracking-wider bg-accent/15 px-2.5 py-1 rounded-full mb-3">
              <Sparkles size={12} className="text-accent" /> Institutional Repository
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight">Academic Resources</h2>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Explore, bookmark, and contribute course textbooks, lecture slides, lab manuals, and research papers verified by CSEDU faculty.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 border-t border-slate-700/50 pt-4 mt-2">
            <div>
              <p className="text-xl font-bold text-white">{publishedDocs.length}+</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Assets</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">{courses.length - 1}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Active Courses</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">{bookmarks.length}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Bookmarked</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top-level page tab: Digital Resources vs Physical Catalog ── */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'digital', label: 'Digital Resources', Icon: Laptop },
          { id: 'catalog', label: 'Physical Catalog', Icon: Library },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPageTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors ${
              pageTab === id
                ? 'border-accent text-accent bg-accent/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Physical Catalog Panel ─────────────────────────────────── */}
      {pageTab === 'catalog' && (
        <div className="grid gap-5">
          {/* Catalog stats bar */}
          {catalogStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Titles', value: Number(catalogStats.total_items) },
                { label: 'Available Now', value: Number(catalogStats.available_items), color: 'text-emerald-600' },
                { label: 'Total Copies', value: Number(catalogStats.total_copies) },
                { label: 'Checked Out', value: Number(catalogStats.checked_out_items), color: 'text-amber-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className={`text-xl font-extrabold ${color || 'text-foreground'}`}>{Number.isNaN(value) ? '—' : value}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <Input
                placeholder="Search by title, author, ISBN, subject…"
                className="pl-9 pr-8"
                value={catalogSearchInput}
                onChange={e => setCatalogSearchInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    setCatalogFilters(f => ({ ...f, q: catalogSearchInput.trim() }))
                    setCatalogPage(1)
                  }
                }}
              />
              {catalogSearchInput && (
                <button
                  onClick={() => { setCatalogSearchInput(''); setCatalogFilters(f => ({ ...f, q: '' })); setCatalogPage(1) }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <Button
              onClick={() => { setCatalogFilters(f => ({ ...f, q: catalogSearchInput.trim() })); setCatalogPage(1) }}
              className="gap-1.5 text-xs shrink-0"
            >
              <Search size={13} /> Search
            </Button>
          </div>

          {/* Filters */}
          <CatalogSearchFilters
            filters={catalogFilters}
            onChange={(newFilters) => { setCatalogFilters(newFilters); setCatalogPage(1) }}
            compact
          />

          {/* Results */}
          {catalogLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={22} className="animate-spin text-muted-foreground" />
            </div>
          ) : catalogIsError ? (
            <div className="text-center py-14 text-muted-foreground border border-dashed border-red-500/30 bg-red-500/5 rounded-xl">
              <AlertCircle size={32} className="mx-auto text-red-500/50 mb-3" />
              <p className="text-sm font-semibold text-foreground">Couldn't load the catalog</p>
              <p className="text-xs mt-1">Something went wrong fetching results. Please try again.</p>
            </div>
          ) : catalogItems.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground border border-dashed border-border rounded-xl">
              <BookOpen size={32} className="mx-auto opacity-20 mb-3" />
              <p className="text-sm font-semibold text-foreground">No catalog items found</p>
              <p className="text-xs mt-1">Try different search terms or clear your filters.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              <p className="text-xs text-muted-foreground font-semibold">
                {catalogPagination?.total ?? catalogItems.length} item{(catalogPagination?.total ?? catalogItems.length) !== 1 ? 's' : ''} found
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {catalogItems.map(item => (
                  <CatalogItemCard key={item.id} item={item} />
                ))}
              </div>

              {/* Pagination */}
              {catalogPagination && catalogPagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={catalogPage === 1} onClick={() => setCatalogPage(p => p - 1)}>
                    ← Prev
                  </Button>
                  <span className="text-xs text-muted-foreground font-medium">
                    Page {catalogPage} of {catalogPagination.totalPages}
                  </span>
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={catalogPage >= catalogPagination.totalPages} onClick={() => setCatalogPage(p => p + 1)}>
                    Next →
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Digital Resources section (hidden when catalog tab active) ── */}
      {pageTab === 'digital' && (
      <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
              placeholder="Search textbooks, authors, course codes..." 
              className="pl-9 pr-8 bg-muted/20 border-border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors">
                <X size={15} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" className="gap-1 text-xs h-10 border-border" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
              <Filter size={14} /> Filters
            </Button>
            <Button className="gap-1 text-xs h-10" onClick={handleUploadClick}>
              <Plus size={15} /> Add Resource
            </Button>
          </div>
        </div>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showAdvancedFilters ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <Card className="border-border bg-muted/10">
            <CardContent className="p-4 grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="dept-filter" className="text-xs font-semibold text-muted-foreground">Department</Label>
                <Select id="dept-filter" value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}>
                  {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="course-filter" className="text-xs font-semibold text-muted-foreground">Course Code</Label>
                <Select id="course-filter" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
                  {courses.map(c => <option key={c} value={c}>{c === 'All' ? 'All Courses' : c}</option>)}
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sort-by" className="text-xs font-semibold text-muted-foreground">Sort By</Label>
                <Select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="downloads">Most Downloaded</option>
                  <option value="rating">Highest Rated</option>
                  <option value="recent">Recently Updated</option>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
          {[
            { id: 'All', label: 'All Resources', icon: BookOpen },
            { id: 'Textbooks', label: 'Textbooks', icon: Book },
            { id: 'Slides', label: 'Lecture Slides', icon: Presentation },
            { id: 'Manuals', label: 'Lab Manuals', icon: FileText },
            { id: 'QuestionBanks', label: 'Question Banks', icon: HelpCircle },
            { id: 'Assignments', label: 'Assignments', icon: ClipboardCheck },
            { id: 'LabReports', label: 'Lab Reports', icon: FilePlus },
            { id: 'Videos', label: 'Video Content', icon: PlayCircle },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = selectedCategory === tab.id
            return (
              <button key={tab.id} onClick={() => setSelectedCategory(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border ${
                  isActive ? 'bg-accent text-white border-accent shadow-sm' : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        
        {/* Resource Cards Grid */}
        <div className="grid gap-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Archive Index</span>
            <span>{filteredResources.length} items found</span>
          </div>

          {isShowingSkeleton ? (
            <ResourceGridSkeleton count={4} />
          ) : filteredResources.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-border">
              <p className="text-muted-foreground font-semibold text-sm">No resources found.</p>
              <Button variant="outline" className="mt-4 text-xs" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setFilterDepartment('All'); setFilterCourse('All') }}>
                Clear Filters
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredResources.map(item => {
                const type = getResourceType(item)
                const isExternal = item.filePath && (item.filePath.startsWith('http://') || item.filePath.startsWith('https://'))
                const viewerLink = isExternal
                  ? item.filePath
                  : item.id.startsWith('doc-')
                    ? `/viewer/${item.id.replace('doc-', '')}`
                    : `/library/resource/${item.id}`

                return (
                  <ResourceCard
                    key={item.id}
                    item={item}
                    type={type}
                    isBookmarked={bookmarks.includes(item.id)}
                    onBookmark={toggleBookmark}
                    viewerLink={viewerLink}
                    pdfUrl={item.pdfUrl}
                    hasVideo={Boolean(item.youtubeId)}
                    youtubeId={item.youtubeId}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        {isShowingSkeleton ? (
          <SidebarSkeleton />
        ) : (
        <div className="grid gap-6 self-start">
          <Card className="bg-gradient-to-br from-accent/10 via-transparent to-transparent border-accent/20">
            <CardContent className="p-5 grid gap-3">
              <h4 className="text-xs font-bold text-accent-strong uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={13} /> Share Knowledge
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Have verified lecture slides, lab manuals, or textbook links? Upload them to the department directory.
              </p>
              <Button onClick={handleUploadClick} size="sm" className="w-full text-xs gap-1 py-4 font-semibold">
                <Plus size={14} /> Upload Resource
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Bookmark size={13} className="text-accent" /> My Bookmarks ({visibleBookmarks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 grid gap-2.5">
              {visibleBookmarks.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">No bookmarked items yet.</p>
              ) : (
                visibleBookmarks.map(id => {
                  const r = publishedDocs.find(doc => doc.id === id)
                  if (!r) return null
                  return (
                    <div key={r.id} className="group flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                      <div className="grid gap-0.5 min-w-0">
                        <Link to={`/library/resource/${r.id}`} className="text-xs font-bold text-foreground truncate hover:text-accent transition-colors">
                          {r.title}
                        </Link>
                        <p className="text-[10px] text-muted-foreground truncate">{r.course} · {r.author}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="w-6 h-6 hover:text-red-500 shrink-0" onClick={() => toggleBookmark(r.id)}>
                        <X size={12} />
                      </Button>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-muted/20">
            <CardContent className="p-4 grid gap-2 text-xs text-muted-foreground leading-relaxed">
              <h4 className="font-bold text-foreground">Academic Integrity</h4>
              <p>All resources are reviewed by course supervisors. Sharing copyright-infringed exams or assignments is strictly prohibited.</p>
            </CardContent>
          </Card>
        </div>
        )}
      </div>

      {/* Login Prompt Modal for Guests */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="sm:max-w-sm">
          <div className="flex flex-col items-center text-center gap-5 py-4">
            <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
              <GraduationCap size={28} className="text-accent" />
            </div>
            <div className="grid gap-1.5">
              <DialogTitle>Login Required</DialogTitle>
              <DialogDescription>
                You need to sign in or register to upload academic resources to the library.
              </DialogDescription>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Button asChild className="w-full gap-2 text-xs font-semibold">
                <Link to="/login">Log In</Link>
              </Button>
              <Button asChild variant="outline" className="w-full gap-2 text-xs font-semibold">
                <Link to="/register">Create an Account</Link>
              </Button>
            </div>
            <button
              onClick={() => setShowLoginPrompt(false)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Continue as Guest
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Success Modal (submissions only) */}
      <Dialog open={showUploadSuccess} onOpenChange={(open) => { if (!open) { setShowUploadSuccess(false); setUploadSuccessTitle('') }}}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <div className="grid gap-2">
              <DialogTitle>Submitted Successfully!</DialogTitle>
              <DialogDescription>
                Your academic resource "<strong>{uploadSuccessTitle}</strong>" has been submitted for admin review.
              </DialogDescription>
            </div>
            <div className="w-full rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 text-left">
              <p className="text-xs font-semibold text-blue-600 mb-2">📋 What happens next?</p>
              <ul className="text-xs text-blue-600 space-y-1.5 list-disc list-inside">
                <li>An admin will review your resource</li>
                <li>You'll be notified once it's approved</li>
                <li>Once approved, it appears in the library</li>
              </ul>
            </div>
            <Button onClick={() => { setShowUploadSuccess(false); setUploadSuccessTitle('') }} className="w-full gap-2 bg-green-500 hover:bg-green-600 text-white">
              <CheckCircle2 size={16} />
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Resource Modal */}
      <Dialog open={showUploadModal} onOpenChange={(open) => { if (!open) resetModal() }}>
        <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
          
          {/* Modal Header */}
          <DialogHeader className="p-5 border-b border-border bg-gradient-to-r from-muted/30 to-transparent">
            <DialogTitle className="flex items-center gap-2">
              <CloudUpload size={18} className="text-accent" />
              Add Academic Resource
            </DialogTitle>
            <DialogDescription>Share textbooks, lecture slides, or research papers with the department.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit}>
            <div className="p-5 grid gap-4 max-h-[70vh] overflow-y-auto">

              {/* ── Resource Metadata ── */}
              <div className="grid gap-1.5">
                <Label htmlFor="res-title-input" className="text-xs font-semibold">Resource Title *</Label>
                <Input id="res-title-input" placeholder="e.g. Introduction to Algorithms (CLRS) 4th Edition"
                  value={newResource.title} onChange={e => setNewResource(p => ({ ...p, title: e.target.value }))} required />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="res-author-input" className="text-xs font-semibold">Author / Publisher *</Label>
                  <Input id="res-author-input" placeholder="e.g. Thomas H. Cormen"
                    value={newResource.author} onChange={e => setNewResource(p => ({ ...p, author: e.target.value }))} required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="res-course-input" className="text-xs font-semibold">Course Code *</Label>
                  <Input id="res-course-input" placeholder="e.g. CSE-201"
                    value={newResource.course} onChange={e => setNewResource(p => ({ ...p, course: e.target.value }))} required />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="res-dept-select" className="text-xs font-semibold">Department</Label>
                  <Select id="res-dept-select" value={newResource.department} onChange={e => setNewResource(p => ({ ...p, department: e.target.value }))}>
                    <option value="CSE">Computer Science & Engineering</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Engineering">General Engineering</option>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="res-type-select" className="text-xs font-semibold">Resource Type</Label>
                  <Select id="res-type-select" value={newResource.type} 
                    onChange={e => {
                      const val = e.target.value;
                      let category = 'textbook';
                      if (val === 'PPT') category = 'lecture-slides';
                      if (val === 'Dataset') category = 'dataset';
                      if (val === 'Question Bank') category = 'question-bank';
                      if (val === 'Assignment') category = 'assignment';
                      if (val === 'Lab Report') category = 'lab-report';
                      if (val === 'Video') category = 'media';
                      if (val === 'Link') category = 'media';
                      setNewResource(p => ({ ...p, type: val, resourceCategory: category }));
                    }}>
                    <option value="PDF">PDF Document / E-Book</option>
                    <option value="PPT">Presentation Slides (PPT/PPTX)</option>
                    <option value="Question Bank">Question Bank</option>
                      <option value="Assignment">Assignment</option>
                      <option value="Lab Report">Lab Report</option>
                      <option value="Video">Video Content</option>
                      <option value="Link">External Online Resource</option>
                    </Select>
                  </div>
                </div>        
                {/* ── Access Tier ── */}
                <div className="grid gap-1.5">
                  <Label htmlFor="res-access-tier" className="text-xs font-semibold">Access Level</Label>
                  <Select
                    id="res-access-tier"
                    value={newResource.accessTier || 'PUBLIC'}
                    onChange={e => setNewResource(p => ({ ...p, accessTier: e.target.value }))}
                  >
                    <option value="PUBLIC">Public — Visible to everyone (including guests)</option>
                    <option value="REGISTERED">Registered — Visible only to logged-in members</option>
                  </Select>
                </div>

                {/* ── Source: URL toggle or File upload ── */}
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">Document Source</Label>

                  {/* Toggle buttons */}
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button type="button"
                      onClick={() => { setUploadMode('url'); setSelectedFile(null); setUploadError('') }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all ${
                        uploadMode === 'url'
                          ? 'bg-accent text-white'
                          : 'bg-background text-muted-foreground hover:bg-muted/40'
                      }`}>
                      <Link2 size={13} /> Paste a URL
                    </button>
                    <button type="button"
                      onClick={() => { setUploadMode('file'); setUploadError('') }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all border-l border-border ${
                        uploadMode === 'file'
                          ? 'bg-accent text-white'
                          : 'bg-background text-muted-foreground hover:bg-muted/40'
                      }`}>
                      <Upload size={13} /> Upload File
                    </button>
                  </div>

                  {/* URL mode */}
                  {uploadMode === 'url' && (
                    <Input id="res-url-input"
                      placeholder="https://drive.google.com/file/d/... or any public link"
                      value={newResource.linkUrl}
                      onChange={e => setNewResource(p => ({ ...p, linkUrl: e.target.value }))}
                    />
                  )}

                  {/* File upload mode */}
                  {uploadMode === 'file' && (
                    <div className="grid gap-2">
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.ppt,.pptx,.doc,.docx,.csv,.zip,.xls,.xlsx"
                        className="hidden"
                        onChange={e => handleFileSelect(e.target.files?.[0])}
                      />

                      {/* Drag-and-drop zone */}
                      {!selectedFile ? (
                        <div
                          onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                          onDragLeave={() => setIsDragOver(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer py-8 px-4 transition-all ${
                            isDragOver
                              ? 'border-accent bg-accent/5 scale-[1.01]'
                              : 'border-border bg-muted/10 hover:border-accent/50 hover:bg-muted/20'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                            isDragOver ? 'bg-accent/15' : 'bg-muted/30'
                          }`}>
                            <CloudUpload size={24} className={isDragOver ? 'text-accent' : 'text-muted-foreground'} />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-semibold text-foreground">Drop your file here, or <span className="text-accent">browse</span></p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">PDF, PPT, PPTX, DOC, DOCX, CSV, ZIP — max 50MB</p>
                          </div>
                        </div>
                      ) : (
                        /* Selected file display — show AI extraction loading while analyzing */
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-accent/30 bg-accent/5">
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                            {isExtracting ? (
                              <Loader2 size={18} className="text-accent animate-spin" />
                            ) : (
                              <FileText size={18} className="text-accent" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">{selectedFile.name}</p>
                            {isExtracting ? (
                              <p className="text-[10px] text-accent font-semibold flex items-center gap-1">
                                <Sparkles size={10} className="animate-pulse" />
                                AI analyzing document...
                              </p>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            )}
                          </div>
                          <Button type="button" size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-red-500 shrink-0"
                            onClick={() => { setSelectedFile(null); setUploadProgress(0) }}>
                            <X size={13} />
                          </Button>
                        </div>
                      )}

                      {/* Upload Progress Bar */}
                      {isUploading && (
                        <div className="grid gap-1.5">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Uploading to server...</span>
                            <span className="font-bold text-accent">{uploadProgress}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-accent to-accent/70 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Upload success */}
                      {!isUploading && uploadProgress === 100 && (
                        <p className="flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                          <CheckCircle2 size={12} /> File uploaded successfully!
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Extraction status message */}
                {newResource._extractionError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span>
                      <strong>Auto-fill note:</strong> {newResource._extractionError}
                    </span>
                  </div>
                )}
                {newResource._extractionSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600">
                    <Sparkles size={13} />
                    <span>Fields auto-populated from document analysis. Review and adjust if needed.</span>
                  </div>
                )}

                {/* Tags */}
                <div className="grid gap-1.5">
                  <Label htmlFor="res-tags-input" className="text-xs font-semibold">Tags <span className="font-normal text-muted-foreground">(comma-separated)</span></Label>
                  <Input id="res-tags-input" placeholder="e.g. dsa, textbook, core"
                    value={newResource.tags} onChange={e => setNewResource(p => ({ ...p, tags: e.target.value }))} />
                </div>

                {/* Summary */}
                <div className="grid gap-1.5">
                  <Label htmlFor="res-summary-input" className="text-xs font-semibold">Short Summary</Label>
                  <Textarea id="res-summary-input" placeholder="Provide a brief description of this resource..." rows={2}
                    value={newResource.summary} onChange={e => setNewResource(p => ({ ...p, summary: e.target.value }))}
                    className="resize-none text-xs" />
                </div>

                {/* Error message */}
                {uploadError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                )}

              </div>

              {/* Footer */}
              <DialogFooter className="p-4 border-t border-border bg-muted/10 sm:justify-end">
                <Button type="button" variant="outline" size="sm" onClick={resetModal} disabled={isUploading}>Cancel</Button>
                <Button type="button" size="sm" variant="outline" className="gap-1.5 min-w-[120px]" disabled={isUploading}
                  onClick={() => handleUploadSubmit(null, 'draft')}>
                  {isUploading ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : <><FileEdit size={13} /> Save as Draft</>}
                </Button>
                <Button type="button" size="sm" className="gap-1.5 min-w-[120px]" disabled={isUploading}
                  onClick={() => handleUploadSubmit(null, 'pending')}>
                  {isUploading
                    ? <><Loader2 size={13} className="animate-spin" /> Uploading...</>
                    : <><CloudUpload size={13} /> Add Resource</>
                  }
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </> /* end pageTab === 'digital' */
      )}
    </div>
  )
}
