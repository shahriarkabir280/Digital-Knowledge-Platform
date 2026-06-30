import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '../app/use-auth.js'
import { RESOURCE_ITEMS } from '../modules/library/data.js'
import { uploadDocument } from '../services/api/documents.js'
import PDFThumbnail from '../components/library/PDFThumbnail.jsx'
import { 
  Search, 
  GraduationCap, 
  Bookmark, 
  Plus, 
  X, 
  Star, 
  Filter, 
  Quote, 
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
  Tag
} from 'lucide-react'

export default function RepositoryPage() {
  const { authState } = useAuth()
  
  // Explore resources from localStorage or static data
  const [exploreResources, setExploreResources] = useState(() => {
    const saved = localStorage.getItem('dkp_academic_resources')
    return saved ? JSON.parse(saved) : RESOURCE_ITEMS
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
  const [newResource, setNewResource] = useState({
    title: '', author: '', department: 'CSE', course: 'N/A', type: 'Research Paper', tags: '', summary: '', linkUrl: '', resourceCategory: 'research-paper',
  })
  const [uploadMode, setUploadMode] = useState('url') // 'url' | 'file'
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
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

  // Sync resources
  useEffect(() => {
    localStorage.setItem('dkp_academic_resources', JSON.stringify(exploreResources))
  }, [exploreResources])

  // Classify types for badges and tabs
  const getResearchType = (item) => {
    const type = String(item.type || '').toLowerCase()
    if (type === 'paper' || type === 'research paper') return 'Research Paper'
    if (type === 'thesis') return 'Thesis'
    if (type === 'dataset' || type === 'datasets') return 'Dataset'
    return 'Research Paper'
  }

  const getTypeBadgeStyles = (type) => {
    switch (type) {
      case 'Research Paper': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'Thesis': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
      case 'Dataset': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
      default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
    }
  }

  // Filtered lists
  const filteredExplore = useMemo(() => {
    return exploreResources.filter(item => {
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
  }, [exploreResources, searchQuery, selectedType, selectedDept, selectedCourse, sortBy])

  const departments = useMemo(() => {
    const deps = new Set(exploreResources.filter(r => ['Paper', 'Thesis', 'Dataset', 'Research Paper'].includes(r.type)).map(r => r.department).filter(Boolean))
    return ['All', ...Array.from(deps)]
  }, [exploreResources])

  const courses = useMemo(() => {
    const crs = new Set(exploreResources.filter(r => ['Paper', 'Thesis', 'Dataset', 'Research Paper'].includes(r.type)).map(r => r.course).filter(Boolean))
    return ['All', ...Array.from(crs)]
  }, [exploreResources])

  const toggleBookmark = (id) => {
    setExploreBookmarks(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id])
  }

  const copyCitation = (resource) => {
    const year = resource.year || new Date(resource.updatedAt || Date.now()).getFullYear()
    const citation = `${resource.author || 'Anonymous'}. (${year}). ${resource.title}. Department of ${resource.department || 'CSE'}, Research Repository.`
    navigator.clipboard.writeText(citation)
    alert('APA citation copied to clipboard!')
  }

  // Upload handlers
  const resetModal = useCallback(() => {
    setShowUploadModal(false)
    setNewResource({ title: '', author: '', department: 'CSE', course: 'N/A', type: 'Research Paper', tags: '', summary: '', linkUrl: '', resourceCategory: 'research-paper' })
    setUploadMode('url')
    setSelectedFile(null)
    setUploadProgress(0)
    setIsUploading(false)
    setUploadError('')
    setIsDragOver(false)
  }, [])

  const handleFileSelect = (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    const typeMap = { pdf: 'Research Paper', zip: 'Dataset', csv: 'Dataset', tar: 'Dataset', gz: 'Dataset' }
    const inferredType = typeMap[ext] || 'Research Paper'
    
    let inferredCategory = 'research-paper'
    if (inferredType === 'Dataset') inferredCategory = 'dataset'

    setSelectedFile(file)
    setUploadError('')
    setNewResource(p => ({
      ...p,
      type: inferredType,
      resourceCategory: inferredCategory,
      title: p.title || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
    }))
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
    if (!newResource.title.trim() || !newResource.author.trim()) {
      setUploadError('Please fill in Title and Author(s).')
      return
    }
    if (uploadMode === 'file' && !selectedFile) {
      setUploadError('Please select a file to upload.')
      return
    }

    let resolvedPdfUrl = uploadMode === 'url' ? newResource.linkUrl.trim() : null

    if (uploadMode === 'file' && selectedFile) {
      if (!authState?.token) {
        setUploadError('You must be logged in to upload research documents.')
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
            resourceCategory: newResource.resourceCategory 
          },
          ({ percent }) => setUploadProgress(percent),
          authState.token
        )
        const docId = result?.data?.document?.id
        if (docId) {
          resolvedPdfUrl = `/api/repository/files/${docId}/content`
        }
      } catch (err) {
        setUploadError(err.message || 'Upload failed. Please try again.')
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    }

    const created = {
      id: `res-${Date.now()}`,
      title: newResource.title.trim(),
      author: newResource.author.trim(),
      department: newResource.department,
      course: newResource.course.trim().toUpperCase(),
      type: newResource.type,
      year: new Date().getFullYear(),
      tags: newResource.tags.split(',').map(t => t.trim()).filter(Boolean),
      rating: 5.0, reviews: 0, downloads: 0, access: 'public',
      summary: newResource.summary.trim(),
      pdfUrl: ['Research Paper', 'Thesis'].includes(newResource.type) ? resolvedPdfUrl : null,
      githubUrl: newResource.type === 'Dataset' ? resolvedPdfUrl : null,
      updatedAt: new Date().toISOString()
    }

    setExploreResources(prev => [created, ...prev])
    resetModal()
  }

  const addTag = (tag) => {
    setNewResource(p => {
      const currentTags = p.tags ? p.tags.split(',').map(t => t.trim()) : []
      if (currentTags.includes(tag)) return p
      const nextTags = [...currentTags, tag].join(', ')
      return { ...p, tags: nextTags }
    })
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-2">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-accent/20 p-6 md:p-8 text-white shadow-lg border border-slate-850">
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
            <Button className="text-xs font-semibold bg-accent hover:bg-accent/90 text-white border-none" onClick={() => setShowUploadModal(true)}>
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
                className="pl-9 text-xs h-9 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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
        {showAdvancedFilters && (
          <Card className="border-border bg-muted/10">
            <CardContent className="p-4 grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="repo-dept" className="text-xs font-semibold text-muted-foreground">Department</Label>
                <select id="repo-dept" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1">
                  {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="repo-course" className="text-xs font-semibold text-muted-foreground">Course Code</Label>
                <select id="repo-course" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1">
                  {courses.map(c => <option key={c} value={c}>{c === 'All' ? 'All Courses' : c}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="repo-sort" className="text-xs font-semibold text-muted-foreground">Sort By</Label>
                <select id="repo-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1">
                  <option value="recent">Recently Added</option>
                  <option value="downloads">Most Downloaded</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Grid View */}
      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        
        {/* Left Column: Research Cards */}
        <div className="grid gap-4">
          <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Publications Index</span>
            <span>{filteredExplore.length} items found</span>
          </div>

          {filteredExplore.length === 0 ? (
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
                const isBookmarked = exploreBookmarks.includes(item.id)
                const isPdfRenderable = ['Research Paper', 'Thesis'].includes(type) && Boolean(item.pdfUrl)
                const fallbackSrc = type === 'Dataset' ? '/thumbs/thumb_dataset.png' : '/thumbs/thumb_paper.png'
                const badgeColor = type === 'Dataset' ? 'bg-purple-600' : type === 'Thesis' ? 'bg-indigo-600' : 'bg-blue-600'

                return (
                  <Card key={item.id} className="group hover:shadow-md transition-all border-border flex flex-col overflow-hidden">
                    
                    {/* Thumbnail section */}
                    <Link to={`/library/resource/${item.id}`} className="relative block h-40 overflow-hidden group">
                      {isPdfRenderable ? (
                        <PDFThumbnail
                          pdfUrl={item.pdfUrl}
                          fallbackSrc={fallbackSrc}
                          badgeColor={badgeColor}
                          badgeLabel={type}
                        />
                      ) : (
                        <div className="relative w-full h-40 overflow-hidden bg-muted">
                          <img
                            src={fallbackSrc}
                            alt={item.title}
                            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all duration-200 flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-white bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30">
                              Click to View Details
                            </span>
                          </div>
                          <span className={`absolute bottom-2 left-2 ${badgeColor} text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded`}>
                            {type}
                          </span>
                        </div>
                      )}
                    </Link>

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
                        {item.author || 'Anonymous'} · <span className="font-semibold text-accent-strong">{item.department || 'CSE'}</span>
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
                            <Link to={`/library/resource/${item.id}`}>Open →</Link>
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

        {/* Right Column: Sidebar */}
        <div className="grid gap-6 self-start">
          <Card className="bg-gradient-to-br from-accent/10 via-transparent to-transparent border-accent/20">
            <CardContent className="p-5 grid gap-3">
              <h4 className="text-xs font-bold text-accent-strong uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={13} /> Publish Research
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Submit your preprints, publications, or dataset archives to be indexed in the CSEDU Institutional Repository.
              </p>
              <Button size="sm" className="w-full text-xs gap-1 py-4 font-semibold bg-accent hover:bg-accent/90 text-white border-none" onClick={() => setShowUploadModal(true)}>
                <Plus size={14} /> Submit Research
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Bookmark size={13} className="text-accent" /> Bookmarks ({exploreBookmarks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 grid gap-2.5">
              {exploreBookmarks.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">No bookmarked items yet.</p>
              ) : (
                exploreResources.filter(r => exploreBookmarks.includes(r.id)).map(r => (
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
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Research Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-xl border-border shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <CardHeader className="p-5 border-b border-border flex flex-row items-start justify-between bg-gradient-to-r from-muted/30 to-transparent">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CloudUpload size={18} className="text-accent" />
                  Submit Research Publication
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Publish research papers, theses, or datasets to the institutional repository.</p>
              </div>
              <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full shrink-0" onClick={resetModal}>
                <X size={16} />
              </Button>
            </CardHeader>

            <form onSubmit={handleUploadSubmit}>
              <CardContent className="p-5 grid gap-4 max-h-[70vh] overflow-y-auto">

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
                    <select id="repo-dept-select" value={newResource.department} onChange={e => setNewResource(p => ({ ...p, department: e.target.value }))}
                      className="h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1">
                      <option value="CSE">Computer Science & Engineering</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Physics">Physics</option>
                      <option value="Engineering">General Engineering</option>
                    </select>
                  </div>
                  {/* Type */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="repo-type-select" className="text-xs font-semibold">Research Type</Label>
                    <select id="repo-type-select" value={newResource.type} 
                      onChange={e => {
                        const val = e.target.value;
                        let category = 'research-paper';
                        if (val === 'Thesis') category = 'thesis';
                        if (val === 'Dataset') category = 'dataset';
                        setNewResource(p => ({ ...p, type: val, resourceCategory: category }));
                      }}
                      className="h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1">
                      <option value="Research Paper">Research Paper</option>
                      <option value="Thesis">Thesis / Dissertation</option>
                      <option value="Dataset">Dataset Archive</option>
                    </select>
                  </div>
                </div>

                {/* Upload Category / Directory */}
                <div className="grid gap-1.5">
                  <Label htmlFor="repo-category-select" className="text-xs font-semibold text-accent-strong">Upload Directory / Storage Folder *</Label>
                  <select id="repo-category-select" value={newResource.resourceCategory} onChange={e => setNewResource(p => ({ ...p, resourceCategory: e.target.value }))}
                    className="h-9 rounded-md border border-accent/40 bg-accent/5 px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1">
                    <option value="research-paper">Research Papers (research-paper/)</option>
                    <option value="thesis">Theses (thesis/)</option>
                    <option value="dataset">Datasets (dataset/)</option>
                  </select>
                  <p className="text-[9px] text-muted-foreground font-medium">Selects the folder path on the server where the file will be organized.</p>
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
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-accent/30 bg-accent/5">
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                            {newResource.type === 'Dataset' ? <Database size={18} className="text-accent" /> : <FileText size={18} className="text-accent" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">{selectedFile.name}</p>
                            <p className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
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

                {/* Tags input with domain suggestions */}
                <div className="grid gap-1.5">
                  <Label htmlFor="repo-tags-input" className="text-xs font-semibold flex items-center gap-1"><Tag size={12} /> Tags (comma-separated)</Label>
                  <Input id="repo-tags-input" placeholder="e.g. machine-learning, cnn, satellite-imagery"
                    value={newResource.tags} onChange={e => setNewResource(p => ({ ...p, tags: e.target.value }))} />
                  
                  <div className="flex flex-wrap gap-1 mt-1">
                    {domainTags.map(tag => (
                      <button key={tag} type="button" onClick={() => addTag(tag.toLowerCase().replace(/\s+/g, '-'))}
                        className="text-[9px] font-medium px-2 py-0.5 rounded-full border border-border bg-muted/30 hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all">
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Abstract */}
                <div className="grid gap-1.5">
                  <Label htmlFor="repo-summary-input" className="text-xs font-semibold">Abstract / Summary</Label>
                  <textarea id="repo-summary-input" placeholder="Provide a brief abstract or summary of the research..." rows={3}
                    value={newResource.summary} onChange={e => setNewResource(p => ({ ...p, summary: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 resize-none" />
                </div>

                {/* Error */}
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
                  {isUploading ? <><Loader2 size={13} className="animate-spin" /> Uploading...</> : <><CloudUpload size={13} /> Submit Research</>}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
