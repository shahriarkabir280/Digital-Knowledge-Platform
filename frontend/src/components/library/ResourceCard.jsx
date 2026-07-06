import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bookmark, PlayCircle, Globe, ExternalLink } from 'lucide-react'
import PDFThumbnail from './PDFThumbnail.jsx'

const typeBadgeClass = 'bg-accent/10 text-accent border-accent/20'

const fallbackThumb = {
  'Research Paper': '/thumbs/thumb_paper.png',
  'Thesis': '/thumbs/thumb_paper.png',
  'Dataset': '/thumbs/thumb_dataset.png',
  'Textbook': '/thumbs/thumb_pdf.png',
  'Lecture Slides': '/thumbs/thumb_ppt.png',
  'Lab Manual': '/thumbs/thumb_pdf.png',
  'Question Bank': '/thumbs/thumb_qbank.png',
  'Assignment': '/thumbs/thumb_assignment.png',
  'Lab Report': '/thumbs/thumb_lab_report.png',
}

/** Extract YouTube video ID from various URL formats */
function extractYouTubeId(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0]
    if (u.pathname.startsWith('/embed/')) return u.pathname.split('/embed/')[1]?.split('?')[0]
  } catch { /* ignore */ }
  return null
}

/** Check if URL is a direct video file */
function isDirectVideoUrl(url) {
  if (!url) return false
  try {
    const path = new URL(url).pathname.toLowerCase()
    return ['.mp4', '.webm', '.ogg', '.mov'].some(ext => path.endsWith(ext))
  } catch { return false }
}

/** Hosted screenshot thumbnail using Microlink API */
function WebsiteThumbnail({ url, type }) {
  const [imgError, setImgError] = useState(false)
  const screenshotUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`
  let domain = url
  try { domain = new URL(url).hostname } catch { /* ignore */ }

  return (
    <div className="relative w-full h-40 overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
      {!imgError ? (
        <img
          src={screenshotUrl}
          alt="Website preview"
          className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-accent/20 to-accent/5">
          <Globe size={30} className="text-accent opacity-70" />
          <span className="text-[10px] text-muted-foreground font-medium px-3 text-center line-clamp-2">{domain}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-[10px] font-bold text-white bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30">
          <ExternalLink size={10} /> Open Resource
        </span>
      </div>
      <span className="absolute bottom-2 left-2 bg-accent text-white text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">
        {type}
      </span>
    </div>
  )
}

export default function ResourceCard({
  item,
  type,
  isBookmarked,
  onBookmark,
  viewerLink,
  pdfUrl,
  hasVideo,
  youtubeId: youtubeIdProp,
}) {
  const fallbackSrc = fallbackThumb[type] || '/thumbs/thumb_pdf.png'
  const isExternal = viewerLink && (viewerLink.startsWith('http://') || viewerLink.startsWith('https://'))

  const youtubeId = youtubeIdProp || (isExternal ? extractYouTubeId(viewerLink) : null)
  const isYouTube = Boolean(youtubeId)
  const isDirectVideo = !isYouTube && isExternal && isDirectVideoUrl(viewerLink)

  const CardLink = ({ children, className }) => {
    if (isExternal) {
      return (
        <a href={viewerLink} target="_blank" rel="noopener noreferrer" className={className}>
          {children}
        </a>
      )
    }
    return <Link to={viewerLink} className={className}>{children}</Link>
  }

  // ── YouTube thumbnail
  const youtubeThumbnail = (
    <CardLink className="relative block h-40 overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 group">
      <img
        src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
        alt={item.title}
        className="w-full h-full object-cover opacity-85 group-hover:opacity-60 transition-opacity"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-red-600/90 shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-white/20">
          <PlayCircle size={32} className="text-white fill-white" />
        </div>
      </div>
      <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">
        YouTube
      </span>
    </CardLink>
  )

  // ── Direct video file – hover to preview
  const directVideoThumbnail = (
    <div className="relative block h-40 overflow-hidden bg-black group">
      <video
        src={viewerLink}
        className="w-full h-full object-cover"
        preload="metadata"
        muted
        playsInline
        onMouseEnter={e => e.currentTarget.play()}
        onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
      />
      <span className="absolute bottom-2 left-2 bg-accent text-white text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">
        Video
      </span>
    </div>
  )

  // ── External URL (website/drive) – screenshot via Microlink
  const externalUrlThumbnail = (
    <CardLink className="relative block h-40 overflow-hidden group">
      <WebsiteThumbnail url={viewerLink} type={type} />
    </CardLink>
  )

  // ── Standard PDF / file thumbnail
  const fileThumbnail = (
    <CardLink className="relative block h-40 overflow-hidden group">
      {pdfUrl ? (
        <PDFThumbnail pdfUrl={pdfUrl} fallbackSrc={fallbackSrc} badgeColor="bg-accent" badgeLabel={type} />
      ) : (
        <div className="relative w-full h-40 overflow-hidden bg-muted">
          <img
            src={fallbackSrc}
            alt={item.title}
            className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all duration-200 flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-white bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30">
              Click to View Details
            </span>
          </div>
          <span className="absolute bottom-2 left-2 bg-accent text-white text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">
            {type}
          </span>
        </div>
      )}
    </CardLink>
  )

  const thumbnail = isYouTube
    ? youtubeThumbnail
    : isDirectVideo
      ? directVideoThumbnail
      : isExternal
        ? externalUrlThumbnail
        : fileThumbnail

  return (
    <Card className="group hover:-translate-y-1 hover:shadow-lg transition-all border-border flex flex-col overflow-hidden">
      {thumbnail}

      <CardHeader className="p-4 pb-1">
        <div className="flex justify-between items-start gap-2">
          <Badge className={`text-xs font-bold px-2 py-0.5 border uppercase ${typeBadgeClass}`}>
            {type}
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            className="w-7 h-7 hover:text-accent rounded-full -mt-0.5 -mr-1 shrink-0"
            onClick={(e) => { e.preventDefault(); onBookmark?.(item.id) }}
          >
            <Bookmark size={14} className={isBookmarked ? 'fill-accent text-accent' : 'text-muted-foreground'} />
          </Button>
        </div>
        <CardLink className="hover:text-accent transition-colors">
          <CardTitle className="text-sm font-bold leading-snug mt-2 line-clamp-2">
            {item.title}
          </CardTitle>
        </CardLink>
        <p className="text-xs text-muted-foreground">
          {item.author || 'Anonymous'} · <span className="font-semibold text-accent-strong">{item.department || item.course || 'General'}</span>
        </p>
        {item.uploaderName && (
          <p className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-0.5">
            <span>Posted by <span className="font-medium text-foreground/70">{item.uploaderName}</span></span>
          </p>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-1 flex flex-col gap-3">
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {item.summary || 'No summary description provided.'}
        </p>

        {(item.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(item.tags || []).slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] py-0 px-1.5 bg-muted/10 text-muted-foreground border-muted/35">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

