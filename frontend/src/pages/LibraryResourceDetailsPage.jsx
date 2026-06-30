import { useMemo, useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { RESOURCE_ITEMS, REVIEW_FEED } from '../modules/library/data.js'
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
  Quote,
  PlayCircle,
  ExternalLink,
  Code2,
  Calendar,
  User,
  HelpCircle,
  ClipboardCheck,
  FilePlus
} from 'lucide-react'

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
  const [bookmarked, setBookmarked] = useState(false)
  const [activeTab, setActiveTab] = useState('preview')
  const [userComment, setUserComment] = useState('')
  const [userRating, setUserRating] = useState(5)
  const [reviews, setReviews] = useState(REVIEW_FEED)

  // Load bookmarks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dkp_bookmarked_resources')
    if (saved) {
      const ids = JSON.parse(saved)
      setBookmarked(ids.includes(resourceId))
    }
  }, [resourceId])

  const resource = useMemo(() => {
    // Check localStorage first (user-uploaded resources live there)
    try {
      const saved = localStorage.getItem('dkp_academic_resources')
      const all = saved ? JSON.parse(saved) : RESOURCE_ITEMS
      return all.find(item => item.id === resourceId) || RESOURCE_ITEMS.find(item => item.id === resourceId) || RESOURCE_ITEMS[0]
    } catch {
      return RESOURCE_ITEMS.find(item => item.id === resourceId) || RESOURCE_ITEMS[0]
    }
  }, [resourceId])

  const hasPdf = Boolean(resource.pdfUrl) && !['Video', 'PPT'].includes(resource.type)
  const hasPpt = resource.type === 'PPT' && Boolean(resource.pptUrl)
  const hasVideo = Boolean(resource.youtubeId)
  const hasReadme = Boolean(resource.readme)
  const hasGithub = Boolean(resource.githubUrl)

  // Detect if the pdfUrl is a backend auth-gated API URL (not publicly accessible)
  // Matches: relative /api/... paths AND absolute localhost/127.x URLs
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
  }, [resourceId])


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

  const copyCitation = () => {
    const year = resource.year || new Date(resource.updatedAt || Date.now()).getFullYear()
    const citation = `${resource.author || 'Anonymous'}. (${year}). ${resource.title}. Department of ${resource.department || 'CSE'}, Institutional Repository.`
    navigator.clipboard.writeText(citation)
    alert('APA citation copied to clipboard!')
  }

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
            <Button variant="outline" className="gap-1.5 text-xs" onClick={copyCitation}>
              <Quote size={14} /> Cite
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
                            Powered by Google Docs Viewer · If the preview fails, use "Open in Browser" above.
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
              <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs" onClick={copyCitation}>
                <Quote size={13} /> Copy APA Citation
              </Button>
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

          {/* Related Resources Preview */}
          <Card className="border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">From Same Course</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 grid gap-2.5">
              {RESOURCE_ITEMS
                .filter(r => r.id !== resource.id && r.course === resource.course)
                .slice(0, 3)
                .map(r => (
                  <Link to={`/library/resource/${r.id}`} key={r.id}
                    className="group flex gap-2.5 p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                      {r.youtubeId
                        ? <PlayCircle size={14} className="text-red-500" />
                        : <FileText size={14} className="text-muted-foreground" />}
                    </div>
                    <div className="grid gap-0.5 min-w-0">
                      <p className="text-[11px] font-bold text-foreground line-clamp-1 group-hover:text-accent transition-colors">{r.title}</p>
                      <p className="text-[10px] text-muted-foreground">{r.type} · {r.year}</p>
                    </div>
                  </Link>
                ))
              }
              {RESOURCE_ITEMS.filter(r => r.id !== resource.id && r.course === resource.course).length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">No other resources for this course.</p>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
