import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '../app/use-auth'
import {
  getProjects,
  submitProject,
  submitReview,
  getAchievements,
} from '../services/api/projects'

export default function StudentProjectShowcasePage() {
  const { authState } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('browse') // browse, submit, myprojects, achievements
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(5)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'technology',
    tags: '',
    multimedia: [],
  })

  // Fetch all projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
    staleTime: 30_000,
  })

  // Fetch user's achievements
  const { data: achievementsData } = useQuery({
    queryKey: ['achievements', authState.token],
    queryFn: () => getAchievements(authState.token),
    staleTime: 30_000,
  })

  // Submit project mutation
  const submitProjectMutation = useMutation({
    mutationFn: (data) => submitProject(data, authState.token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setFormData({
        title: '',
        description: '',
        category: 'technology',
        tags: '',
        multimedia: [],
      })
      setShowSubmitForm(false)
      alert('Project submitted successfully!')
    },
    onError: (error) => {
      alert(`Error submitting project: ${error.message}`)
    },
  })

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: (data) => submitReview(data, authState.token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setReviewText('')
      setReviewRating(5)
      setSelectedProject(null)
      alert('Review submitted successfully!')
    },
    onError: (error) => {
      alert(`Error submitting review: ${error.message}`)
    },
  })

  // Handle form input
  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    setFormData((prev) => ({
      ...prev,
      multimedia: [...prev.multimedia, ...files],
    }))
  }

  // Handle project submission
  const handleSubmitProject = async (e) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      alert('Please enter a project title')
      return
    }

    if (!formData.description.trim()) {
      alert('Please enter a project description')
      return
    }

    submitProjectMutation.mutate({
      ...formData,
      tags: formData.tags.split(',').map((t) => t.trim()),
      submittedBy: authState.name,
    })
  }

  // Handle review submission
  const handleSubmitReview = (e) => {
    e.preventDefault()

    if (!reviewText.trim()) {
      alert('Please enter your review text')
      return
    }

    if (!selectedProject) {
      alert('No project selected')
      return
    }

    submitReviewMutation.mutate({
      projectId: selectedProject.id,
      rating: reviewRating,
      text: reviewText,
      reviewedBy: authState.name,
    })
  }

  // Filter projects
  const filteredProjects = (projectsData?.projects || []).filter((project) => {
    const matchesCategory =
      filterCategory === 'all' || project.category === filterCategory
    const matchesSearch =
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const categories = ['technology', 'science', 'humanities', 'arts', 'business']

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6">
      {/* Header */}
      <div className="grid gap-2">
        <p className="brand-kicker">Learning Commons</p>
        <h2 className="text-2xl font-semibold tracking-tight">
          Student Project Showcase
        </h2>
        <p className="text-sm text-muted-foreground">
          Submit projects, discover peer work, provide feedback, and earn recognition.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-0">
        {[
          { id: 'browse',       label: 'Browse Projects' },
          { id: 'myprojects',   label: 'My Projects' },
          { id: 'submit',       label: 'Submit Project' },
          { id: 'achievements', label: 'Achievements' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              fontSize: '.875rem',
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? 'var(--accent-strong)' : 'var(--muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'color .12s',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Browse Projects Tab */}
      {activeTab === 'browse' && (
        <div className="grid gap-4">
          {/* Search and Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="search">Search Projects</Label>
                <Input
                  id="search"
                  placeholder="Search by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label>Category</Label>
                <div className="flex flex-wrap gap-2">
                  {['all', ...categories].map((cat) => (
                    <Button
                      key={cat}
                      variant={filterCategory === cat ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterCategory(cat)}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projects List */}
          {projectsLoading ? (
            <Alert>Loading projects...</Alert>
          ) : filteredProjects.length === 0 ? (
            <Alert>
              No projects found. Try adjusting your search or filters.
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid gap-1 flex-1">
                        <CardTitle className="text-lg">{project.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          by {project.submittedBy}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {project.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <p className="text-sm text-foreground">
                      {project.description}
                    </p>

                    {project.tags && project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Reviews: {project.reviews?.length || 0}</span>
                      <span>Avg Rating: {project.avgRating?.toFixed(1) || 'N/A'}</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProject(project)}
                      className="w-full"
                    >
                      View & Review
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Projects Tab */}
      {activeTab === 'myprojects' && (
        <Card>
          <CardHeader>
            <CardTitle>Your Submitted Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredProjects.filter((p) => p.submittedBy === authState.name)
              .length === 0 ? (
              <p className="text-muted-foreground">
                You haven't submitted any projects yet.{' '}
                <button
                  onClick={() => setActiveTab('submit')}
                  className="text-primary hover:underline"
                >
                  Submit your first project
                </button>
              </p>
            ) : (
              <div className="grid gap-4">
                {filteredProjects
                  .filter((p) => p.submittedBy === authState.name)
                  .map((project) => (
                    <div
                      key={project.id}
                      className="border border-border rounded-md p-4"
                    >
                      <h3 className="font-semibold">{project.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.description}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Badge>{project.category}</Badge>
                        {project.tags?.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit Project Tab */}
      {activeTab === 'submit' && (
        <form onSubmit={handleSubmitProject} className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Submit New Project</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="e.g., AI-Powered Study Assistant"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Project Description *</Label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Describe your project, its goals, and achievements..."
                  rows={6}
                  required
                  className="submission-textarea"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleFormChange}
                  placeholder="e.g., AI, Python, Machine Learning"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="multimedia">Upload Multimedia</Label>
                <input
                  id="multimedia"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {formData.multimedia.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formData.multimedia.length} file(s) selected
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" disabled={submitProjectMutation.isPending}>
              {submitProjectMutation.isPending ? 'Submitting...' : 'Submit Project'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  title: '',
                  description: '',
                  category: 'technology',
                  tags: '',
                  multimedia: [],
                })
              }}
            >
              Clear Form
            </Button>
          </div>
        </form>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <Card>
          <CardHeader>
            <CardTitle>Your Achievements & Recognition</CardTitle>
          </CardHeader>
          <CardContent>
            {!achievementsData?.achievements ||
            achievementsData.achievements.length === 0 ? (
              <p className="text-muted-foreground">
                No achievements yet. Start submitting projects and reviews to earn badges!
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {achievementsData.achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="border border-border rounded-md p-4 text-center"
                  >
                    <div className="text-4xl mb-2">{achievement.badge}</div>
                    <h3 className="font-semibold text-sm">{achievement.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {achievement.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Earned: {new Date(achievement.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Review Modal */}
      {selectedProject && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{selectedProject.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  by {selectedProject.submittedBy}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProject(null)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <h4 className="font-semibold mb-2">Project Details</h4>
              <p className="text-sm text-foreground">{selectedProject.description}</p>
            </div>

            <form onSubmit={handleSubmitReview} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rating">Rating</Label>
                <select
                  id="rating"
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>
                      {r} Stars
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reviewText">Your Review</Label>
                <textarea
                  id="reviewText"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share constructive feedback on this project..."
                  rows={4}
                  className="submission-textarea"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitReviewMutation.isPending}>
                  {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedProject(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
