import { useMemo, useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Bookmark,
  Download,
  FileText,
  Presentation,
  Database,
  GraduationCap,
  BookOpen,
  PlayCircle,
  ExternalLink,
  Code2,
  Calendar,
  User,
  Upload,
  HelpCircle,
  ClipboardCheck,
  FilePlus,
  Loader2,
  BookCheck,
  Clock,
  ScanLine,
  QrCode
} from 'lucide-react'
import { useAuth } from '../app/use-auth.js'
import CheckoutDialog from '../components/library/CheckoutDialog.jsx'
import HoldRequestButton from '../components/library/HoldRequestButton.jsx'
import { getCatalogItem } from '../services/api/library.js'
import { toast } from 'sonner'

function StarRating({ rating, onRate, readonly = false }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onRate?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`text-xl leading-none transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <span className={(hovered || rating) >= star ? 'text-amber-400' : 'text-muted/30'}>★</span>
        </button>
      ))}
    </div>
  )
}

export default function LibraryResourceDetailsPage() {
  const { resourceId } = useParams()
  const { authState } = useAuth()
  const [bookmarked, setBookmarked] = useState(false)
  const [activeTab, setActiveTab] = useState('preview')
  const [userComment, setUserComment] = useState('')
  const [userRating, setUserRating] = useState(5)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false)
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [barcodeFormat, setBarcodeFormat] = useState('barcode') // 'barcode' | 'qr'

  // Numeric catalog item ID extracted from resourceId (if it is a catalog item)
  const numericId = resourceId?.startsWith('catalog-')
    ? parseInt(resourceId.replace('catalog-', ''), 10)
    : parseInt(resourceId, 10)
  const isCatalogItem = !isNaN(numericId)

  const isStaff = ['STAFF', 'LAB_MANAGER', 'ADMIN'].includes(authState?.role)

  // Load bookmarks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dkp_bookmarked_resources')
    if (saved) {
      const ids = JSON.parse(saved)
      setBookmarked(ids.includes(resourceId))
    }
  }, [resourceId])

  const [resource, setResource] = useState(null)

  // Resolve the resource: physical catalog items are fetched from the catalog
  // API; digital documents are looked up in the published-docs localStorage
  // cache (populated by LibraryPage's query — see /documents/:id TODO there).
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function loadResource() {
      if (isCatalogItem) {
        try {
          const item = await getCatalogItem(numericId)
          if (!cancelled) {
            setResource({
              ...item,
              title: item.title,
              author: item.authors || 'Unknown',
              type: item.category || 'Book',
              year: item.publication_year,
              summary: item.description,
              updatedAt: item.updated_at,
            })
          }
        } catch {
          if (!cancelled) setResource(null)
        } finally {
          if (!cancelled) setLoading(false)
        }
        return
      }

      try {
        const stored = localStorage.getItem('dkp_published_docs_cache')
        const docs = stored ? JSON.parse(stored) : []
        const found = docs.find(item => item.id === resourceId || item.id === `doc-${resourceId}`)
        if (!cancelled) setResource(found || null)
      } catch {
        if (!cancelled) setResource(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadResource()
    return () => { cancelled = true }
  }, [resourceId, isCatalogItem, numericId])

  // These must be computed unconditionally (before any early return) since
  // they're hook dependencies below — Rules of Hooks forbids skipping hooks
  // on some renders (e.g. while loading) and calling them on others.
  const hasPdf = Boolean(resource?.pdfUrl) && !['Video', 'PPT'].includes(resource?.type)
  const hasPpt = resource?.type === 'PPT' && Boolean(resource?.pptUrl)
  const hasVideo = Boolean(resource?.youtubeId)
  const hasReadme = Boolean(resource?.readme)

  // Determine available tabs
  const tabs = useMemo(() => {
    const t = []
    if (hasPdf || hasVideo || hasPpt) t.push({ id: 'preview', label: hasVideo ? '▶ Watch / Preview' : hasPpt ? '📊 View Slides' : '👁 View Document' })
    if (hasReadme) t.push({ id: 'readme', label: '📄 README' })
    t.push({ id: 'reviews', label: `★ Reviews (${reviews.length})` })
    return t
  }, [hasPdf, hasVideo, hasPpt, hasReadme, reviews.length])

  useEffect(() => {
    if (hasPdf || hasVideo || hasPpt) setActiveTab('preview')
    else if (hasReadme) setActiveTab('readme')
    else setActiveTab('reviews')
  }, [resourceId, hasPdf, hasVideo, hasPpt, hasReadme])

  // If resource not found
  if (loading) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-2 min-h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 size={24} className="animate-spin" />
          <p className="text-xs font-semibold">Loading resource...</p>
        </div>
      </div>
    )
  }

  if (!resource) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-2 min-h-[60vh] place-items-center">
        <div className="text-center grid gap-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto">
            <FileText size={24} className="text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold">Resource Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The resource you're looking for could not be found. It may have been removed or the link might be incorrect.
          </p>
          <Link to="/library">
            <Button variant="outline" className="gap-1.5 text-sm">
              <ArrowLeft size={16} /> Back to Academic Resources
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const hasGithub = Boolean(resource.githubUrl)

  // Detect if the pdfUrl is a backend auth-gated API URL (not publicly accessible)
  const isLocalApiUrl = resource.pdfUrl
    ? /^\/api\/|\/api\/|localhost|127\.0\.0\.1/.test(resource.pdfUrl)
    : false

  // Google Docs Viewer — only works for public URLs (not auth-gated)
  const googleDocsViewerUrl = resource.pdfUrl && !isLocalApiUrl
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(resource.pdfUrl)}&embedded=true`
    : null

  // Microsoft Office Online viewer URL for PPT/PPTX files
  const officeViewerUrl = resource.pptUrl && !isLocalApiUrl
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(resource.pptUrl)}`
    : null

  const toggleBookmark = () => {
    const saved = localStorage.getItem('dkp_bookmarked_resources')
    let ids = saved ? JSON.parse(saved) : []
    if (bookmarked) {
      ids = ids.filter(id => id !== resource.id)
    } else {
      ids = [...ids, resource.id]
    }
    localStorage.setItem('dkp_bookmarked_resources', JSON.stringify(ids))
    setBookmarked(!bookmarked)
  }

  const barcodeImageUrl = isCatalogItem
    ? `${import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api')}/library/catalog/${numericId}/barcode?format=${barcodeFormat}&_token=${encodeURIComponent(authState?.token || '')}`
    : null

  const submitReview = () => {
    if (!userComment.trim()) {
      alert('Please write a review before submitting.')
      return
    }
    const newReview = {
      id: `rev-${Date.now()}`,
      user: 'You',
      rating: userRating,
      comment: userComment.trim(),
      date: new Date().toLocaleDateString()
    }
    setReviews(prev => [newReview, ...prev])
    setUserComment('')
    setUserRating(5)
  }

  const getTypeIcon = (type) => {
    switch (String(type).toLowerCase()) {
      case 'pdf': return <FileText size={16} className="text-red-500" />
      case 'ppt': return <Presentation size={16} className="text-amber-500" />
      case 'dataset': return <Database size={16} className="text-purple-500" />
      case 'paper': return <GraduationCap size={16} className="text-blue-500" />
      case 'thesis': return <BookOpen size={16} className="text-indigo-500" />
      case 'video': return <PlayCircle size={16} className="text-red-500" />
      case 'question bank':
      case 'qbank':
        return <HelpCircle size={16} className="text-sky-500" />
      case 'assignment':
        return <ClipboardCheck size={16} className="text-orange-500" />
      case 'lab report':
      case 'labreport':
        return <FilePlus size={16} className="text-teal-500" />
      default: return <BookOpen size={16} className="text-muted-foreground" />
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-2">
      
      {/* Back Nav */}
      <div>
        <Link to="/library">
          <Button variant="ghost" className="gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Back to Academic Resources
          </Button>
        </Link>
      </div>

      {/* Resource Header */}
      <div className="grid gap-4 p-5 rounded-xl border border-border bg-gradient-to-br from-muted/20 via-transparent to-transparent">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="grid gap-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                {getTypeIcon(resource.type)}
                <span className="uppercase">{resource.type}</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold uppercase">{resource.access || 'public'}</Badge>
              {resource.version && (
                <Badge variant="secondary" className="text-[10px]">v{resource.version}</Badge>
              )}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground leading-snug">
              {resource.title}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User size={12} /> {resource.author || 'Anonymous'}</span>
              <span className="flex items-center gap-1"><BookOpen size={12} /> {resource.course}</span>
              <span className="flex items-center gap-1"><GraduationCap size={12} /> {resource.department}</span>
              <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(resource.updatedAt || Date.now()).toLocaleDateString()}</span>
              {resource.uploaderName && (
                <span className="flex items-center gap-1 text-muted-foreground/70">
                  <Upload size={12} /> Posted by <span className="font-medium text-foreground/70">{resource.uploaderName}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                <StarRating rating={Math.round(resource.rating || 5)} readonly />
                <span className="text-foreground">{resource.rating || '5.0'}</span>
                <span className="text-muted-foreground font-normal">({resource.reviews || 0} reviews)</span>
              </div>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{resource.downloads || 0} downloads</span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" className="gap-1.5 text-xs" onClick={toggleBookmark}>
              <Bookmark size={14} className={bookmarked ? 'fill-accent text-accent' : ''} />
              {bookmarked ? 'Saved' : 'Bookmark'}
            </Button>
            {(hasPdf || hasGithub) && (
              <Button asChild className="gap-1.5 text-xs">
                <a href={resource.pdfUrl || resource.githubUrl} target="_blank" rel="noreferrer">
                  <Download size={14} /> Download
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
            {resource.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] py-0.5 px-2">#{tag}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        
        {/* Left: Tabbed Viewer */}
        <div className="grid gap-4">
          
          {/* Tab Bar */}
          <div className="flex gap-1 border-b border-border">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Preview / Viewer Panel */}
          {activeTab === 'preview' && (
            <Card className="border-border overflow-hidden">
              <CardContent className="p-0">
                
                {/* ── Video Player ── */}
                {hasVideo && (
                  <div className="grid">
                    <div className="w-full aspect-video bg-black">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${resource.youtubeId}?rel=0&modestbranding=1`}
                        title={resource.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                    {resource.summary && (
                      <div className="p-5 border-t border-border">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">About this Video</h4>
                        <p className="text-sm text-foreground leading-relaxed">{resource.summary}</p>
                        {hasGithub && (
                          <Button asChild variant="outline" size="sm" className="mt-4 text-xs gap-1">
                            <a href={resource.githubUrl} target="_blank" rel="noreferrer">
                              <ExternalLink size={12} /> View Source on GitHub
                            </a>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── PPT Viewer — Microsoft Office Online iframe ── */}
                {hasPpt && !hasVideo && (
                  <div className="grid">
                    {/* Header bar */}
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-muted/20">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <Presentation size={14} className="text-amber-500" />
                        <span>PowerPoint Presentation — Microsoft Office Online Viewer</span>
                      </div>
                      <Button asChild size="sm" variant="outline" className="text-xs gap-1 h-7">
                        <a href={resource.pptUrl} download target="_blank" rel="noreferrer">
                          <Download size={12} /> Download .PPT
                        </a>
                      </Button>
                    </div>
                    {/* Office Online embed */}
                    <div className="relative w-full bg-muted/10" style={{ height: '65vh' }}>
                      <iframe
                        src={officeViewerUrl}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        title={resource.title}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                    <div className="p-3 border-t border-border bg-muted/10 flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">
                        Powered by Microsoft Office Online · For best experience, download the file and open locally.
                      </p>
                      <Button asChild size="sm" variant="ghost" className="text-[10px] gap-1 h-7">
                        <a href={officeViewerUrl} target="_blank" rel="noreferrer">
                          <ExternalLink size={11} /> Open in New Tab
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── PDF Viewer ── */}
                {hasPdf && !hasVideo && !hasPpt && (
                  <div>
                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-border bg-muted/20">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <FileText size={14} className="text-red-500" />
                        <span>
                          {isLocalApiUrl ? 'Uploaded Document — Server File' : 'PDF Document — Google Docs Viewer'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button asChild size="sm" variant="outline" className="text-xs gap-1 h-7">
                          <a href={resource.pdfUrl} target="_blank" rel="noreferrer">
                            <ExternalLink size={11} /> Open in Browser
                          </a>
                        </Button>
                        <Button asChild size="sm" variant="ghost" className="text-xs gap-1 h-7">
                          <a href={resource.pdfUrl} download>
                            <Download size={11} /> Download
                          </a>
                        </Button>
                      </div>
                    </div>

                    {isLocalApiUrl ? (
                      /* ── Auth-gated backend file: show download panel ── */
                      <div className="flex flex-col items-center justify-center gap-6 py-16 px-8 bg-muted/5">
                        <div className="w-20 h-20 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                          <FileText size={36} className="text-red-400" />
                        </div>
                        <div className="text-center grid gap-1.5 max-w-sm">
                          <h3 className="font-bold text-base text-foreground">{resource.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            This document is stored on the server. Use the buttons above to open or download it.
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            In-browser preview requires the file to be publicly hosted. Locally uploaded files are served directly.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <Button asChild size="sm" className="gap-1.5">
                            <a href={resource.pdfUrl} target="_blank" rel="noreferrer">
                              <ExternalLink size={14} /> Open File
                            </a>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="gap-1.5">
                            <a href={resource.pdfUrl} download>
                              <Download size={14} /> Download
                            </a>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* ── Public URL: use Google Docs Viewer ── */
                      <>
                        <div className="relative w-full bg-muted/10" style={{ height: '70vh' }}>
                          <iframe
                            src={googleDocsViewerUrl}
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            title={resource.title}
                            className="w-full h-full"
                            allowFullScreen
                          />
                        </div>
                        <div className="p-3 border-t border-border bg-muted/10 flex items-center justify-between">
                          <p className="text-[10px] text-muted-foreground">
                            Powered by Google Docs Viewer · If the preview fails, use \"Open in Browser\" above.
                          </p>
                          <Button asChild size="sm" variant="ghost" className="text-[10px] gap-1 h-7">
                            <a href={googleDocsViewerUrl} target="_blank" rel="noreferrer">
                              <ExternalLink size={11} /> Full-screen view
                            </a>
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}


                {/* ── No Preview available ── */}
                {!hasPdf && !hasVideo && !hasPpt && (
                  <div className="flex flex-col items-center gap-5 py-20 text-center text-muted-foreground px-8">
                    <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center">
                      {getTypeIcon(resource.type)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">In-browser preview not available</p>
                      <p className="text-xs mt-1 max-w-xs">
                        {resource.type === 'Dataset'
                          ? 'Datasets cannot be previewed inline. Download the archive or access it via the repository link.'
                          : 'This resource type does not support inline viewing. Use the download or access buttons below.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {hasGithub && (
                        <Button asChild size="sm" className="text-xs gap-1">
                          <a href={resource.githubUrl} target="_blank" rel="noreferrer">
                            <ExternalLink size={12} /> Open Repository
                          </a>
                        </Button>
                      )}
                      {resource.pdfUrl && (
                        <Button asChild size="sm" variant="outline" className="text-xs gap-1">
                          <a href={resource.pdfUrl} target="_blank" rel="noreferrer">
                            <ExternalLink size={12} /> Open in Browser
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          )}


          {/* README Tab */}
          {activeTab === 'readme' && hasReadme && (
            <Card className="border-border overflow-hidden">
              <CardHeader className="p-4 pb-2 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 size={14} className="text-accent" />
                  <span className="text-xs font-bold">README.md</span>
                </div>
                <Button variant="ghost" size="sm" className="text-xs gap-1"
                  onClick={() => { navigator.clipboard.writeText(resource.readme); alert('README copied!') }}>
                  Copy Raw
                </Button>
              </CardHeader>
              <CardContent className="p-6 overflow-auto max-h-[70vh]">
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                  {resource.readme.split('\n').map((line, idx) => {
                    if (line.startsWith('# ')) return <h1 key={idx} className="text-xl font-bold mt-5 mb-2 first:mt-0">{line.slice(2)}</h1>
                    if (line.startsWith('## ')) return <h2 key={idx} className="text-base font-bold mt-4 mb-1.5">{line.slice(3)}</h2>
                    if (line.startsWith('### ')) return <h3 key={idx} className="text-sm font-bold mt-3 mb-1">{line.slice(4)}</h3>
                    if (line.startsWith('- ')) return <li key={idx} className="ml-5 my-0.5 text-xs text-foreground/85">{line.slice(2)}</li>
                    if (line.startsWith('```')) return null
                    if (line.trim() === '') return <br key={idx} />
                    if (line.trim().startsWith('`') && line.trim().endsWith('`')) {
                      return <code key={idx} className="bg-muted/50 px-1.5 py-0.5 rounded text-xs font-mono text-accent">{line.trim().slice(1, -1)}</code>
                    }
                    return <p key={idx} className="text-xs text-foreground/80 mb-1">{line}</p>
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <Card className="border-border">
              <CardContent className="p-5 grid gap-6">
                
                {/* Rating Summary */}
                <div className="flex items-center gap-6 p-4 bg-muted/20 rounded-xl border border-border/60">
                  <div className="text-center shrink-0">
                    <p className="text-4xl font-black text-foreground">{resource.rating || '5.0'}</p>
                    <StarRating rating={Math.round(resource.rating || 5)} readonly />
                    <p className="text-[10px] text-muted-foreground mt-1">{resource.reviews || 0} reviews</p>
                  </div>
                  <div className="flex-1 grid gap-1.5">
                    {[5, 4, 3, 2, 1].map(star => (
                      <div key={star} className="flex items-center gap-2 text-[10px]">
                        <span className="text-muted-foreground w-3">{star}</span>
                        <span className="text-amber-400">★</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: star === 5 ? '70%' : star === 4 ? '20%' : '10%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Write Review */}
                <div className="grid gap-3 border-t border-border/60 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Write a Review</h4>
                  <div className="grid gap-1">
                    <Label className="text-xs font-semibold">Your Rating</Label>
                    <StarRating rating={userRating} onRate={setUserRating} />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="review-comment" className="text-xs font-semibold">Your Review</Label>
                    <textarea
                      id="review-comment"
                      value={userComment}
                      onChange={e => setUserComment(e.target.value)}
                      placeholder="Was this resource helpful? What could be improved?"
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <Button size="sm" className="w-fit text-xs" onClick={submitReview}>
                    Submit Review
                  </Button>
                </div>

                {/* Reviews List */}
                <div className="grid gap-4 border-t border-border/60 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Community Reviews ({reviews.length})
                  </h4>
                  {reviews.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No reviews yet. Be the first to review!</p>
                  )}
                  {reviews.map(rev => (
                    <div key={rev.id} className="flex gap-3 p-3.5 rounded-lg bg-muted/15 border border-border/50">
                      <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {rev.user.charAt(0).toUpperCase()}
                      </div>
                      <div className="grid gap-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{rev.user}</span>
                          <StarRating rating={rev.rating} readonly />
                          <span className="text-[10px] text-muted-foreground">{rev.date}</span>
                        </div>
                        <p className="text-xs text-foreground/80 leading-relaxed">{rev.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>

              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Metadata + Quick Actions */}
        <div className="grid gap-5 self-start">
          
          {/* Summary */}
          {resource.summary && (
            <Card className="border-border">
              <CardContent className="p-4 grid gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">About</h4>
                <p className="text-xs text-foreground leading-relaxed">{resource.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card className="border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resource Metadata</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 grid gap-2.5">
              {[
                { label: 'Department', value: resource.department },
                { label: 'Course', value: resource.course },
                { label: 'Year', value: resource.year || new Date(resource.updatedAt || Date.now()).getFullYear() },
                { label: 'File Type', value: resource.type },
                { label: 'Access', value: resource.access || 'Public' },
                { label: 'Version', value: resource.version ? `v${resource.version}` : '1.0' },
                { label: 'Updated', value: new Date(resource.updatedAt || Date.now()).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-baseline gap-2 text-xs">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className="font-semibold text-foreground text-right">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 grid gap-2">
              {(hasPdf || resource.githubUrl) && (
                <Button asChild variant="default" size="sm" className="w-full justify-start gap-2 text-xs">
                  <a href={resource.pdfUrl || resource.githubUrl || '#'} target="_blank" rel="noreferrer">
                    <Download size={13} /> Download / Open Asset
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs" onClick={toggleBookmark}>
                <Bookmark size={13} className={bookmarked ? 'fill-accent text-accent' : ''} />
                {bookmarked ? 'Remove from Bookmarks' : 'Add to Bookmarks'}
              </Button>

              {/* Hold request — show when logged in and item is catalog item */}
              {authState?.token && isCatalogItem && (
                <div className="w-full">
                  <HoldRequestButton catalogItemId={numericId} />
                </div>
              )}

              {/* Checkout — staff only */}
              {isStaff && isCatalogItem && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  onClick={() => setShowCheckoutDialog(true)}
                >
                  <BookCheck size={13} />
                  Checkout to Member
                </Button>
              )}

              {/* Barcode / QR — staff only */}
              {isStaff && isCatalogItem && (
                <div className="grid gap-1.5 mt-1 pt-2 border-t border-border/60">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Item Barcode</p>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant={barcodeFormat === 'barcode' ? 'default' : 'outline'}
                      className="flex-1 h-7 text-[11px] gap-1"
                      onClick={() => { setBarcodeFormat('barcode'); setShowBarcodeModal(true) }}
                    >
                      <ScanLine size={11} /> Barcode
                    </Button>
                    <Button
                      size="sm"
                      variant={barcodeFormat === 'qr' ? 'default' : 'outline'}
                      className="flex-1 h-7 text-[11px] gap-1"
                      onClick={() => { setBarcodeFormat('qr'); setShowBarcodeModal(true) }}
                    >
                      <QrCode size={11} /> QR Code
                    </Button>
                  </div>
                </div>
              )}

              {resource.githubUrl && (
                <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
                  <a href={resource.githubUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={13} /> View on GitHub
                  </a>
                </Button>
              )}
              <Link to="/library" className="w-full mt-1">
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground">
                  <ArrowLeft size={13} /> Back to Resources
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Barcode / QR Modal */}
          {showBarcodeModal && barcodeImageUrl && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowBarcodeModal(false)}
            >
              <div
                className="bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full mx-4 grid gap-4"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    {barcodeFormat === 'qr' ? <QrCode size={15} className="text-accent" /> : <ScanLine size={15} className="text-accent" />}
                    {barcodeFormat === 'qr' ? 'QR Code' : 'Barcode'} — {resource.title?.slice(0, 30)}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowBarcodeModal(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex justify-center bg-white rounded-xl p-4 border border-border">
                  <img
                    src={barcodeImageUrl}
                    alt={`${barcodeFormat} for ${resource.title}`}
                    className="max-w-full"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    size="sm"
                    variant={barcodeFormat === 'barcode' ? 'default' : 'outline'}
                    className="h-7 text-xs gap-1"
                    onClick={() => setBarcodeFormat('barcode')}
                  >
                    <ScanLine size={11} /> Barcode
                  </Button>
                  <Button
                    size="sm"
                    variant={barcodeFormat === 'qr' ? 'default' : 'outline'}
                    className="h-7 text-xs gap-1"
                    onClick={() => setBarcodeFormat('qr')}
                  >
                    <QrCode size={11} /> QR Code
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                  >
                    <a href={barcodeImageUrl} download={`barcode-${numericId}.png`}>
                      <Download size={11} /> Save PNG
                    </a>
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  Print this to attach to the physical item's shelf label or spine.
                </p>
              </div>
            </div>
          )}

          {/* Checkout Dialog */}
          {showCheckoutDialog && isCatalogItem && (
            <CheckoutDialog
              open={showCheckoutDialog}
              onClose={() => setShowCheckoutDialog(false)}
              catalogItem={{ ...resource, id: numericId }}
              onSuccess={() => setShowCheckoutDialog(false)}
            />
          )}

          {/* Related Resources section removed — will be fetched from backend in future */}
          <Card className="border-border bg-muted/10">
            <CardContent className="p-4 text-center">
              <p className="text-[11px] text-muted-foreground italic">Related resources will be shown when available.</p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
