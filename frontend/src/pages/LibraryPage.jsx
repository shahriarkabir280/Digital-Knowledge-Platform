import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  BookOpen, 
  FileText, 
  Presentation, 
  GraduationCap, 
  Database, 
  Download, 
  Bookmark, 
  Plus, 
  X, 
  ExternalLink, 
  Star, 
  Filter, 
  Quote, 
  PlayCircle,
  Book,
  Sparkles,
  Link2,
  Upload,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderOpen,
  ClipboardCheck,
  FilePlus,
  HelpCircle,
  CheckSquare
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '../app/use-auth.js'
import { apiRequest } from '../services/api/client'
import { RESOURCE_ITEMS } from '../modules/library/data.js'
import { uploadDocument } from '../services/api/documents.js'
import PDFThumbnail from '../components/library/PDFThumbnail.jsx'

export default function LibraryPage() {
  const { authState } = useAuth()
  
  // Published documents from backend API
  const [publishedDocs, setPublishedDocs] = useState([])
  const [loadingPublished, setLoadingPublished] = useState(true)
  
  const [resources, setResources] = useState(() => {
    const saved = localStorage.getItem('dkp_academic_resources')
    return saved ? JSON.parse(saved) : RESOURCE_ITEMS
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [filterDepartment, setFilterDepartment] = useState('All')
  const [filterCourse, setFilterCourse] = useState('All')
  const [sortBy, setSortBy] = useState('downloads')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem('dkp_bookmarked_resources')
    return saved ? JSON.parse(saved) : ['res-001', 'res-008']
  })
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [newResource, setNewResource] = useState({
    title: '', author: '', department: 'Computer Science and Engineering', course: '', type: 'PDF', tags: '', summary: '', linkUrl: '', resourceCategory: 'textbook',
  })
  // Upload-specific state
  const [uploadMode, setUploadMode] = useState('url') // 'url' | 'file'
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [showUploadSuccess, setShowUploadSuccess] = useState(false)
  const [uploadSuccessTitle, setUploadSuccessTitle] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('dkp_academic_resources', JSON.stringify(resources))
  }, [resources])
  useEffect(() => {
    localStorage.setItem('dkp_bookmarked_resources', JSON.stringify(bookmarks))
  }, [bookmarks])

  // Fetch published documents from backend by academic-resource category
  useEffect(() => {
    const fetchPublishedDocuments = async () => {
      try {
        setLoadingPublished(true)
        const categories = ['textbook', 'lecture-slides', 'lab-manual', 'question-bank', 'assignment', 'lab-report', 'media']
        const docs = []
        const seenDocIds = new Set()

        for (const resourceCategory of categories) {
          try {
            const response = await apiRequest(`/documents/published?resourceCategory=${resourceCategory}`, {
              authToken: authState?.token,
            })

            if (response?.data?.items?.length) {
              for (const doc of response.data.items) {
                const numericDocId = Number(doc.id)
                let signedUrl = `/api/repository/files/${numericDocId || doc.id}/content`

                try {
                  const signedUrlResponse = await apiRequest(`/repository/files/${numericDocId || doc.id}/signed-url`, {
                    authToken: authState?.token,
                  })
                  if (signedUrlResponse?.data?.signedUrl) {
                    signedUrl = signedUrlResponse.data.signedUrl
                  }
                } catch (err) {
                  console.error(`Failed to get signed URL for doc ${doc.id}:`, err)
                }

                const docId = `doc-${doc.id}`
                if (seenDocIds.has(docId)) {
                  continue
                }
                seenDocIds.add(docId)

                docs.push({
                  id: docId,
                  title: doc.title,
                  type: doc.type || 'Lecture Notes',
                  format: doc.format,
                  version: doc.version,
                  state: doc.state,
                  resourceCategory: doc.resourceCategory || resourceCategory,
                  pdfUrl: signedUrl,
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
            console.error(`Failed to fetch published documents for ${resourceCategory}:`, error)
          }
        }

        setPublishedDocs(docs)
      } catch (error) {
        console.error('Failed to fetch published documents:', error)
      } finally {
        setLoadingPublished(false)
      }
    }

    if (authState?.token) {
      fetchPublishedDocuments()
    }
  }, [authState?.token])

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

  const getTypeBadgeStyles = (type) => {
    switch (type) {
      case 'Textbook': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
      case 'Lecture Slides': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      case 'Lab Manual': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      case 'Research Paper': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'Thesis': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
      case 'Dataset': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
      case 'Question Bank': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
      case 'Assignment': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
      case 'Lab Report': return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
      case 'Video': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
      default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
    }
  }

  const departments = useMemo(() => {
    const deps = new Set(resources.map(r => r.department).filter(Boolean))
    return ['All', ...Array.from(deps)]
  }, [resources])

  const courses = useMemo(() => {
    const crs = new Set(resources.map(r => r.course).filter(c => c && c.includes('-')))
    return ['All', ...Array.from(crs)]
  }, [resources])

  const toggleBookmark = (id) => {
    setBookmarks(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id])
  }

  const copyCitation = (resource) => {
    const year = resource.year || new Date(resource.updatedAt || Date.now()).getFullYear()
    const citation = `${resource.author || 'Anonymous'}. (${year}). ${resource.title}. Department of ${resource.department || 'CSE'}, Institutional Repository.`
    navigator.clipboard.writeText(citation)
    alert('Citation copied to clipboard in APA format!')
  }

  const resetModal = useCallback(() => {
    setShowUploadModal(false)
    setNewResource({ title: '', author: '', department: 'Computer Science and Engineering', course: '', type: 'PDF', tags: '', summary: '', linkUrl: '', resourceCategory: 'textbook' })
    setUploadMode('url')
    setSelectedFile(null)
    setUploadProgress(0)
    setIsUploading(false)
    setUploadError('')
    setIsDragOver(false)
    // Switch to All so the newly uploaded card is always visible
    setSelectedCategory('All')
  }, [])

  const handleFileSelect = (file) => {
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
    setNewResource(p => {
      const hasExplicitCategory = Boolean(p.resourceCategory) && p.resourceCategory !== 'textbook'
      const nextCategory = hasExplicitCategory ? p.resourceCategory : inferredCategory

      return {
        ...p,
        type: inferredType,
        resourceCategory: nextCategory,
        title: p.title || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      }
    })
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }, [])

  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    setUploadError('')
    if (!newResource.title.trim() || !newResource.author.trim() || !newResource.course.trim()) {
      setUploadError('Please fill in Title, Author, and Course Code.')
      return
    }
    if (uploadMode === 'file' && !selectedFile) {
      setUploadError('Please select a file to upload.')
      return
    }

    let resolvedPdfUrl = uploadMode === 'url' ? newResource.linkUrl.trim() : null
    let youtubeId = null

    // Parse YouTube ID if type is Video
    if (newResource.type === 'Video') {
      if (uploadMode === 'url' && newResource.linkUrl) {
        const url = newResource.linkUrl.trim()
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
        const match = url.match(regExp)
        if (match && match[2].length === 11) {
          youtubeId = match[2]
        } else {
          youtubeId = url
        }
      }
    }

    // --- File upload path ---
    if (uploadMode === 'file' && selectedFile) {
      if (!authState?.token) {
        setUploadError('You must be logged in to upload files.')
        return
      }
      setIsUploading(true)
      setUploadProgress(0)
      try {
        const result = await uploadDocument(
          selectedFile,
          { 
            title: newResource.title.trim(), 
            description: newResource.summary.trim(),
            resourceCategory: newResource.resourceCategory || 'textbook'
          },
          ({ percent }) => setUploadProgress(percent),
          authState.token
        )
        // Build streaming content URL from the returned document ID
        const docId = result?.data?.document?.id
        if (docId) {
          // Use relative /api path — works through Vite proxy in dev and nginx in prod
          resolvedPdfUrl = `/api/repository/files/${docId}/content`
        }
      } catch (err) {
        setUploadError(err.message || 'Upload failed. Please try again.')
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    }

    setUploadSuccessTitle(newResource.title.trim())
    setShowUploadSuccess(true)
    resetModal()
  }

  const filteredResources = useMemo(() => {
    // Combine localStorage resources and published backend documents
    const allResources = [...resources, ...publishedDocs]
    
    return allResources.filter(item => {
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
  }, [resources, publishedDocs, searchQuery, selectedCategory, filterDepartment, filterCourse, sortBy])

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-2">
      
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-700/50 pt-4 mt-2">
            <div>
              <p className="text-xl font-bold text-white">{resources.length}+</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Assets</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">{courses.length - 1}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Active Courses</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">{bookmarks.length}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Bookmarked</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">4.8 ★</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Actions Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
              placeholder="Search textbooks, authors, course codes..." 
              className="pl-9 bg-muted/20 border-border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" className="gap-1 text-xs h-10 border-border" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
              <Filter size={14} /> Filters
            </Button>
            <Button className="gap-1 text-xs h-10" onClick={() => setShowUploadModal(true)}>
              <Plus size={15} /> Add Resource
            </Button>
          </div>
        </div>

        {showAdvancedFilters && (
          <Card className="border-border bg-muted/10">
            <CardContent className="p-4 grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="dept-filter" className="text-xs font-semibold text-muted-foreground">Department</Label>
                <select id="dept-filter" value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1">
                  {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="course-filter" className="text-xs font-semibold text-muted-foreground">Course Code</Label>
                <select id="course-filter" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1">
                  {courses.map(c => <option key={c} value={c}>{c === 'All' ? 'All Courses' : c}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sort-by" className="text-xs font-semibold text-muted-foreground">Sort By</Label>
                <select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1">
                  <option value="downloads">Most Downloaded</option>
                  <option value="rating">Highest Rated</option>
                  <option value="recent">Recently Updated</option>
                </select>
              </div>
            </CardContent>
          </Card>
        )}

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
        <div className="grid gap-4">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Archive Index</span>
            <span>{filteredResources.length} items found</span>
          </div>

          {filteredResources.length === 0 ? (
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
                const isBookmarked = bookmarks.includes(item.id)
                const hasVideo = Boolean(item.youtubeId)
                const hasPdf = Boolean(item.pdfUrl) && item.type !== 'Video'

                return (
                  <Card key={item.id} className="group hover:shadow-md transition-all border-border flex flex-col overflow-hidden">
                    
                    {/* Preview Thumbnail */}
                    {hasVideo ? (
                      /* Video Thumbnail with Play Button overlay */
                      <Link to={item.id.startsWith('doc-') ? `/viewer/${item.id.replace('doc-', '')}` : `/library/resource/${item.id}`} className="relative block h-40 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                        <img 
                          src={`https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg`}
                          alt={item.title}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity"
                          onError={(e) => {
                            // Hide broken image; the parent gradient background shows instead
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <PlayCircle size={28} className="text-white fill-white" />
                          </div>
                        </div>
                        <Badge className="absolute top-2 left-2 bg-red-600 text-white border-none text-[9px] font-bold uppercase">
                          Video
                        </Badge>
                      </Link>
                    ) : (
                      /* Document type visual preview */
                      (() => {
                        // Types that can be rendered from an actual PDF page
                        const isPdfRenderable = Boolean(item.pdfUrl) && (
                          item.format?.toLowerCase() === 'pdf' ||
                          ['pdf', 'paper', 'thesis', 'question bank', 'assignment', 'lab report'].includes(String(item.type).toLowerCase()) ||
                          ['PDF', 'Paper', 'Thesis', 'Question Bank', 'Assignment', 'Lab Report', 'Lecture Notes', 'Textbook', 'Lecture Slides', 'Lab Manual'].includes(type)
                        )

                        // Static fallback thumbnails by type
                        const thumbMap = {
                          'PDF':           '/thumbs/thumb_pdf.png',
                          'Paper':         '/thumbs/thumb_paper.png',
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
                          <Link
                            to={item.id.startsWith('doc-') ? `/viewer/${item.id.replace('doc-', '')}` : `/library/resource/${item.id}`}
                            className="relative block h-40 overflow-hidden group"
                          >
                            {isPdfRenderable ? (
                              /* ── Render actual first page of the PDF ── */
                              <PDFThumbnail
                                pdfUrl={item.pdfUrl}
                                fallbackSrc={fallbackSrc}
                                badgeColor={badgeColor}
                                badgeLabel={item.type}
                              />
                            ) : (
                              /* ── Static type-based thumbnail for PPT / Dataset ── */
                              <div className="relative w-full h-40 overflow-hidden bg-muted">
                                <img
                                  src={fallbackSrc}
                                  alt={`${item.type} preview`}
                                  className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all duration-200 flex items-center justify-center">
                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-white bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30">
                                    Click to View Details
                                  </span>
                                </div>
                                <span className={`absolute bottom-2 left-2 ${badgeColor} text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded`}>
                                  {item.type}
                                </span>
                              </div>
                            )}
                          </Link>
                        )
                      })()
                    )}

                    <CardHeader className="p-4 pb-1">
                      <div className="flex justify-between items-start gap-2">
                        <Badge className={`text-[10px] font-bold px-2 py-0.5 border uppercase ${getTypeBadgeStyles(type)}`}>
                          {type}
                        </Badge>
                        <Button size="icon" variant="ghost" className="w-7 h-7 hover:text-accent rounded-full -mt-0.5 -mr-1"
                          onClick={() => toggleBookmark(item.id)}>
                          <Bookmark size={14} className={isBookmarked ? 'fill-accent text-accent' : 'text-muted-foreground'} />
                        </Button>
                      </div>
                      <CardTitle className="text-sm font-bold leading-snug mt-2 line-clamp-2 group-hover:text-accent transition-colors">
                        {item.title}
                      </CardTitle>
                      <p className="text-[11px] text-muted-foreground">
                        {item.author || 'Anonymous'} · <span className="font-semibold text-accent-strong">{item.course || 'General'}</span>
                      </p>
                    </CardHeader>
                    
                    <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between gap-3">
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.summary || 'No summary description provided.'}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {(item.tags || []).slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-[9px] py-0 px-1.5 bg-muted/10 text-muted-foreground border-muted/35">
                            #{tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between border-t border-border/50 pt-2.5 mt-1 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-0.5 text-amber-500"><Star size={11} className="fill-amber-500" /> {item.rating || '5.0'}</span>
                          <span>·</span>
                          <span>{item.downloads || 0} DLs</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 gap-1 font-semibold text-muted-foreground hover:text-foreground"
                            onClick={() => copyCitation(item)}>
                            <Quote size={10} /> Cite
                          </Button>
                          <Button asChild variant="secondary" size="sm" className="h-7 text-[10px] px-2.5 font-bold">
                            {item.id.startsWith('doc-') ? (
                              <Link to={`/viewer/${item.id.replace('doc-', '')}`}>Open →</Link>
                            ) : (
                              <Link to={`/library/resource/${item.id}`}>Open →</Link>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="grid gap-6 self-start">
          <Card className="bg-gradient-to-br from-accent/10 via-transparent to-transparent border-accent/20">
            <CardContent className="p-5 grid gap-3">
              <h4 className="text-xs font-bold text-accent-strong uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={13} /> Share Knowledge
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Have verified lecture slides, lab manuals, or textbook links? Upload them to the department directory.
              </p>
              <Button onClick={() => setShowUploadModal(true)} size="sm" className="w-full text-xs gap-1 py-4 font-semibold">
                <Plus size={14} /> Upload Resource
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Bookmark size={13} className="text-accent" /> My Bookmarks ({bookmarks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 grid gap-2.5">
              {bookmarks.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">No bookmarked items yet.</p>
              ) : (
                resources.filter(r => bookmarks.includes(r.id)).map(r => (
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
                ))
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
      </div>

      {/* Upload Success Modal */}
      {showUploadSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border shadow-2xl">
            <CardContent className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <div className="grid gap-2">
                <h3 className="text-lg font-bold">Submitted Successfully!</h3>
                <p className="text-sm text-muted-foreground">
                  Your academic resource "<strong>{uploadSuccessTitle}</strong>" has been submitted for admin review.
                </p>
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Resource Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-xl border-border shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <CardHeader className="p-5 border-b border-border flex flex-row items-start justify-between bg-gradient-to-r from-muted/30 to-transparent">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CloudUpload size={18} className="text-accent" />
                  Add Academic Resource
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Share textbooks, lecture slides, or research papers with the department.</p>
              </div>
              <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full shrink-0" onClick={resetModal}>
                <X size={16} />
              </Button>
            </CardHeader>

            <form onSubmit={handleUploadSubmit}>
              <CardContent className="p-5 grid gap-4 max-h-[70vh] overflow-y-auto">

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
                    <select id="res-dept-select" value={newResource.department} onChange={e => setNewResource(p => ({ ...p, department: e.target.value }))}
                      className="h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1">
                      <option value="CSE">Computer Science & Engineering</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Physics">Physics</option>
                      <option value="Engineering">General Engineering</option>
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="res-type-select" className="text-xs font-semibold">Resource Type</Label>
                    <select id="res-type-select" value={newResource.type} 
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
                      }}
                      className="h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1">
                      <option value="PDF">PDF Document / E-Book</option>
                      <option value="PPT">Presentation Slides (PPT/PPTX)</option>
                      <option value="Question Bank">Question Bank</option>
                      <option value="Assignment">Assignment</option>
                      <option value="Lab Report">Lab Report</option>
                      <option value="Video">Video Content</option>
                      <option value="Link">External Online Resource</option>
                    </select>
                  </div>
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
                        /* Selected file display */
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-accent/30 bg-accent/5">
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                            <FileText size={18} className="text-accent" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">{selectedFile.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
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

                {/* Tags */}
                <div className="grid gap-1.5">
                  <Label htmlFor="res-tags-input" className="text-xs font-semibold">Tags <span className="font-normal text-muted-foreground">(comma-separated)</span></Label>
                  <Input id="res-tags-input" placeholder="e.g. dsa, textbook, core"
                    value={newResource.tags} onChange={e => setNewResource(p => ({ ...p, tags: e.target.value }))} />
                </div>

                {/* Summary */}
                <div className="grid gap-1.5">
                  <Label htmlFor="res-summary-input" className="text-xs font-semibold">Short Summary</Label>
                  <textarea id="res-summary-input" placeholder="Provide a brief description of this resource..." rows={2}
                    value={newResource.summary} onChange={e => setNewResource(p => ({ ...p, summary: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 resize-none" />
                </div>

                {/* Error message */}
                {uploadError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                )}

              </CardContent>

              {/* Footer */}
              <div className="flex gap-2 justify-end p-4 border-t border-border bg-muted/10">
                <Button type="button" variant="outline" size="sm" onClick={resetModal} disabled={isUploading}>Cancel</Button>
                <Button type="submit" size="sm" className="gap-1.5 min-w-[120px]" disabled={isUploading}>
                  {isUploading
                    ? <><Loader2 size={13} className="animate-spin" /> Uploading...</>
                    : <><CloudUpload size={13} /> Add Resource</>
                  }
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
