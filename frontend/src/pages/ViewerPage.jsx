import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useAuth } from '../app/use-auth.js'
import { apiRequest } from '../services/api/client'
import {
  fetchAnnotations,
  createAnnotation,
  deleteAnnotation,
  replyToAnnotation,
  createReadingRoom,
  fetchReadingRooms,
  fetchRoomMessages,
  postRoomMessage,
  sendRoomHeartbeat,
  fetchRoomPresence
} from '../services/api/collaboration.js'
import {
  ExternalLink, Loader2, AlertCircle, Download, FileText,
  MessageSquare, Plus, Users, Send, Lock, Unlock, Trash2,
  LogOut, Globe, Palette, Eye, ArrowDownToLine, Share2
} from 'lucide-react'

export default function ViewerPage() {
  const { docId } = useParams()
  const { authState } = useAuth()
  const [document, setDocument] = useState(null)
  const [fileUrl, setFileUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Collaboration State
  const [activeTab, setActiveTab] = useState('annotations')
  const [annotations, setAnnotations] = useState([])
  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [roomMessages, setRoomMessages] = useState([])
  const [roomPresence, setRoomPresence] = useState([])

  // Annotation Form State
  const [sectionRef, setSectionRef] = useState('')
  const [quotedText, setQuotedText] = useState('')
  const [commentText, setCommentText] = useState('')
  const [highlightColor, setHighlightColor] = useState('yellow')
  const [isPublic, setIsPublic] = useState(true)
  const [selectedAnnoIdForReplies, setSelectedAnnoIdForReplies] = useState(null)
  const [replyText, setReplyText] = useState('')

  // Reading Room Form State
  const [newRoomName, setNewRoomName] = useState('')
  const [chatInput, setChatInput] = useState('')

  // Refs for auto-scroll
  const chatEndRef = useRef(null)

  // Interval references for polling
  const pollingIntervalRef = useRef(null)

  // Fetch initial document details
  useEffect(() => {
    if (!docId) {
      setError('No document ID provided')
      setLoading(false)
      return
    }

    const fetchDocument = async () => {
      try {
        setLoading(true)
        setError('')

        // Fetch document info
        const docResponse = await apiRequest(`/repository/files/${docId}`, {
          authToken: authState?.token,
        })

        let docData = null
        if (docResponse?.data?.document) {
          docData = docResponse.data.document
        } else if (docResponse?.document) {
          docData = docResponse.document
        } else {
          setError('Failed to load document - invalid response structure')
          setLoading(false)
          return
        }

        setDocument(docData)

        // Get signed URL
        try {
          const signedUrlResponse = await apiRequest(`/repository/files/${docId}/signed-url`, {
            authToken: authState?.token,
          })

          if (signedUrlResponse?.data?.signedUrl) {
            setFileUrl(signedUrlResponse.data.signedUrl)
          }
        } catch (err) {
          console.error('Error fetching signed URL:', err)
        }
      } catch (err) {
        setError(err.message || 'Failed to load document')
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [docId, authState?.token])

  // Fetch collaboration data (annotations, rooms)
  const loadAnnotationsAndRooms = async () => {
    if (!docId || !authState?.token) return
    try {
      const annoRes = await fetchAnnotations(docId, authState.token)
      if (annoRes?.success) {
        setAnnotations(annoRes.data || [])
      }

      const roomRes = await fetchReadingRooms(docId, authState.token)
      if (roomRes?.success) {
        setRooms(roomRes.data || [])
      }
    } catch (err) {
      console.error('Failed to load collaborative data:', err)
    }
  }

  useEffect(() => {
    if (docId && authState?.token) {
      loadAnnotationsAndRooms()
    }
  }, [docId, authState?.token])

  // Reading room polling logic
  useEffect(() => {
    if (activeRoom && authState?.token) {
      // 1. Trigger immediately
      const poll = async () => {
        try {
          await sendRoomHeartbeat(activeRoom.id, authState.token)
          const presRes = await fetchRoomPresence(activeRoom.id, authState.token)
          if (presRes?.success) {
            setRoomPresence(presRes.data || [])
          }
          const msgRes = await fetchRoomMessages(activeRoom.id, authState.token)
          if (msgRes?.success) {
            setRoomMessages(msgRes.data || [])
          }
        } catch (err) {
          console.error('Reading room poll failed:', err)
        }
      }
      poll()

      // 2. Set interval to poll every 4 seconds
      pollingIntervalRef.current = setInterval(poll, 4000)
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [activeRoom, authState?.token])

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomMessages])

  const getGoogleDocsViewerUrl = () => {
    if (!fileUrl) return ''
    return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
  }

  // Annotation Actions
  const handleAddAnnotation = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || !sectionRef.trim()) return

    try {
      const res = await createAnnotation({
        documentId: docId,
        sectionRef,
        quotedText,
        commentText,
        highlightColor,
        isPublic
      }, authState.token)

      if (res?.success) {
        setAnnotations(prev => [...prev, res.data])
        setCommentText('')
        setQuotedText('')
        setSectionRef('')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to save annotation: ' + err.message)
    }
  }

  const handleDeleteAnnotation = async (id) => {
    if (!window.confirm('Delete this annotation permanently?')) return
    try {
      const res = await deleteAnnotation(id, authState.token)
      if (res?.success) {
        setAnnotations(prev => prev.filter(a => a.id !== id))
        if (selectedAnnoIdForReplies === id) {
          setSelectedAnnoIdForReplies(null)
        }
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const handleAddReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedAnnoIdForReplies) return

    try {
      const res = await replyToAnnotation(selectedAnnoIdForReplies, replyText, authState.token)
      if (res?.success) {
        setAnnotations(prev => prev.map(anno => {
          if (String(anno.id) === String(selectedAnnoIdForReplies)) {
            return {
              ...anno,
              replies: [...(anno.replies || []), res.data]
            }
          }
          return anno
        }))
        setReplyText('')
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const handleExportAnnotations = (format) => {
    if (!docId || !authState?.token) return
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    const exportUrl = `${baseUrl}/collaboration/documents/${docId}/annotations/export?format=${format}&token=${authState.token}`
    window.open(exportUrl, '_blank')
  }

  // Room Actions
  const handleCreateRoom = async (e) => {
    e.preventDefault()
    if (!newRoomName.trim()) return

    try {
      const res = await createReadingRoom(newRoomName, docId, authState.token)
      if (res?.success) {
        setRooms(prev => [res.data, ...prev])
        setNewRoomName('')
        setActiveRoom(res.data)
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSendChatMessage = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || !activeRoom) return

    try {
      const res = await postRoomMessage(activeRoom.id, chatInput, authState.token)
      if (res?.success) {
        setRoomMessages(prev => [...prev, res.data])
        setChatInput('')
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const handleLeaveRoom = () => {
    setActiveRoom(null)
    setRoomMessages([])
    setRoomPresence([])
    loadAnnotationsAndRooms()
  }

  const getHighlightClass = (color) => {
    switch (color) {
      case 'green': return 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-500'
      case 'blue': return 'bg-blue-100 dark:bg-blue-950/40 border-blue-500'
      case 'pink': return 'bg-pink-100 dark:bg-pink-950/40 border-pink-500'
      default: return 'bg-amber-100 dark:bg-amber-950/40 border-amber-500'
    }
  }

  if (loading) {
    return (
      <section className="mx-auto grid w-full max-w-5xl gap-4 p-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="mx-auto grid w-full max-w-5xl gap-4 p-4">
        <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-600">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-4 p-4">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="grid gap-1">
          <p className="brand-kicker">Document Viewer</p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {document?.title || `Document #${docId}`}
          </h2>
          {document && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
              <span>Format: <strong className="text-foreground">{document.format?.toUpperCase()}</strong></span>
              <span>Category: <strong className="text-foreground">{document.type}</strong></span>
              <span>Version: <strong className="text-foreground">v{document.version}</strong></span>
              <span>Access: <strong className="text-foreground">{document.accessTier}</strong></span>
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          {fileUrl && (
            <Button asChild size="sm" variant="outline" className="gap-2">
              <a href={fileUrl} target="_blank" rel="noreferrer" download>
                <Download className="h-4 w-4" />
                Download File
              </a>
            </Button>
          )}
          {document?.format?.toLowerCase() === 'pdf' && (
            <Button asChild size="sm" variant="outline" className="gap-2">
              <a href={getGoogleDocsViewerUrl()} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Google Preview
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-2">
        {/* Left Side: Document View */}
        <div className="lg:col-span-7 grid gap-4">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-border bg-gradient-to-r from-muted/20 to-transparent">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Preview Area
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1">
              {fileUrl ? (
                <div className="rounded-lg border border-border overflow-hidden bg-muted/10 h-[620px]">
                  <iframe
                    src={getGoogleDocsViewerUrl()}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    title="Document Preview"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                  <p>Unable to load preview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Collaboration Panel */}
        <div className="lg:col-span-5 grid gap-4">
          <Card className="h-[700px] flex flex-col">
            <CardHeader className="pb-2 border-b border-border bg-gradient-to-r from-muted/10 to-transparent">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase tracking-wide">
                  <Share2 className="h-4 w-4 text-accent" />
                  Collaboration Panel
                </CardTitle>

                {/* Tab buttons */}
                <div className="flex bg-muted p-0.5 rounded-lg border border-border/50 text-[11px] font-bold">
                  <button
                    onClick={() => setActiveTab('annotations')}
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                      activeTab === 'annotations'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <MessageSquare size={12} />
                    Annotations
                  </button>
                  <button
                    onClick={() => setActiveTab('rooms')}
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                      activeTab === 'rooms'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Users size={12} />
                    Reading Rooms
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex-1 overflow-hidden flex flex-col">
              {activeTab === 'annotations' ? (
                /* =================== TAB 1: ANNOTATIONS =================== */
                <div className="flex flex-col h-full overflow-hidden">
                  
                  {/* Annotation replies thread overlay mode */}
                  {selectedAnnoIdForReplies ? (
                    <div className="flex flex-col h-full overflow-hidden">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                        <button
                          onClick={() => setSelectedAnnoIdForReplies(null)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-bold"
                        >
                          &larr; Back to all annotations
                        </button>
                        <span className="text-xs font-semibold text-accent">Discussion Thread</span>
                      </div>

                      {/* Parent Annotation details */}
                      {(() => {
                        const parent = annotations.find(a => String(a.id) === String(selectedAnnoIdForReplies))
                        if (!parent) return null
                        return (
                          <div className={`p-3 rounded-lg border-l-4 mb-4 ${getHighlightClass(parent.highlight_color)}`}>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span><strong>{parent.author_name || 'Anonymous'}</strong> ({parent.section_ref})</span>
                            </div>
                            {parent.quoted_text && (
                              <p className="text-xs italic font-medium my-1 border-l border-muted-foreground/30 pl-2">
                                "{parent.quoted_text}"
                              </p>
                            )}
                            <p className="text-xs font-semibold text-foreground mt-1">{parent.comment_text}</p>
                          </div>
                        )
                      })()}

                      {/* Replies List */}
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
                        {(() => {
                          const parent = annotations.find(a => String(a.id) === String(selectedAnnoIdForReplies))
                          const replies = parent?.replies || []
                          if (replies.length === 0) {
                            return <p className="text-xs text-muted-foreground italic text-center py-6">No replies yet. Start the conversation!</p>
                          }
                          return replies.map(r => (
                            <div key={r.id} className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs">
                              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                <span className="font-bold text-foreground">{r.author_name || 'Anonymous'}</span>
                                <span>{new Date(r.created_at).toLocaleTimeString()}</span>
                              </div>
                              <p className="text-foreground leading-relaxed">{r.reply_text}</p>
                            </div>
                          ))
                        })()}
                      </div>

                      {/* Reply form */}
                      <form onSubmit={handleAddReply} className="flex gap-2 pt-2 border-t border-border">
                        <Input
                          placeholder="Write a reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="flex-1 text-xs h-9"
                        />
                        <Button type="submit" size="sm" className="h-9">
                          <Send size={14} />
                        </Button>
                      </form>
                    </div>
                  ) : (
                    /* General Annotations List + Create form */
                    <div className="flex flex-col h-full overflow-hidden">
                      
                      {/* Export options */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                        <span className="text-xs text-muted-foreground">Export format:</span>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 py-0" onClick={() => handleExportAnnotations('txt')}>
                            <ArrowDownToLine size={10} /> TXT
                          </Button>
                          <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 py-0" onClick={() => handleExportAnnotations('md')}>
                            <ArrowDownToLine size={10} /> Markdown
                          </Button>
                          <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 py-0" onClick={() => handleExportAnnotations('html')}>
                            <ArrowDownToLine size={10} /> HTML
                          </Button>
                        </div>
                      </div>

                      {/* Scrollable Annotations List */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
                        {annotations.length === 0 ? (
                          <div className="text-center py-10 text-muted-foreground">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                            <p className="text-xs italic">No annotations yet. Add one below!</p>
                          </div>
                        ) : (
                          annotations.map(anno => (
                            <div
                              key={anno.id}
                              className={`p-3 rounded-lg border-l-4 shadow-sm relative group transition-all hover:shadow-md ${getHighlightClass(anno.highlight_color)}`}
                            >
                              <div className="flex justify-between items-start text-[10px] text-muted-foreground">
                                <span className="font-bold text-foreground/80 flex items-center gap-1">
                                  {anno.author_name || 'Anonymous'}
                                  <span className="font-normal">({anno.section_ref})</span>
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {anno.is_public ? (
                                    <Globe size={11} title="Public" className="text-muted-foreground" />
                                  ) : (
                                    <Lock size={11} title="Private (Only you)" className="text-amber-600" />
                                  )}
                                  {(anno.user_id === authState?.userId || authState?.role === 'ADMIN') && (
                                    <button
                                      onClick={() => handleDeleteAnnotation(anno.id)}
                                      className="text-muted-foreground hover:text-red-500 transition-colors"
                                      title="Delete Annotation"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {anno.quoted_text && (
                                <p className="text-xs italic font-medium my-1.5 border-l-2 border-muted-foreground/30 pl-2 text-foreground/70">
                                  "{anno.quoted_text}"
                                </p>
                              )}

                              <p className="text-xs text-foreground font-semibold mt-1">
                                {anno.comment_text}
                              </p>

                              {/* Replies count and thread button */}
                              <div className="mt-2 pt-2 border-t border-muted-foreground/10 flex justify-between items-center">
                                <span className="text-[10px] text-muted-foreground">
                                  {anno.replies?.length || 0} discussion replies
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[10px] px-2 py-0 text-accent font-bold"
                                  onClick={() => setSelectedAnnoIdForReplies(anno.id)}
                                >
                                  <MessageSquare size={10} className="mr-1" />
                                  Discuss
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Create Annotation Form */}
                      <form onSubmit={handleAddAnnotation} className="p-3 border border-border rounded-lg bg-muted/20 grid gap-2">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Input
                              placeholder="e.g. Page 2, Paragraph 1"
                              value={sectionRef}
                              onChange={(e) => setSectionRef(e.target.value)}
                              className="text-xs h-8"
                              required
                            />
                          </div>
                          <div>
                            <Select
                              value={highlightColor}
                              onChange={(e) => setHighlightColor(e.target.value)}
                              className="text-xs h-8 px-2 py-0 w-24"
                            >
                              <option value="yellow">💛 Yellow</option>
                              <option value="green">💚 Green</option>
                              <option value="blue">💙 Blue</option>
                              <option value="pink">💗 Pink</option>
                            </Select>
                          </div>
                        </div>

                        <Input
                          placeholder="Quoted/highlighted text (optional)"
                          value={quotedText}
                          onChange={(e) => setQuotedText(e.target.value)}
                          className="text-xs h-8"
                        />

                        <Input
                          placeholder="Annotation comment or question..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="text-xs h-8"
                          required
                        />

                        <div className="flex items-center justify-between mt-1">
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isPublic}
                              onChange={(e) => setIsPublic(e.target.checked)}
                              className="rounded border-border"
                            />
                            Share with others (Public)
                          </label>
                          <Button type="submit" size="sm" className="h-7 px-3 text-[11px] font-bold">
                            <Plus size={12} className="mr-1" /> Add Note
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              ) : (
                /* =================== TAB 2: READING ROOMS =================== */
                <div className="flex flex-col h-full overflow-hidden">
                  {activeRoom ? (
                    /* Active Joined Virtual Room */
                    <div className="flex flex-col h-full overflow-hidden">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border bg-gradient-to-r from-emerald-500/5 to-transparent p-2 rounded-lg">
                        <div className="grid">
                          <h4 className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <Users size={12} /> {activeRoom.name}
                          </h4>
                          <span className="text-[9px] text-muted-foreground">Host: {activeRoom.host_name || 'Anonymous'}</span>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-red-500 border-red-500/20 hover:bg-red-500/10" onClick={handleLeaveRoom}>
                          <LogOut size={11} className="mr-1" /> Leave
                        </Button>
                      </div>

                      {/* Split area: upper is messages log, side is presence */}
                      <div className="flex-1 grid grid-cols-4 gap-3 overflow-hidden mb-3">
                        {/* Messages Area - 3 cols */}
                        <div className="col-span-3 border border-border rounded-lg p-2.5 flex flex-col overflow-hidden bg-card">
                          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                            {roomMessages.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground italic text-center py-10">Room is quiet. Say hello!</p>
                            ) : (
                              roomMessages.map(msg => (
                                <div key={msg.id} className="text-[11px] leading-relaxed">
                                  <div className="flex items-baseline gap-1 text-[9px] text-muted-foreground">
                                    <strong className="text-foreground">{msg.author_name || 'Anonymous'}</strong>
                                    <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                                  </div>
                                  <p className="bg-muted/40 p-1.5 rounded mt-0.5">{msg.message_text}</p>
                                </div>
                              ))
                            )}
                            <div ref={chatEndRef} />
                          </div>
                        </div>

                        {/* Presence Area - 1 col */}
                        <div className="col-span-1 border border-border rounded-lg p-2 flex flex-col overflow-hidden bg-muted/10">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-1">
                            Online
                          </span>
                          <div className="flex-1 overflow-y-auto space-y-1.5">
                            {roomPresence.map(p => (
                              <div key={p.id} className="flex items-center gap-1 text-[10px] truncate" title={p.user_name || p.user_email}>
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                                <span className="truncate font-medium text-foreground">{p.user_name || 'User'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Chat message input */}
                      <form onSubmit={handleSendChatMessage} className="flex gap-2">
                        <Input
                          placeholder="Type message..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          className="flex-1 text-xs h-9"
                        />
                        <Button type="submit" size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-600/90 text-white border-none">
                          <Send size={13} />
                        </Button>
                      </form>
                    </div>
                  ) : (
                    /* Rooms Selection & Creation */
                    <div className="flex flex-col h-full overflow-hidden">
                      
                      {/* Create Room Form */}
                      <form onSubmit={handleCreateRoom} className="p-3 border border-border rounded-lg bg-muted/20 flex gap-2 mb-3">
                        <Input
                          placeholder="Room Name (e.g. Study Group A)"
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                          className="flex-1 text-xs h-8"
                          required
                        />
                        <Button type="submit" size="sm" className="h-8 px-3 font-bold bg-emerald-600 hover:bg-emerald-600/90 text-white border-none shrink-0">
                          Create Room
                        </Button>
                      </form>

                      {/* Rooms List */}
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Active Rooms
                      </span>
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {rooms.length === 0 ? (
                          <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-lg bg-card">
                            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                            <p className="text-xs italic">No study rooms created yet.</p>
                          </div>
                        ) : (
                          rooms.map(room => (
                            <div
                              key={room.id}
                              className="p-3 rounded-lg border border-border bg-card flex items-center justify-between hover:bg-muted/10 transition-colors shadow-sm"
                            >
                              <div className="grid min-w-0">
                                <h4 className="text-xs font-bold text-foreground truncate">{room.name}</h4>
                                <p className="text-[9px] text-muted-foreground truncate">Hosted by: {room.host_name || 'Anonymous'}</p>
                              </div>
                              <Button
                                size="sm"
                                className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-600/90 text-white border-none px-3 font-bold"
                                onClick={() => setActiveRoom(room)}
                              >
                                Join
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
