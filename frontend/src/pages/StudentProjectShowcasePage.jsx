import { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  BookOpen, 
  FileText, 
  Presentation, 
  ExternalLink, 
  MessageSquare, 
  ArrowLeft, 
  Star, 
  Clock, 
  Code, 
  Image as ImageIcon,
  CheckCircle,
  Plus
} from 'lucide-react'

// Custom GitHub icon to replace missing brand icon in lucide-react
function Github({ size = 16, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '../app/use-auth.js'

// Pre-seeded high-quality academic projects
const DEFAULT_PROJECTS = [
  {
    id: 'proj-1',
    title: 'AI-Powered Autonomous Crop Disease Detection System',
    description: 'An IoT and Deep Learning solution designed to detect crop diseases in real-time using edge computing devices and drone imagery.',
    longDescription: 'This project presents an end-to-end framework for autonomous agricultural monitoring. Utilizing DJI drones equipped with multispectral cameras, the system scans crop fields and transmits high-resolution images to a localized edge-computing unit (Raspberry Pi 4 / NVIDIA Jetson Nano). A customized MobileNetV3 model trained on the PlantVillage dataset classifies leaf anomalies with 94.2% accuracy. The results are instantly mapped onto a web-based geographic information system (GIS) dashboard, allowing farmers to target pesticide application precisely, reducing chemical waste by up to 40%.',
    category: 'Artificial Intelligence',
    academicYear: '2025-2026',
    teamMembers: ['Tahmid Rahman', 'Sajid Al-Masoom', 'Fariha Anjum'],
    supervisor: 'Dr. Md. Kamrul Hasan',
    tags: ['Python', 'PyTorch', 'React', 'Raspberry Pi', 'OpenCV', 'FastAPI'],
    thumbnail: 'https://images.unsplash.com/photo-1560493676-04071c5f4b52?auto=format&fit=crop&w=600&q=80',
    featured: true,
    createdAt: '2026-05-10T10:00:00Z',
    resources: {
      reportUrl: '#',
      slidesUrl: '#',
      repoUrl: 'https://github.com/shahriarkabir280/crop-disease-detector'
    },
    screenshots: [
      'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=600&q=80'
    ],
    demoUrl: 'https://crop-detect-demo.farefin.com',
    comments: [
      { id: 'c-1', user: 'Dr. Shamim Kaiser', text: 'Excellent integration of deep learning with edge devices. Have you considered the latency on large-scale fields?', date: '2026-06-15T09:30:00Z' },
      { id: 'c-2', user: 'Tahmid Rahman', text: 'Thank you, sir! Yes, we implemented frame-skipping and local caching which keeps the processing time under 150ms per frame.', date: '2026-06-15T10:15:00Z' }
    ]
  },
  {
    id: 'proj-2',
    title: 'Decentralized Academic Credential Verification Engine',
    description: 'A secure, blockchain-based platform for issuing, storing, and verifying academic transcripts and degree certificates.',
    longDescription: 'With the rise of credential fraud, this project implements a decentralized ledger solution using Ethereum Smart Contracts (Solidity) to automate university degree verification. Academic registries issue cryptographically signed certificates as ERC-721 non-fungible tokens. Employers can verify credentials instantly via a public portal using the candidate\'s public address or a QR code. This eliminates manual verification delays and guarantees tamper-proof records.',
    category: 'Blockchain',
    academicYear: '2024-2025',
    teamMembers: ['Shahriar Kabir', 'Anika Bushra'],
    supervisor: 'Dr. Muhammad Anisur Rahman',
    tags: ['Solidity', 'Web3.js', 'React', 'Node.js', 'Ethereum', 'Truffle'],
    thumbnail: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80',
    featured: true,
    createdAt: '2025-11-20T14:30:00Z',
    resources: {
      reportUrl: '#',
      slidesUrl: '#',
      repoUrl: 'https://github.com/shahriarkabir280/academic-verification'
    },
    screenshots: [
      'https://images.unsplash.com/photo-1639762681057-408e52192e55?auto=format&fit=crop&w=600&q=80'
    ],
    demoUrl: 'https://verify-credentials.farefin.com',
    comments: [
      { id: 'c-3', user: 'Prof. Dr. Upal Mahbub', text: 'How do you handle gas fee optimizations for bulk certificate issuances?', date: '2025-12-01T11:00:00Z' }
    ]
  },
  {
    id: 'proj-3',
    title: 'SecureNet: Zero Trust Intrusion Prevention System',
    description: 'A comprehensive network security framework leveraging machine learning to detect and block zero-day exploits dynamically.',
    longDescription: 'SecureNet is a modern intrusion prevention system (IPS) designed around the Zero Trust Architecture. It monitors real-time network packets using eBPF and applies a lightweight Random Forest classifier to identify anomalous traffic behaviors. The system automatically isolates compromised nodes and triggers software-defined networking (SDN) routing updates to prevent lateral movement.',
    category: 'Cybersecurity',
    academicYear: '2025-2026',
    teamMembers: ['Nafis Imtiaz', 'Maliha Chowdhury'],
    supervisor: 'Dr. Taskeed Jabid',
    tags: ['C++', 'Python', 'eBPF', 'Scikit-Learn', 'Docker', 'Linux'],
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',
    featured: false,
    createdAt: '2026-04-05T09:00:00Z',
    resources: {
      reportUrl: '#',
      slidesUrl: '#',
      repoUrl: 'https://github.com/shahriarkabir280/securenet-ips'
    },
    screenshots: [
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80'
    ],
    demoUrl: null,
    comments: []
  },
  {
    id: 'proj-4',
    title: 'Multi-Modal Medical Image Segmentation for Oncology',
    description: 'A deep learning pipeline using 3D U-Net to segment brain tumors and lung nodules from MRI and CT scans.',
    longDescription: 'This research project develops a multi-modal convolutional network that assists radiologists in identifying malignant tissue. Using 3D U-Net architectures, the model processes multi-sequence MRI scans (T1, T1c, T2, FLAIR) to outline brain tumors with high structural fidelity. The system achieves a Dice Similarity Coefficient of 0.89 on the BraTS dataset, offering quantitative tumor volume measurements over time.',
    category: 'Data Science',
    academicYear: '2024-2025',
    teamMembers: ['Zarin Tasnim', 'Abrar Faiz'],
    supervisor: 'Dr. Md. Kamrul Hasan',
    tags: ['Python', 'TensorFlow', 'Keras', 'Nibabel', 'Monai', 'Docker'],
    thumbnail: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=600&q=80',
    featured: false,
    createdAt: '2025-09-15T11:20:00Z',
    resources: {
      reportUrl: '#',
      slidesUrl: '#',
      repoUrl: 'https://github.com/shahriarkabir280/medical-segmentation'
    },
    screenshots: [],
    demoUrl: 'https://med-segmenter.farefin.com',
    comments: []
  },
  {
    id: 'proj-5',
    title: 'IoT-Enabled Smart Campus Parking Management',
    description: 'A real-time parking monitoring and reservation system utilizing ultrasonic sensors and a React Native mobile application.',
    longDescription: 'To reduce congestion, this project deploys ultrasonic sensor nodes across campus parking slots. The nodes communicate via LoRaWAN to a central gateway, which updates slot statuses in a PostgreSQL database. Students and faculty can view available spots, receive turn-by-turn routing, and reserve parking spaces up to 15 minutes in advance.',
    category: 'Internet of Things (IoT)',
    academicYear: '2023-2024',
    teamMembers: ['Farhan Labib', 'Sadia Afrin'],
    supervisor: 'Dr. Shamim Kaiser',
    tags: ['Arduino', 'C++', 'React Native', 'LoRaWAN', 'PostgreSQL', 'Node.js'],
    thumbnail: 'https://images.unsplash.com/photo-1506521788723-868151859945?auto=format&fit=crop&w=600&q=80',
    featured: false,
    createdAt: '2024-05-18T16:45:00Z',
    resources: {
      reportUrl: '#',
      slidesUrl: '#',
      repoUrl: 'https://github.com/shahriarkabir280/iot-parking'
    },
    screenshots: [
      'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=600&q=80'
    ],
    demoUrl: null,
    comments: []
  },
  {
    id: 'proj-6',
    title: 'EduCollab: Real-Time Academic Collaboration Hub',
    description: 'A collaborative web platform integrating shared whiteboards, document editing, and audio rooms for student group work.',
    longDescription: 'EduCollab is a web application tailored for student project teams. It integrates CRDTs (Conflict-free Replicated Data Types) via Yjs for latency-free rich text editing, WebRTC for low-latency voice channels, and HTML5 Canvas for interactive whiteboards. The application is built to run entirely on the university local network.',
    category: 'Web Development',
    academicYear: '2024-2025',
    teamMembers: ['Rayhan Kabir', 'Nusrat Jahan'],
    supervisor: 'Dr. Taskeed Jabid',
    tags: ['React', 'Node.js', 'Socket.io', 'WebRTC', 'Express', 'TailwindCSS'],
    thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
    featured: false,
    createdAt: '2025-02-12T10:15:00Z',
    resources: {
      reportUrl: '#',
      slidesUrl: '#',
      repoUrl: 'https://github.com/shahriarkabir280/educollab'
    },
    screenshots: [],
    demoUrl: 'https://educollab-demo.farefin.com',
    comments: []
  }
]

export default function StudentProjectShowcasePage() {
  const { authState } = useAuth()
  
  // State variables
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('dkp_showcase_projects')
    return saved ? JSON.parse(saved) : DEFAULT_PROJECTS
  })
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterYear, setFilterYear] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [commentText, setCommentText] = useState('')
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  // Submit form state
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    longDescription: '',
    category: 'Artificial Intelligence',
    academicYear: '2025-2026',
    teamMembers: '',
    supervisor: '',
    tags: '',
    thumbnail: '',
    repoUrl: '',
    demoUrl: '',
  })

  // Sync projects with localStorage
  useEffect(() => {
    localStorage.setItem('dkp_showcase_projects', JSON.stringify(projects))
  }, [projects])

  // Scroll to top when transitioning
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [selectedProjectId, showSubmitModal])

  // Lists for dropdowns/filters
  const academicYears = ['all', '2025-2026', '2024-2025', '2023-2024', '2022-2023']
  const categories = [
    'all',
    'Artificial Intelligence',
    'Web Development',
    'Cybersecurity',
    'Data Science',
    'Internet of Things (IoT)',
    'Blockchain'
  ]

  // Filtering logic
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = 
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      project.teamMembers.some(member => member.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesYear = filterYear === 'all' || project.academicYear === filterYear
    const matchesCategory = filterCategory === 'all' || project.category === filterCategory

    return matchesSearch && matchesYear && matchesCategory
  })

  // Derived sections
  const featuredProjects = projects.filter(p => p.featured)
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3)

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  // Actions
  const handleAddComment = (e) => {
    e.preventDefault()
    if (!commentText.trim() || !selectedProjectId) return

    const newComment = {
      id: `comment-${Date.now()}`,
      user: authState.name || 'Anonymous User',
      text: commentText.trim(),
      date: new Date().toISOString()
    }

    setProjects(prev => prev.map(proj => {
      if (proj.id === selectedProjectId) {
        return {
          ...proj,
          comments: [...(proj.comments || []), newComment]
        }
      }
      return proj
    }))
    setCommentText('')
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setNewProject(prev => ({ ...prev, [name]: value }))
  }

  const handleCreateProject = (e) => {
    e.preventDefault()
    if (!newProject.title.trim() || !newProject.description.trim()) {
      alert('Please fill out all required fields.')
      return
    }

    const createdProject = {
      id: `proj-${Date.now()}`,
      title: newProject.title.trim(),
      description: newProject.description.trim(),
      longDescription: newProject.longDescription.trim() || newProject.description.trim(),
      category: newProject.category,
      academicYear: newProject.academicYear,
      teamMembers: newProject.teamMembers.split(',').map(m => m.trim()).filter(Boolean),
      supervisor: newProject.supervisor.trim() || 'TBA',
      tags: newProject.tags.split(',').map(t => t.trim()).filter(Boolean),
      thumbnail: newProject.thumbnail.trim() || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
      featured: false,
      createdAt: new Date().toISOString(),
      resources: {
        reportUrl: '#',
        slidesUrl: '#',
        repoUrl: newProject.repoUrl.trim() || '#'
      },
      screenshots: [],
      demoUrl: newProject.demoUrl.trim() || null,
      comments: []
    }

    setProjects(prev => [createdProject, ...prev])
    setShowSubmitModal(false)
    setNewProject({
      title: '',
      description: '',
      longDescription: '',
      category: 'Artificial Intelligence',
      academicYear: '2025-2026',
      teamMembers: '',
      supervisor: '',
      tags: '',
      thumbnail: '',
      repoUrl: '',
      demoUrl: '',
    })
    alert('Project submitted successfully and preserved locally!')
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-2">
      
      {/* ─── BROWSE VIEW ─── */}
      {!selectedProject && !showSubmitModal && (
        <>
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-4">
            <div className="grid gap-1">
              <p className="brand-kicker">CSEDU Showcase</p>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Departmental Projects</h2>
              <p className="text-sm text-muted-foreground">
                Discover, explore, and preserve outstanding student projects and research work.
              </p>
            </div>
            <Button onClick={() => setShowSubmitModal(true)} className="w-fit gap-1">
              <Plus size={16} /> Submit Project
            </Button>
          </div>

          {/* Search & Filter Panel */}
          <Card className="shadow-sm border-border">
            <CardContent className="p-5 grid gap-4 sm:grid-cols-[1fr_200px_200px] items-end">
              <div className="grid gap-1.5 w-full">
                <Label htmlFor="search" className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input 
                    id="search" 
                    placeholder="Search by title, team, technologies..." 
                    className="pl-9 bg-muted/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-1.5 w-full">
                <Label htmlFor="year" className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Academic Year</Label>
                <select 
                  id="year" 
                  className="w-full h-10 rounded-md border border-input bg-muted/20 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                >
                  {academicYears.map(year => (
                    <option key={year} value={year}>
                      {year === 'all' ? 'All Years' : year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1.5 w-full">
                <Label htmlFor="category" className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Category</Label>
                <select 
                  id="category" 
                  className="w-full h-10 rounded-md border border-input bg-muted/20 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Main Layout Grid */}
          <div className="grid gap-6 md:grid-cols-[1fr_300px]">
            
            {/* Left Column: Featured & Project Grid */}
            <div className="grid gap-6">
              
              {/* Featured Projects Section */}
              {featuredProjects.length > 0 && !searchQuery && filterCategory === 'all' && filterYear === 'all' && (
                <div className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <Star className="text-amber-500 fill-amber-500" size={18} />
                    <h3 className="text-lg font-bold text-foreground">Featured Work</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {featuredProjects.map(project => (
                      <Card key={project.id} className="relative overflow-hidden group hover:shadow-md transition-all border-border flex flex-col">
                        <div className="h-40 overflow-hidden relative bg-muted">
                          <img 
                            src={project.thumbnail} 
                            alt={project.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <Badge className="absolute top-3 right-3 bg-amber-500 hover:bg-amber-600 text-white border-none gap-1">
                            <Star size={10} className="fill-white" /> Featured
                          </Badge>
                          <Badge className="absolute bottom-3 left-3 bg-black/60 text-white border-none text-xs">
                            {project.category}
                          </Badge>
                        </div>
                        <CardHeader className="p-4 pb-1">
                          <p className="text-xs font-semibold text-accent-strong">{project.academicYear}</p>
                          <CardTitle className="text-base font-bold line-clamp-1 group-hover:text-accent transition-colors">{project.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between gap-3">
                          <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                          
                          <div className="grid gap-1.5 border-t border-muted/50 pt-2 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <User size={12} />
                              <span className="truncate"><strong>By:</strong> {project.teamMembers.join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <BookOpen size={12} />
                              <span className="truncate"><strong>Supervised by:</strong> {project.supervisor}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {project.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-[10px] py-0 px-1.5">
                                {tag}
                              </Badge>
                            ))}
                            {project.tags.length > 3 && (
                              <span className="text-[10px] text-muted-foreground self-center">+{project.tags.length - 3}</span>
                            )}
                          </div>

                          <Button 
                            className="w-full mt-2 text-xs" 
                            variant="secondary"
                            onClick={() => setSelectedProjectId(project.id)}
                          >
                            View Details
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Project Grid/List */}
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">
                    {searchQuery || filterCategory !== 'all' || filterYear !== 'all' ? 'Search Results' : 'All Projects'}
                  </h3>
                  <span className="text-xs text-muted-foreground font-medium bg-muted px-2.5 py-1 rounded-full">
                    {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'} found
                  </span>
                </div>

                {filteredProjects.length === 0 ? (
                  <Card className="p-8 text-center border-dashed border-2 border-border">
                    <p className="text-muted-foreground font-medium">No projects match your search query or filters.</p>
                    <Button variant="outline" className="mt-3 text-xs" onClick={() => { setSearchQuery(''); setFilterCategory('all'); setFilterYear('all'); }}>
                      Reset Filters
                    </Button>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {filteredProjects.map(project => (
                      <Card key={project.id} className="hover:shadow-md transition-all border-border flex flex-col">
                        <div className="h-36 overflow-hidden relative bg-muted">
                          <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover" />
                          <Badge className="absolute top-3 right-3 bg-black/60 text-white border-none text-[11px]">
                            {project.category}
                          </Badge>
                        </div>
                        <CardHeader className="p-4 pb-1">
                          <div className="flex justify-between items-center text-xs font-semibold text-accent-strong">
                            <span>{project.academicYear}</span>
                          </div>
                          <CardTitle className="text-base font-bold line-clamp-1">{project.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between gap-3">
                          <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                          
                          <div className="grid gap-1.5 border-t border-muted/50 pt-2 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <User size={12} />
                              <span className="truncate"><strong>Team:</strong> {project.teamMembers.join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <BookOpen size={12} />
                              <span className="truncate"><strong>Supervisor:</strong> {project.supervisor}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {project.tags.slice(0, 4).map(tag => (
                              <Badge key={tag} variant="outline" className="text-[10px] py-0 px-1.5">
                                {tag}
                              </Badge>
                            ))}
                            {project.tags.length > 4 && (
                              <span className="text-[10px] text-muted-foreground self-center">+{project.tags.length - 4}</span>
                            )}
                          </div>

                          <Button 
                            className="w-full mt-2 text-xs" 
                            variant="outline"
                            onClick={() => setSelectedProjectId(project.id)}
                          >
                            View Details
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Recent Submissions & Preservation Stats */}
            <div className="grid gap-6 self-start">
              
              {/* Recent Projects */}
              <Card className="border-border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Clock size={15} className="text-accent" /> Recent Uploads
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 grid gap-3">
                  {recentProjects.map(proj => (
                    <div 
                      key={proj.id} 
                      onClick={() => setSelectedProjectId(proj.id)}
                      className="group cursor-pointer flex gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                    >
                      <div className="w-12 h-12 rounded bg-muted overflow-hidden flex-shrink-0">
                        <img src={proj.thumbnail} alt={proj.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="grid gap-0.5 min-w-0">
                        <h4 className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-accent transition-colors">{proj.title}</h4>
                        <p className="text-[10px] text-muted-foreground">{proj.category} · {proj.academicYear}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Preservation Mission Box */}
              <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
                <CardContent className="p-4 grid gap-2.5">
                  <h4 className="text-xs font-bold text-accent-strong uppercase tracking-wider">Project Preservation</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This archive preserves undergraduate and postgraduate research, source code, and design documentation from the Department of Computer Science & Engineering.
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-md">
                    <CheckCircle size={14} /> Registered in Institutional Archive
                  </div>
                </CardContent>
              </Card>

            </div>

          </div>
        </>
      )}

      {/* ─── PROJECT DETAILS VIEW ─── */}
      {selectedProject && (
        <div className="grid gap-6">
          
          {/* Back Button */}
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedProjectId(null)} 
              className="gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={16} /> Back to Showcase
            </Button>
          </div>

          {/* Details Layout */}
          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            
            {/* Left Column: Content, Tech, Gallery, Discussion */}
            <div className="grid gap-6">
              
              {/* Main Info */}
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="h-64 overflow-hidden relative bg-muted">
                  <img src={selectedProject.thumbnail} alt={selectedProject.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 grid gap-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-accent text-white border-none font-semibold text-xs">
                        {selectedProject.category}
                      </Badge>
                      <Badge className="bg-white/25 text-white border-none font-semibold text-xs">
                        {selectedProject.academicYear}
                      </Badge>
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{selectedProject.title}</h2>
                  </div>
                </div>
                
                <CardContent className="p-6 grid gap-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Project Overview</h3>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedProject.longDescription}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Technologies Used */}
              <Card className="border-border shadow-sm">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Code size={16} className="text-accent" /> Technologies Used
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs font-medium py-1 px-2.5 bg-muted/65 hover:bg-muted">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Screenshot / Demo Gallery */}
              {selectedProject.screenshots && selectedProject.screenshots.length > 0 && (
                <Card className="border-border shadow-sm">
                  <CardHeader className="p-5 pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <ImageIcon size={16} className="text-accent" /> Screenshots & Demo Gallery
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {selectedProject.screenshots.map((img, idx) => (
                        <div key={idx} className="rounded-lg overflow-hidden border border-border bg-muted aspect-video">
                          <img src={img} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comments & Discussion */}
              <Card className="border-border shadow-sm">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <MessageSquare size={16} className="text-accent" /> Comments & Discussion
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 grid gap-6">
                  
                  {/* Comments List */}
                  <div className="grid gap-4">
                    {(!selectedProject.comments || selectedProject.comments.length === 0) ? (
                      <p className="text-xs text-muted-foreground italic">No comments posted yet. Be the first to share feedback!</p>
                    ) : (
                      selectedProject.comments.map(c => (
                        <div key={c.id} className="flex gap-3 p-3.5 rounded-lg bg-muted/20 border border-border/60">
                          <div className="w-8 h-8 rounded-full bg-accent-bg text-accent-strong flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {c.user.charAt(0).toUpperCase()}
                          </div>
                          <div className="grid gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">{c.user}</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(c.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-foreground leading-normal">{c.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Form */}
                  <form onSubmit={handleAddComment} className="grid gap-3 border-t border-muted/60 pt-4">
                    <div className="grid gap-1.5">
                      <Label htmlFor="comment" className="text-xs font-semibold text-muted-foreground">Post a Review / Question</Label>
                      <textarea
                        id="comment"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Provide constructive feedback, suggest enhancements, or ask questions..."
                        rows={3}
                        required
                        className="w-full rounded-md border border-input bg-muted/10 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <Button type="submit" size="sm" className="w-fit gap-1 ml-auto text-xs">
                      Submit Comment
                    </Button>
                  </form>

                </CardContent>
              </Card>

            </div>

            {/* Right Column: Team, Supervisor, Resources, Demo Link */}
            <div className="grid gap-6 self-start">
              
              {/* Team Information */}
              <Card className="border-border shadow-sm">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Team Details</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 grid gap-4">
                  {/* Team Members */}
                  <div className="grid gap-2">
                    <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <User size={13} /> Team Members
                    </h4>
                    <div className="grid gap-1.5">
                      {selectedProject.teamMembers.map(member => (
                        <div key={member} className="flex items-center gap-2 text-xs font-medium text-foreground">
                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                            {member.charAt(0)}
                          </div>
                          <span>{member}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Supervisor */}
                  <div className="grid gap-2 border-t border-muted/65 pt-3">
                    <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <BookOpen size={13} /> Project Supervisor
                    </h4>
                    <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                      <div className="w-5 h-5 rounded-full bg-accent-bg text-accent-strong flex items-center justify-center text-[10px] font-bold">
                        S
                      </div>
                      <span>{selectedProject.supervisor}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resources (Preservation) */}
              <Card className="border-border shadow-sm">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preserved Resources</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 grid gap-2.5">
                  <Button asChild variant="outline" className="w-full justify-start gap-2 text-xs">
                    <a href={selectedProject.resources.reportUrl} download>
                      <FileText size={14} className="text-red-500" /> Final Report (PDF)
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start gap-2 text-xs">
                    <a href={selectedProject.resources.slidesUrl} download>
                      <Presentation size={14} className="text-amber-500" /> Slides (PPTX)
                    </a>
                  </Button>
                  {selectedProject.resources.repoUrl && selectedProject.resources.repoUrl !== '#' && (
                    <Button asChild variant="outline" className="w-full justify-start gap-2 text-xs">
                      <a href={selectedProject.resources.repoUrl} target="_blank" rel="noopener noreferrer">
                        <Github size={14} className="text-slate-800 dark:text-slate-200" /> Source Code Repo
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Live Demo Link */}
              {selectedProject.demoUrl && (
                <Button asChild className="w-full gap-2 text-xs py-5 font-semibold" variant="default">
                  <a href={selectedProject.demoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={14} /> Launch Live Demo
                  </a>
                </Button>
              )}

            </div>

          </div>

        </div>
      )}

      {/* ─── SUBMIT PROJECT MODAL/VIEW ─── */}
      {showSubmitModal && (
        <div className="grid gap-6">
          
          {/* Back Button */}
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={() => setShowSubmitModal(false)} 
              className="gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={16} /> Cancel Submission
            </Button>
          </div>

          <form onSubmit={handleCreateProject} className="grid gap-4 max-w-2xl mx-auto w-full">
            <Card className="border-border shadow-sm">
              <CardHeader className="p-5 border-b border-border">
                <CardTitle className="text-xl font-bold">Submit Departmental Project</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Fill out the form below to register and archive your project in the department repository.
                </p>
              </CardHeader>
              
              <CardContent className="p-5 grid gap-4">
                
                <div className="grid gap-1.5">
                  <Label htmlFor="title" className="text-xs font-semibold">Project Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={newProject.title}
                    onChange={handleFormChange}
                    placeholder="e.g., Autonomous Crop Disease Detection System"
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="description" className="text-xs font-semibold">Short Description *</Label>
                  <Input
                    id="description"
                    name="description"
                    value={newProject.description}
                    onChange={handleFormChange}
                    placeholder="Brief 1-2 sentence summary of the project goals and outcome..."
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="longDescription" className="text-xs font-semibold">Full Project Overview *</Label>
                  <textarea
                    id="longDescription"
                    name="longDescription"
                    value={newProject.longDescription}
                    onChange={handleFormChange}
                    placeholder="Detailed explanation of the project architecture, methodology, results, and significance..."
                    rows={6}
                    required
                    className="w-full rounded-md border border-input bg-muted/10 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="category-select" className="text-xs font-semibold">Category</Label>
                    <select
                      id="category-select"
                      name="category"
                      value={newProject.category}
                      onChange={handleFormChange}
                      className="w-full h-10 rounded-md border border-input bg-muted/10 px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {categories.filter(c => c !== 'all').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="academicYear-select" className="text-xs font-semibold">Academic Year</Label>
                    <select
                      id="academicYear-select"
                      name="academicYear"
                      value={newProject.academicYear}
                      onChange={handleFormChange}
                      className="w-full h-10 rounded-md border border-input bg-muted/10 px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {academicYears.filter(y => y !== 'all').map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="teamMembers" className="text-xs font-semibold">Team Members (comma-separated) *</Label>
                    <Input
                      id="teamMembers"
                      name="teamMembers"
                      value={newProject.teamMembers}
                      onChange={handleFormChange}
                      placeholder="e.g., Tahmid Rahman, Sajid Al-Masoom"
                      required
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="supervisor" className="text-xs font-semibold">Project Supervisor *</Label>
                    <Input
                      id="supervisor"
                      name="supervisor"
                      value={newProject.supervisor}
                      onChange={handleFormChange}
                      placeholder="e.g., Dr. Md. Kamrul Hasan"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="tags" className="text-xs font-semibold">Technology Tags (comma-separated) *</Label>
                  <Input
                    id="tags"
                    name="tags"
                    value={newProject.tags}
                    onChange={handleFormChange}
                    placeholder="e.g., Python, PyTorch, React, OpenCV"
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="thumbnail" className="text-xs font-semibold">Thumbnail Image URL</Label>
                  <Input
                    id="thumbnail"
                    name="thumbnail"
                    value={newProject.thumbnail}
                    onChange={handleFormChange}
                    placeholder="e.g., https://images.unsplash.com/photo-..."
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="repoUrl" className="text-xs font-semibold">Source Code Repository URL</Label>
                    <Input
                      id="repoUrl"
                      name="repoUrl"
                      value={newProject.repoUrl}
                      onChange={handleFormChange}
                      placeholder="e.g., https://github.com/username/repo"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="demoUrl" className="text-xs font-semibold">Live Demo URL</Label>
                    <Input
                      id="demoUrl"
                      name="demoUrl"
                      value={newProject.demoUrl}
                      onChange={handleFormChange}
                      placeholder="e.g., https://my-demo-app.com"
                    />
                  </div>
                </div>

              </CardContent>
            </Card>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowSubmitModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Archive Project
              </Button>
            </div>
          </form>

        </div>
      )}

    </div>
  )
}
