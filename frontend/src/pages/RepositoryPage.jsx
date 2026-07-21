import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '../app/use-auth.js'
import { apiRequest } from '../services/api/client'
import { uploadDocument } from '../services/api/documents.js'
import { ResourceGridSkeleton, SidebarSkeleton } from '../components/library/ResourceCardSkeleton.jsx'
import ResourceCard from '../components/library/ResourceCard.jsx'
import { extractFileMetadata } from '../services/metadataExtractor.js'
import { toast } from 'sonner'
import { 
  Search, 
  GraduationCap, 
  Bookmark, 
  Plus, 
  X, 
  Filter, 
  BookOpen, 
  Sparkles,
  CloudUpload,
  Link2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Database,
  Tag,
  FileEdit
} from 'lucide-react'

export default function RepositoryPage() {
  const { authState } = useAuth()
  const queryClient = useQueryClient()

  const { data: publishedDocs = [], isLoading: loadingPublished } = useQuery({
    queryKey: ['repository-docs', authState?.token || 'guest'],
    queryFn: async ({ queryKey }) => {
      const token = queryKey[1] === 'guest' ? null : queryKey[1]
      const isGuest = !token
      const categories = ['research-paper', 'thesis', 'dataset']
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
                type: doc.type || 'Research Paper',
                resourceCategory: doc.resourceCategory || resourceCategory,
                format: doc.format,
                version: doc.version,
                state: doc.state,
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
  
  const [exploreBookmarks, setExploreBookmarks] = useState(() => {
    const saved = localStorage.getItem('dkp_bookmarked_resources')
    return saved ? JSON.parse(saved) : []
  })

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('All')
  const [selectedDept, setSelectedDept] = useState('All')
  const [selectedCourse, setSelectedCourse] = useState('All')
  const [sortBy, setSortBy] = useState('recent')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Upload Modal States
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showUploadSuccess, setShowUploadSuccess] = useState(false)
  const [uploadSuccessTitle, setUploadSuccessTitle] = useState('')
  const uploadIntentRef = useRef('pending')
  const [newResource, setNewResource] = useState({
    title: '', author: '', department: 'Computer Science and Engineering', course: '', type: 'Research Paper', tags: '', summary: '', linkUrl: '', resourceCategory: 'research-paper', accessTier: 'PUBLIC',
  })
  const [uploadMode, setUploadMode] = useState('url') // 'url' | 'file'
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const fileInputRef = useRef(null)

  // Suggested tags by domain
  const domainTags = [
    'Machine Learning', 'Computer Vision', 'NLP', 'Data Science', 'Cybersecurity', 
    'Networking', 'Bioinformatics', 'Database Systems', 'Cloud Computing', 'Software Engineering'
  ]

  // Sync bookmarks
  useEffect(() => {
    localStorage.setItem('dkp_bookmarked_resources', JSON.stringify(exploreBookmarks))
  }, [exploreBookmarks])

  // Keep this useEffect for bookmark sync (separate from data fetching)


  // Classify types for badges and tabs
  const getResearchType = (item) => {
    // First check resourceCategory from backend
    const category = String(item.resourceCategory || '').toLowerCase()
    if (category === 'research-paper') return 'Research Paper'
    if (category === 'thesis') return 'Thesis'
    if (category === 'dataset') return 'Dataset'
    
    // Fallback to type field
    const type = String(item.type || '').toLowerCase()
    if (type === 'paper' || type === 'research paper') return 'Research Paper'
    if (type === 'thesis') return 'Thesis'
    if (type === 'dataset' || type === 'datasets') return 'Dataset'
    return 'Research Paper'
  }

  // Filtered lists
  const filteredExplore = useMemo(() => {
    return publishedDocs.filter(item => {
      // Only show published documents from backend
      if (item.state === 'pending') {
        return false
      }
      if (item.id.startsWith('doc-') && item.state !== 'published') {
        return false
      }
      
      const type = getResearchType(item)
      // Only show research types in this repository
      if (!['Research Paper', 'Thesis', 'Dataset'].includes(type)) {
        return false
      }

      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.author || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.course || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesType = selectedType === 'All' || type === selectedType
      const matchesDept = selectedDept === 'All' || item.department === selectedDept
      const matchesCourse = selectedCourse === 'All' || item.course === selectedCourse
      
      return matchesSearch && matchesType && matchesDept && matchesCourse
    }).sort((a, b) => {
      if (sortBy === 'downloads') return (b.downloads || 0) - (a.downloads || 0)
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
    })
  }, [publishedDocs, searchQuery, selectedType, selectedDept, selectedCourse, sortBy])

  const departments = useMemo(() => {
    const deps = new Set(publishedDocs.map(r => r.department).filter(Boolean))
    return ['All', ...Array.from(deps)]
  }, [publishedDocs])

  const courses = useMemo(() => {
    const crs = new Set(publishedDocs.map(r => r.course).filter(Boolean))
    return ['All', ...Array.from(crs)]
  }, [publishedDocs])

  const visibleBookmarks = useMemo(() =>
    exploreBookmarks.filter(id => publishedDocs.some(doc => doc.id === id)),
    [exploreBookmarks, publishedDocs]
  )

  const toggleBookmark = (id) => {
    setExploreBookmarks(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id])
  }

  // Upload handlers
  // Intercept upload clicks for guests — show login prompt instead
  const handleUploadClick = useCallback(() => {
    if (!authState?.token) {
      setShowLoginPrompt(true)
    } else {
      setShowUploadModal(true)
    }
  }, [authState?.token])

  const resetModal = useCallback(() => {
    setShowUploadModal(false)
    setShowUploadSuccess(false)
    uploadIntentRef.current = 'pending'
    setNewResource({ title: '', author: '', department: 'Computer Science and Engineering', course: 'N/A', type: 'Research Paper', tags: '', summary: '', linkUrl: '', resourceCategory: 'research-paper', accessTier: 'PUBLIC' })
    setUploadMode('url')
    setSelectedFile(null)
    setUploadProgress(0)
    setIsUploading(false)
    setUploadError('')
    setIsDragOver(false)
    setIsExtracting(false)
  }, [])

  const handleFileSelect = async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    const typeMap = { pdf: 'Research Paper', zip: 'Dataset', csv: 'Dataset', tar: 'Dataset', gz: 'Dataset' }
    const inferredType = typeMap[ext] || 'Research Paper'
    
    let inferredCategory = 'research-paper'
    if (inferredType === 'Dataset') inferredCategory = 'dataset'

    setSelectedFile(file)
    setUploadError('')
    setIsExtracting(true)

    // Extract metadata from file using Gemini AI
    const fileMeta = await extractFileMetadata(file)
    setIsExtracting(false)

    setNewResource(p => ({
      ...p,
      type: inferredType,
      resourceCategory: inferredCategory,
      title: fileMeta.title || p.title || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      author: fileMeta.author || p.author,
      summary: fileMeta.summary || p.summary,
      tags: fileMeta.tags || p.tags,
      _extractionError: fileMeta.success ? null : (fileMeta.error || null),
      _extractionSuccess: fileMeta.success,
    }))
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
    if (!newResource.title.trim() || !newResource.author.trim()) {
      setUploadError('Please fill in Title and Author(s).')
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
            resourceCategory: newResource.resourceCategory,
            accessTier: newResource.accessTier || 'PUBLIC',
            keywords,
            author: newResource.author.trim(),
            department: newResource.department,
            course: newResource.course.trim(),
            year: new Date().getFullYear(),
            language: 'English',
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
            resourceCategory: newResource.resourceCategory,
            accessTier: newResource.accessTier || 'PUBLIC',
            keywords,
            author: newResource.author.trim(),
            department: newResource.department,
            course: newResource.course.trim(),
            year: new Date().getFullYear(),
            language: 'English',
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

    queryClient.invalidateQueries({ queryKey: ['repository-docs'] })
    setShowUploadModal(false)

    if (intent === 'draft') {
      toast.success('Saved as draft', {
        description: `"${newResource.title.trim()}" — submit from the Dashboard when ready.`,
      })
      return
    }

    setUploadSuccessTitle(newResource.title.trim())
    setShowUploadSuccess(true)
  }

  const addTag = (tag) => {
    setNewResource(p => {
      const currentTags = p.tags ? p.tags.split(',').map(t => t.trim()) : []
      if (currentTags.includes(tag)) return p
      const nextTags = [...currentTags, tag].join(', ')
      return { ...p, tags: nextTags }
    })
  }

  const isShowingSkeleton = loadingPublished && (authState?.token || authState?.role === 'GUEST')

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900/30 p-6 md:p-8 text-white shadow-lg border border-slate-800">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <GraduationCap size={220} />
        </div>
        <div className="relative grid gap-4 max-w-2xl">
          <div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent uppercase tracking-wider bg-accent/15 px-2.5 py-1 rounded-full mb-3 border border-accent/20">
              <Sparkles size={12} className="text-accent" /> CSEDU Research
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight">Research Repository</h2>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Access peer-reviewed papers, undergraduate theses, and open-source datasets published by CSEDU researchers, faculty, and students.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <Button className="text-xs font-semibold bg-accent hover:bg-accent/90 text-white border-none" onClick={handleUploadClick}>
              <Plus size={15} /> Submit Research
            </Button>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="grid gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">Explore Publications</span>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title, author, course, tags..."
                className="pl-9 pr-8 text-xs h-9 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className={`w-9 h-9 shrink-0 ${showAdvancedFilters ? 'bg-accent/10 border-accent/30 text-accent' : ''}`}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter size={14} />
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
          {[
            { id: 'All', label: 'All Research', icon: BookOpen },
            { id: 'Research Paper', label: 'Research Papers', icon: FileText },
            { id: 'Thesis', label: 'Theses & Dissertations', icon: GraduationCap },
            { id: 'Dataset', label: 'Datasets', icon: Database },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = selectedType === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-accent text-white border-accent shadow-sm'
                    : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            )
          })}
        </div>

        {/* Advanced Filters */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showAdvancedFilters ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <Card className="border-border bg-muted/10">
            <CardContent className="p-4 grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="repo-dept" className="text-xs font-semibold text-muted-foreground">Department</Label>
                <Select id="repo-dept" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
                  {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="repo-course" className="text-xs font-semibold text-muted-foreground">Course Code</Label>
                <Select id="repo-course" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                  {courses.map(c => <option key={c} value={c}>{c === 'All' ? 'All Courses' : c}</option>)}
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="repo-sort" className="text-xs font-semibold text-muted-foreground">Sort By</Label>
                <Select id="repo-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="recent">Recently Added</option>
                  <option value="downloads">Most Downloaded</option>
                  <option value="rating">Highest Rated</option>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        
        {/* Left Column: Research Cards */}
        <div className="grid gap-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
          <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Publications Index</span>
            <span>{filteredExplore.length} items found</span>
          </div>

          {isShowingSkeleton ? (
            <ResourceGridSkeleton count={4} />
          ) : filteredExplore.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-border">
              <p className="text-muted-foreground font-semibold text-sm">No research resources found.</p>
              <Button variant="outline" className="mt-4 text-xs" onClick={() => { setSearchQuery(''); setSelectedType('All'); setSelectedDept('All'); setSelectedCourse('All') }}>
                Clear Filters
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredExplore.map(item => {
                const type = getResearchType(item)
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
                    isBookmarked={exploreBookmarks.includes(item.id)}
                    onBookmark={toggleBookmark}
                    viewerLink={viewerLink}
                    pdfUrl={item.pdfUrl}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Sidebar */}
        {isShowingSkeleton ? (
          <SidebarSkeleton />
        ) : (
        <div className="grid gap-6 self-start">
          <Card className="bg-gradient-to-br from-accent/10 via-transparent to-transparent border-accent/20">
            <CardContent className="p-5 grid gap-3">
              <h4 className="text-xs font-bold text-accent-strong uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={13} /> Publish Research
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Submit your preprints, publications, or dataset archives to be indexed in the CSEDU Institutional Repository.
              </p>
              <Button size="sm" className="w-full text-xs gap-1 py-4 font-semibold bg-accent hover:bg-accent/90 text-white border-none" onClick={handleUploadClick}>
                <Plus size={14} /> Submit Research
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Bookmark size={13} className="text-accent" /> Bookmarks ({visibleBookmarks.length})
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
                        <p className="text-[10px] text-muted-foreground truncate">{r.author}</p>
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
                You need to sign in or register to submit research publications to the repository.
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

      {/* Upload Research Modal */}
      <Dialog open={showUploadModal} onOpenChange={(open) => { if (!open) resetModal() }}>
        <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
          
          {/* Modal Header */}
          <DialogHeader className="p-5 border-b border-border bg-gradient-to-r from-muted/30 to-transparent">
            <DialogTitle className="flex items-center gap-2">
              <CloudUpload size={18} className="text-accent" />
              Submit Research Publication
            </DialogTitle>
            <DialogDescription>Publish research papers, theses, or datasets to the institutional repository.</DialogDescription>
          </DialogHeader>

            <form onSubmit={handleUploadSubmit}>
              <div className="p-5 grid gap-4 max-h-[70vh] overflow-y-auto">

                {/* Title */}
                <div className="grid gap-1.5">
                  <Label htmlFor="repo-title-input" className="text-xs font-semibold">Publication Title *</Label>
                  <Input id="repo-title-input" placeholder="e.g. Deep Learning for Real-Time Satellite Imagery Classification"
                    value={newResource.title} onChange={e => setNewResource(p => ({ ...p, title: e.target.value }))} required />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Author */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="repo-author-input" className="text-xs font-semibold">Author(s) / Researchers *</Label>
                    <Input id="repo-author-input" placeholder="e.g. Ahmed Kabir, Dr. Sarah Chen"
                      value={newResource.author} onChange={e => setNewResource(p => ({ ...p, author: e.target.value }))} required />
                  </div>
                  {/* Course / Project Code */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="repo-course-input" className="text-xs font-semibold">Course Code / Project ID (Optional)</Label>
                    <Input id="repo-course-input" placeholder="e.g. Thesis-400 or N/A"
                      value={newResource.course} onChange={e => setNewResource(p => ({ ...p, course: e.target.value }))} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Dept */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="repo-dept-select" className="text-xs font-semibold">Department</Label>
                    <Select id="repo-dept-select" value={newResource.department} onChange={e => setNewResource(p => ({ ...p, department: e.target.value }))}>
                      <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                      <option value="Information Science and Library Management">Information Science and Library Management</option>
                      <option value="Electrical and Electronic Engineering">Electrical and Electronic Engineering</option>
                      <option value="Genetic Engineering">Genetic Engineering</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Business Administration">Business Administration</option>
                      <option value="Other">Other</option>
                    </Select>
                  </div>
                  {/* Type */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="repo-type-select" className="text-xs font-semibold">Research Type</Label>
                    <Select id="repo-type-select" value={newResource.type} 
                      onChange={e => {
                        const val = e.target.value;
                        let category = 'research-paper';
                        if (val === 'Thesis') category = 'thesis';
                        if (val === 'Dataset') category = 'dataset';
                        setNewResource(p => ({ ...p, type: val, resourceCategory: category }));
                      }}>
                      <option value="Research Paper">Research Paper</option>
                      <option value="Thesis">Thesis / Dissertation</option>
                      <option value="Dataset">Dataset Archive</option>
                    </Select>
                  </div>
                </div>

                {/* ── Access Tier ── */}
                <div className="grid gap-1.5">
                  <Label htmlFor="repo-access-tier" className="text-xs font-semibold">Access Level</Label>
                  <Select
                    id="repo-access-tier"
                    value={newResource.accessTier || 'PUBLIC'}
                    onChange={e => setNewResource(p => ({ ...p, accessTier: e.target.value }))}
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="REGISTERED">Private</option>
                    <option value="RESTRICTED">Restricted</option>
                  </Select>
                </div>

                {/* Source toggle */}
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">Document Source</Label>
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button type="button"
                      onClick={() => { setUploadMode('url'); setSelectedFile(null); setUploadError('') }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all ${
                        uploadMode === 'url' ? 'bg-accent text-white' : 'bg-background text-muted-foreground hover:bg-muted/40'
                      }`}>
                      <Link2 size={13} /> Paste a URL
                    </button>
                    <button type="button"
                      onClick={() => { setUploadMode('file'); setUploadError('') }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all border-l border-border ${
                        uploadMode === 'file' ? 'bg-accent text-white' : 'bg-background text-muted-foreground hover:bg-muted/40'
                      }`}>
                      <Upload size={13} /> Upload File
                    </button>
                  </div>

                  {uploadMode === 'url' && (
                    <Input placeholder="https://arxiv.org/pdf/... or any public link"
                      value={newResource.linkUrl} onChange={e => setNewResource(p => ({ ...p, linkUrl: e.target.value }))} />
                  )}

                  {uploadMode === 'file' && (
                    <div className="grid gap-2">
                      <input ref={fileInputRef} type="file" accept=".pdf,.zip,.tar,.gz,.csv,.json" className="hidden"
                        onChange={e => handleFileSelect(e.target.files?.[0])} />
                      {!selectedFile ? (
                        <div onDragOver={e => { e.preventDefault(); setIsDragOver(true) }} onDragLeave={() => setIsDragOver(false)}
                          onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                          className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer py-8 px-4 transition-all ${
                            isDragOver ? 'border-accent bg-accent/5 scale-[1.01]' : 'border-border bg-muted/10 hover:border-accent/50 hover:bg-muted/20'
                          }`}>
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDragOver ? 'bg-accent/15' : 'bg-muted/30'}`}>
                            <CloudUpload size={24} className={isDragOver ? 'text-accent' : 'text-muted-foreground'} />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-semibold text-foreground">Drop your file here, or <span className="text-accent">browse</span></p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">PDF, ZIP, CSV, TAR, GZ — max 50MB</p>
                          </div>
                        </div>
                      ) : (
                        /* Selected file display — show AI extraction loading while analyzing */
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-accent/30 bg-accent/5 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                            {isExtracting ? (
                              <Loader2 size={18} className="text-accent animate-spin" />
                            ) : newResource.type === 'Dataset' ? (
                              <Database size={18} className="text-accent" />
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
                              <p className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            )}
                          </div>
                          <Button type="button" size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-red-500 shrink-0"
                            onClick={() => { setSelectedFile(null); setUploadProgress(0) }}>
                            <X size={13} />
                          </Button>
                        </div>
                      )}

                      {isUploading && (
                        <div className="grid gap-1.5">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Uploading to server...</span>
                            <span className="font-bold text-accent">{uploadProgress}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-accent to-accent/70 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </div>
                      )}

                      {!isUploading && uploadProgress === 100 && (
                        <p className="flex items-center gap-1 text-[11px] text-emerald-500 font-semibold"><CheckCircle2 size={12} /> File uploaded successfully!</p>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Extraction status message */}
                {newResource._extractionError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span className="min-w-0 break-words">
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

                {/* Tags input with domain suggestions */}
                <div className="grid gap-1.5">
                  <Label htmlFor="repo-tags-input" className="text-xs font-semibold flex items-center gap-1"><Tag size={12} /> Tags (comma-separated)</Label>
                  <Input id="repo-tags-input" placeholder="e.g. machine-learning, cnn, satellite-imagery"
                    value={newResource.tags} onChange={e => setNewResource(p => ({ ...p, tags: e.target.value }))} />
                  
                  <div className="flex flex-wrap gap-1 mt-1">
                    {domainTags.map(tag => (
                      <button key={tag} type="button" onClick={() => addTag(tag.toLowerCase().replace(/\s+/g, '-'))}
                        className="text-xs font-medium px-2 py-0.5 rounded-full border border-border bg-muted/30 hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all">
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Abstract */}
                <div className="grid gap-1.5">
                  <Label htmlFor="repo-summary-input" className="text-xs font-semibold">Abstract / Summary</Label>
                  <Textarea id="repo-summary-input" placeholder="Provide a brief abstract or summary of the research..." rows={3}
                    value={newResource.summary} onChange={e => setNewResource(p => ({ ...p, summary: e.target.value }))}
                    className="resize-none text-xs" />
                </div>

                {/* Error */}
                {uploadError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                )}

            </div>

            <DialogFooter className="p-4 border-t border-border bg-muted/10">
              <Button type="button" variant="outline" size="sm" onClick={resetModal} disabled={isUploading}>Cancel</Button>
              <Button type="button" size="sm" variant="outline" className="gap-1.5 min-w-[120px]" disabled={isUploading}
                onClick={() => handleUploadSubmit(null, 'draft')}>
                {isUploading ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : <><FileEdit size={13} /> Save as Draft</>}
              </Button>
              <Button type="button" size="sm" className="gap-1.5 min-w-[120px]" disabled={isUploading}
                onClick={() => handleUploadSubmit(null, 'pending')}>
                {isUploading ? <><Loader2 size={13} className="animate-spin" /> Uploading...</> : <><CloudUpload size={13} /> Submit Research</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload Success Modal */}
      <Dialog open={showUploadSuccess} onOpenChange={(open) => { if (!open) resetModal() }}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <div className="grid gap-2">
              <DialogTitle>Submitted Successfully!</DialogTitle>
              <DialogDescription className="break-words">
                Your research paper "<strong>{uploadSuccessTitle}</strong>" has been submitted for admin review.
              </DialogDescription>
            </div>
            <div className="w-full rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 text-left">
              <p className="text-xs font-semibold text-blue-600 mb-2">What happens next?</p>
              <ul className="text-xs text-blue-600 space-y-1.5 list-disc list-inside">
                <li>An admin will review your publication</li>
                <li>You'll be notified once it's approved</li>
                <li>Once approved, it appears in the Research Repository</li>
              </ul>
            </div>
            <Button onClick={resetModal} className="w-full gap-2 bg-green-500 hover:bg-green-600 text-white">
              <CheckCircle2 size={16} />
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
