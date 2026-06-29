import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min?url'
import ResourceCard from '../modules/library/components/ResourceCard.jsx'
import {
  CATEGORIES,
  FEATURED_RESOURCES,
  RECENTLY_VIEWED,
  RECOMMENDED,
  RESOURCE_ITEMS,
} from '../modules/library/data.js'
import {
  DEFAULT_FILTERS,
  applyLibraryFilters,
  collectFilterOptions,
  searchResources,
} from '../modules/library/filters.js'
import './LibrarySection.css'

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

const renderStars = (rating) => {
  return (
    <div className="library-rating-stars" style={{ fontSize: '0.8rem', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= Math.round(rating) ? 'library-star-filled' : 'library-star-empty'}>
          ★
        </span>
      ))}
    </div>
  )
}

const QUICK_STATS = [
  { id: 'stat-1', label: 'Total Assets', value: '12,490', delta: '+14.2%' },
  { id: 'stat-2', label: 'Active Courses', value: '182', delta: '+6.3%' },
  { id: 'stat-3', label: 'Weekly Uploads', value: '214', delta: '+9.8%' },
]

const MULTIMEDIA_ITEMS = [
  {
    id: 'media-1',
    title: 'MIT 6.824: Distributed Systems Lecture',
    type: 'Video Lecture',
    duration: '1:18:24',
    youtubeId: 'cQP8WApzIQQ',
    resourceId: 'res-009',
    tags: ['distributed', 'MIT', 'consensus'],
  },
  {
    id: 'media-2',
    title: 'Advanced Laboratory Techniques Demo',
    type: 'Lab Demo',
    duration: '4:19',
    youtubeId: 'ZwqLCX-TN8c',
    resourceId: 'res-007',
    tags: ['physics', 'lab-safety'],
  },
  {
    id: 'media-3',
    title: 'Modern Web Engineering Tutorial',
    type: 'Tutorial',
    duration: '18:43',
    youtubeId: 'Wk4tXd9aPzs',
    resourceId: 'res-005',
    tags: ['react', 'frontend'],
  },
  {
    id: 'media-4',
    title: 'Software Design Patterns Deep Dive',
    type: 'Expert Guide',
    duration: '42:15',
    youtubeId: 'v9ejT8FO-7I',
    resourceId: 'res-006',
    tags: ['design-patterns', 'clean-code'],
  },
]

const PLAYLIST_ITEMS = [
  { id: 'pl-1', title: 'Continue: CSE-425 Lab Series', progress: '4 of 10 sessions' },
  { id: 'pl-2', title: 'Continue: UI Engineering Sprint', progress: '2 of 6 modules' },
]

const FACULTY_SPOTLIGHT = [
  {
    id: 'fac-1',
    name: 'Dr. Ayesha Rahman',
    focus: 'Human Centered Computing',
    officeHours: 'Sun-Tue 2:00-4:00 PM',
  },
  {
    id: 'fac-2',
    name: 'Prof. Mahmud Karim',
    focus: 'Networks and Systems',
    officeHours: 'Mon-Thu 10:00-12:00 PM',
  },
]

const COURSE_STRUCTURE = [
  {
    id: 'course-1',
    title: 'CSE-412 Distributed Systems',
    weeks: ['Week 1-2: Foundations', 'Week 3-5: Consistency', 'Week 6-8: Replication'],
  },
  {
    id: 'course-2',
    title: 'CSE-371 Human Computer Interaction',
    weeks: ['Week 1-2: Research Methods', 'Week 3-5: Prototyping', 'Week 6-8: Evaluation'],
  },
]

const ADMIN_ITEMS = [
  { id: 'admin-1', label: 'Midterm Notice', tag: 'urgent', summary: 'Midterm schedule updated for Week 6.' },
  { id: 'admin-2', label: 'Academic Calendar', tag: 'holiday', summary: 'Semester break: May 18-25.' },
  { id: 'admin-3', label: 'Guidelines', tag: 'policy', summary: 'Updated submission policy for thesis.' },
]

const TECH_RESOURCES = [
  {
    id: 'tech-1',
    resourceId: 'res-020',
    title: 'Cloud-Native Analytics Dashboard',
    tags: ['react', 'node', 'kubernetes'],
    meta: 'v1.4.0 Stable',
    snippet: 'helm install analytics ./charts',
  },
  {
    id: 'tech-2',
    resourceId: 'res-009',
    title: 'Distributed Systems Core',
    tags: ['go', 'grpc', 'redis'],
    meta: 'v0.9.2 Beta',
    snippet: 'go run main.go --config config.yaml',
  },
]

const DATASETS = [
  {
    id: 'data-1',
    title: 'Student Engagement Logs',
    size: '2.1 GB',
    format: 'CSV',
    description: 'Anonymized engagement events for learning analytics.',
  },
  {
    id: 'data-2',
    title: 'IoT Lab Sensor Archive',
    size: '880 MB',
    format: 'JSON',
    description: 'Environmental telemetry data with timestamps.',
  },
]



export default function LibraryPage() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('query') || '')
  const [pendingQuery, setPendingQuery] = useState(searchParams.get('query') || '')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [bookmarks, setBookmarks] = useState(['res-001', 'res-008'])
  const [academicCategory, setAcademicCategory] = useState('All')
  const [hoveredMediaId, setHoveredMediaId] = useState(null)

  const ACADEMIC_CATEGORIES = ['All', 'Textbooks', 'Lecture Slides', 'Online Resources', 'Lecture Series']

  const options = useMemo(() => collectFilterOptions(RESOURCE_ITEMS), [])

  const filteredResources = useMemo(() => {
    let base = searchResources(RESOURCE_ITEMS, query)
    base = applyLibraryFilters(base, filters)

    // Filter out items already shown in Multimedia or Featured to avoid duplication
    const mediaResourceIds = MULTIMEDIA_ITEMS.map(m => m.resourceId)
    const featuredIds = FEATURED_RESOURCES.map(f => f.id)

    // For general listing, we definitely exclude these specific sections to keep them separate
    const uniqueBase = base.filter(item => !featuredIds.includes(item.id) && !mediaResourceIds.includes(item.id))

    if (academicCategory !== 'All') {
      // Academic Resources section should only show non-media resources to stay separate
      return uniqueBase.filter(item => {
        if (academicCategory === 'Textbooks') return item.type === 'PDF' || item.tags.includes('textbook')
        if (academicCategory === 'Lecture Slides') return item.type === 'PPT' || item.tags.includes('slides')
        if (academicCategory === 'Online Resources') return item.type === 'Video' || item.tags.includes('online')
        if (academicCategory === 'Lecture Series') return item.tags.includes('lecture') || item.tags.includes('series')
        return true
      })
    }
    return uniqueBase
  }, [query, filters, academicCategory])

  const filteredFeatured = useMemo(() => {
    const afterSearch = searchResources(FEATURED_RESOURCES, query)
    return applyLibraryFilters(afterSearch, filters)
  }, [query, filters])

  const recentlyViewedItems = useMemo(() => {
    return RECENTLY_VIEWED.map(title => RESOURCE_ITEMS.find(item => item.title === title)).filter(Boolean);
  }, []);

  const onFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const onSearchSubmit = (event) => {
    event.preventDefault()
    setQuery(pendingQuery)
  }

  const onBookmarkToggle = (resourceId) => {
    setBookmarks((current) => {
      if (current.includes(resourceId)) {
        return current.filter((item) => item !== resourceId)
      }
      return [...current, resourceId]
    })
  }

  const onResetFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setQuery('')
    setPendingQuery('')
  }

  return (
    <section className="library-page">
      <header className="library-hero">
        <div className="library-hero-layout">
          <div>
            <p className="library-kicker">Digital Knowledge Platform</p>
            <h2>Academic Resources for fast academic discovery and resource management</h2>
            <p>
              Discover, preview, and organize university resources with role-aware actions for students,
              faculty, and administrators.
            </p>
            <div className="library-hero-stats">
              {QUICK_STATS.map((item) => (
                <div key={item.id} className="library-hero-stat">
                  <strong>{item.value}</strong>
                  <span>
                    {item.label} · {item.delta}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="library-topbar">
        <form className="library-topbar-search" onSubmit={onSearchSubmit}>
          <div className="library-search-row">
            <input
              className="library-input"
              placeholder="Search across all resources, courses, and people"
              value={pendingQuery}
              onChange={(event) => setPendingQuery(event.target.value)}
            />
            <button type="submit" className="library-btn library-btn-primary">
              Search
            </button>
          </div>
          <div className="library-filter-grid">
            <select
              className="library-select"
              name="category"
              value={filters.category}
              onChange={onFilterChange}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((item) => (
                <option key={item.id} value={item.label}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              className="library-select"
              name="course"
              value={filters.course}
              onChange={onFilterChange}
            >
              <option value="">All Courses</option>
              {options.courses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              className="library-select"
              name="department"
              value={filters.department}
              onChange={onFilterChange}
            >
              <option value="">All Departments</option>
              {options.departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select className="library-select" name="type" value={filters.type} onChange={onFilterChange}>
              <option value="">All File Types</option>
              {options.fileTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select className="library-select" name="year" value={filters.year} onChange={onFilterChange}>
              <option value="">All Years</option>
              {options.years.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              className="library-input"
              name="tags"
              value={filters.tags}
              onChange={onFilterChange}
              placeholder="Tags: ai, archive"
            />
          </div>
          <div className="library-topbar-filter-actions">
            <div className="library-chip-row">
              <span className="library-chip">AI Suggestions</span>
              <span className="library-chip">Course Filters</span>
              <span className="library-chip">Role Based</span>
            </div>
            <button type="button" className="library-btn library-btn-ghost" onClick={onResetFilters}>
              Reset Filters
            </button>
          </div>
        </form>
      </section>

      <section className="library-dashboard" style={{ gridTemplateColumns: '1fr' }}>


        <div className="library-panel">
          <h3 className="library-panel-title">Recently Viewed</h3>
          <div className="library-horizontal-scroll">
            {recentlyViewedItems.map((item) => (
              <div key={item.id} className="library-scroll-item">
                <ResourceCard
                  item={item}
                  isBookmarked={bookmarks.includes(item.id)}
                  onBookmarkToggle={onBookmarkToggle}
                />
              </div>
            ))}
          </div>

        </div>
      </section>

      <div className="library-main-grid">
        <div className="library-main-content">
          <section className="library-panel">
            <h3 className="library-panel-title">Featured Resources</h3>
            <div className="library-featured-track">
              {filteredFeatured.map((item) => (
                <article key={item.id} className="library-featured-card">
                  <h4>{item.title}</h4>
                  <p className="library-featured-meta">
                    {item.author} · {item.department}
                  </p>
                  <p>{item.summary}</p>
                  <Link className="library-inline-link" to={`/library/resource/${item.id}`}>
                    Open Details
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section className="library-panel">
            <div className="library-list-toolbar" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 className="library-panel-title">Academic Resources</h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="library-toggle">
                  {ACADEMIC_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      className={academicCategory === cat ? 'is-active' : ''}
                      onClick={() => setAcademicCategory(cat)}
                      style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="library-card-grid">
              {filteredResources.slice(0, 8).map((item) => (
                <ResourceCard
                  key={item.id}
                  item={item}
                  onBookmarkToggle={onBookmarkToggle}
                  bookmarked={bookmarks.includes(item.id)}
                />
              ))}
            </div>
          </section>

          <section className="library-panel">
            <h3 className="library-panel-title">Multimedia Learning Resources</h3>
            <div className="library-media-grid">
              {MULTIMEDIA_ITEMS.map((item) => (
                <article
                  key={item.id}
                  className="library-media-card"
                  onMouseEnter={() => setHoveredMediaId(item.id)}
                  onMouseLeave={() => setHoveredMediaId(null)}
                >
                  <div className="library-media-thumb">
                    {hoveredMediaId === item.id ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${item.youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${item.youtubeId}`}
                        style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
                        allow="autoplay"
                        title={item.title}
                      />
                    ) : (
                      <img
                        src={`https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg`}
                        alt={item.title}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                      />
                    )}

                    <Link
                      to={`/library/resource/${item.resourceId || 'res-004'}`}
                      className="library-media-thumb-link"
                    />

                    <Link
                      to={`/library/resource/${item.resourceId || 'res-004'}`}
                      className="library-media-play-btn"
                    >
                      <span style={{ marginLeft: '4px', fontSize: '1.2rem' }}>▶</span>
                    </Link>
                    <div className="library-media-overlay" style={{ zIndex: 6 }}>
                      <span className="library-media-duration">{item.duration}</span>
                    </div>
                  </div>
                  <div className="library-media-body">
                    <span className="library-media-type-tag">{item.type}</span>
                    <Link to={`/library/resource/${item.resourceId || 'res-004'}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <h4>{item.title}</h4>
                    </Link>
                    <div className="library-chip-row">
                      {item.tags.map((tag) => (
                        <span key={tag} className="library-chip">#{tag}</span>
                      ))}
                    </div>
                    <div className="library-media-footer">
                      {renderStars(4.5)}
                      <div className="library-media-actions">
                        <button className="library-btn library-btn-ghost" style={{ padding: '4px 8px' }}>Save</button>
                        <Link
                          to={`/library/resource/${item.resourceId || 'res-004'}`}
                          className="library-btn library-btn-primary"
                          style={{ padding: '4px 12px', fontSize: '0.75rem', textDecoration: 'none' }}
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>



          <section className="library-panel">
            <h3 className="library-panel-title">Administrative and Official Documents</h3>
            <div className="library-admin-grid">
              {ADMIN_ITEMS.map((item) => (
                <article key={item.id} className="library-admin-card">
                  <div>
                    <span className={`library-badge library-badge-${item.tag}`}>{item.tag}</span>
                    <h4>{item.label}</h4>
                    <p>{item.summary}</p>
                  </div>
                  <button type="button" className="library-btn library-btn-ghost">
                    Open
                  </button>
                </article>
              ))}
            </div>
            <div className="library-calendar">
              <div className="library-calendar-event">
                <p>Apr 28 · Research Colloquium</p>
                <span>Auditorium · 10:00 AM</span>
              </div>
              <div className="library-calendar-event">
                <p>May 02 · Project Expo</p>
                <span>Lab Block · 2:00 PM</span>
              </div>
            </div>
          </section>

          <section className="library-panel">
            <h3 className="library-section-title">Technical and Project Resources</h3>
            <div className="library-tech-grid">
              {TECH_RESOURCES.map((item) => (
                <article key={item.id} className="library-tech-card">
                  <div className="library-tech-header">
                    <div>
                      <h4 className="library-tech-title">{item.title}</h4>
                      <div className="library-chip-row">
                        {item.tags.map(tag => <span key={tag} className="library-tech-badge">{tag}</span>)}
                      </div>
                    </div>
                    <span className="library-tech-meta">{item.meta}</span>
                  </div>

                  <div className="library-tech-code">
                    <code>{item.snippet}</code>
                  </div>

                  <div className="library-tech-actions">
                    <Link to={`/library/resource/${item.resourceId}`} className="library-btn-tech library-btn-repo">
                      View Project Details
                    </Link>
                    <Link to={`/library/resource/${item.resourceId}`} className="library-btn-tech library-btn-demo">
                      View Demo
                    </Link>
                  </div>
                </article>
              ))}
            </div>

          </section>

          <section className="library-panel">
            <h3 className="library-section-title">Project Implementation Demos</h3>
            <div className="library-demo-grid">
              {RESOURCE_ITEMS.filter(res => res.type === 'Project' && res.youtubeId).map(demo => (
                <Link
                  key={demo.id}
                  to={`/library/resource/${demo.id}`}
                  className="library-demo-card"
                  onMouseEnter={() => setHoveredMediaId(demo.id)}
                  onMouseLeave={() => setHoveredMediaId(null)}
                >
                  <div className="library-demo-thumb-container">
                    {hoveredMediaId === demo.id ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${demo.youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${demo.youtubeId}`}
                        style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
                        allow="autoplay"
                        title={demo.title}
                      />
                    ) : (
                      <img src={`https://img.youtube.com/vi/${demo.youtubeId}/mqdefault.jpg`} alt={demo.title} />
                    )}
                    <div className="library-demo-play" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem', background: hoveredMediaId === demo.id ? 'transparent' : 'rgba(0,0,0,0.2)', pointerEvents: 'none' }}>▶</div>
                  </div>

                  <div className="library-demo-content">
                    <h4>{demo.title}</h4>
                    <p className="library-demo-description">{demo.description}</p>
                    <div className="library-demo-footer">
                      <span className="library-demo-tag">{demo.department}</span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>View Project details ➔</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="library-panel">
            <h3 className="library-section-title">Research & Data Resources</h3>
            <div className="library-research-grid">
              {RESOURCE_ITEMS.filter(res => ['Paper', 'Thesis', 'Dataset'].includes(res.type)).map(res => (
                <div key={res.id} className="library-research-card">
                  <Link to={`/library/resource/${res.id}`} className="library-research-preview-thumb">
                    {res.pdfUrl ? (
                      <div className="library-card-preview-pdf" style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', background: 'white' }}>
                        <Document
                          file={{ url: res.pdfUrl }}
                          loading={<div className="library-card-preview-loading" style={{ padding: '40px', fontSize: '0.7rem' }}>Loading preview...</div>}
                          error={<div className="library-card-preview-loading" style={{ padding: '40px', fontSize: '0.7rem' }}>Preview unavailable</div>}
                        >
                          <Page
                            pageNumber={1}
                            width={240}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </Document>
                      </div>
                    ) : res.type === 'Dataset' ? (
                      <div className="library-data-viz-icon" style={{ fontSize: '2.5rem' }}>📊</div>
                    ) : (
                      <div className="library-research-doc-icon">
                        <div className="icon-line" style={{ width: '60%', height: '4px', background: '#3b82f6', marginBottom: '8px' }}></div>
                        <div className="icon-line"></div>
                        <div className="icon-line"></div>
                        <div className="icon-line" style={{ width: '80%' }}></div>
                        <div className="icon-line"></div>
                        <div className="icon-line"></div>
                      </div>
                    )}
                  </Link>

                  <div className="library-research-content">
                    <div className={`library-research-type type-${res.type.toLowerCase()}`}>
                      {res.type}
                    </div>
                    <Link to={`/library/resource/${res.id}`} style={{ textDecoration: 'none' }}>
                      <h4>{res.title}</h4>
                    </Link>
                    <p className="library-research-author">{res.author}</p>
                    <p className="library-research-summary">{res.summary}</p>

                    <div className="library-research-meta-box">
                      <div className="library-research-meta-item">
                        <strong>{res.type === 'Dataset' ? 'Format' : 'Publisher'}</strong>
                        {res.type === 'Dataset' ? res.format : (res.journal || 'Institutional Repository')}
                      </div>
                      <div className="library-research-meta-item">
                        <strong>{res.type === 'Dataset' ? 'Size' : 'Identifier'}</strong>
                        {res.type === 'Dataset' ? res.size : (res.doi ? 'DOI Available' : 'Thesis ID')}
                      </div>
                    </div>

                    <div className="library-research-footer">
                      <div className="library-research-stats">
                        <span>👁 {res.downloads ? res.downloads * 3 : 0}</span>
                        <span>⬇ {res.downloads || 0}</span>
                      </div>
                      <button
                        className="library-research-btn"
                        onClick={() => {
                          const citation = `${res.author}. (${new Date(res.updatedAt).getFullYear()}). ${res.title}. ${res.journal || 'IP Lab Repository'}.`;
                          navigator.clipboard.writeText(citation);
                          alert('Citation copied to clipboard!');
                        }}
                      >
                        Cite Asset ➔
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

      </div>
    </section>
  )
}
