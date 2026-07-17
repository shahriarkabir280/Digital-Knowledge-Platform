import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '../app/use-auth.js'
import { getMyProfile, updateMyProfile, uploadAvatar } from '../services/api/profile.js'
import { submitRoleRequest, fetchMyRoleRequests } from '../services/api/roleRequests.js'
import { circulationErrorMessage } from '../services/api/errorMessages.js'
import { toast } from 'sonner'
import {
  Mail,
  Building,
  Phone,
  Shield,
  FileText,
  Briefcase,
  Code2,
  GraduationCap,
  Globe,
  Camera,
  Pencil,
  Save,
  X,
  Loader2,
  Send,
  UserCheck,
  ExternalLink,
  Calendar,
} from 'lucide-react'

const EDITABLE_FIELDS = ['name', 'bio', 'department', 'phone', 'cv_url', 'linkedin_url', 'github_url', 'google_scholar_url', 'website_url']

const EMPTY_FORM = {
  name: '', bio: '', department: '', phone: '',
  cv_url: '', linkedin_url: '', github_url: '', google_scholar_url: '', website_url: '',
}

function formToProfile(profile) {
  const form = { ...EMPTY_FORM }
  for (const key of EDITABLE_FIELDS) {
    form[key] = profile?.[key] || ''
  }
  return form
}

const LINK_FIELDS = [
  { key: 'cv_url', label: 'CV / Resume', icon: FileText },
  { key: 'linkedin_url', label: 'LinkedIn', icon: Briefcase },
  { key: 'github_url', label: 'GitHub', icon: Code2 },
  { key: 'google_scholar_url', label: 'Google Scholar', icon: GraduationCap },
  { key: 'website_url', label: 'Personal Website / Social', icon: Globe },
]

export default function LibraryProfilePage() {
  const { authState, login } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['my-profile'],
    queryFn: getMyProfile,
  })

  useEffect(() => {
    if (profile && !isEditing) setForm(formToProfile(profile))
  }, [profile, isEditing])

  const updateMutation = useMutation({
    mutationFn: (data) => updateMyProfile(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['my-profile'], updated)
      if (updated.name && updated.name !== authState.name) {
        login({ ...authState, name: updated.name })
      }
      toast.success('Profile updated successfully.')
      setIsEditing(false)
    },
    onError: (err) => toast.error(circulationErrorMessage(err, 'Could not save changes.')),
  })

  const avatarMutation = useMutation({
    mutationFn: (file) => uploadAvatar(file),
    onSuccess: (updated) => {
      queryClient.setQueryData(['my-profile'], updated)
      toast.success('Profile picture updated.')
    },
    onError: (err) => toast.error(err.message || 'Could not upload image.'),
  })

  // ── Role Request state ──────────────────────────────────────────
  const [requestedRole, setRequestedRole] = useState('CONTRIBUTOR')
  const [requestReason, setRequestReason] = useState('')
  const [roleRequests, setRoleRequests] = useState([])
  const [submittingRequest, setSubmittingRequest] = useState(false)

  const loadRoleRequests = async () => {
    if (!authState.token) return
    try {
      const items = await fetchMyRoleRequests(authState.token)
      setRoleRequests(items)
    } catch {
      // keep current list on failure
    }
  }

  useEffect(() => {
    loadRoleRequests()
  }, [authState.token])

  const avatarLabel = (profile?.name || authState.name || 'U').trim().charAt(0).toUpperCase()

  const startEditing = () => {
    setForm(formToProfile(profile))
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setForm(formToProfile(profile))
    setIsEditing(false)
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name cannot be empty.')
      return
    }
    updateMutation.mutate(form)
  }

  const handleAvatarClick = () => {
    if (!avatarMutation.isPending) fileInputRef.current?.click()
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.')
      return
    }
    avatarMutation.mutate(file)
  }

  const handleRoleRequestSubmit = async (e) => {
    e.preventDefault()
    if (!requestReason.trim()) {
      toast.error('Please provide a justification for this role request.')
      return
    }

    try {
      setSubmittingRequest(true)
      await submitRoleRequest({
        authToken: authState.token,
        requestedRole,
        reason: requestReason.trim(),
      })
      setRequestReason('')
      await loadRoleRequests()
      toast.success('Role upgrade request submitted to administrator!')
    } catch (error) {
      toast.error(error.message || 'Failed to submit role request.')
    } finally {
      setSubmittingRequest(false)
    }
  }

  const resolveStatusBadge = (status) => {
    if (status === 'APPROVED') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    if (status === 'REJECTED') return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  }

  if (isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-2 min-h-[50vh] place-items-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-2 min-h-[50vh] place-items-center text-center">
        <p className="text-sm font-semibold text-foreground">Could not load your profile.</p>
        <p className="text-xs text-muted-foreground">Please refresh the page and try again.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-2">

      {/* Page Header */}
      <div className="border-b border-border pb-3">
        <h2 className="text-xl font-bold text-foreground">My Profile</h2>
        <p className="text-xs text-muted-foreground">Manage your personal information, links, and account roles.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">

        {/* Left: Avatar + identity card */}
        <div className="grid gap-6 self-start">
          <Card className="border-border overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-accent/30 to-accent/10 relative" />
            <CardContent className="p-5 pt-0 relative flex flex-col items-center text-center">

              {/* Avatar with upload overlay */}
              <div className="relative -mt-10 group">
                <Avatar className="h-20 w-20 border-4 border-card shadow-md">
                  {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.name} />}
                  <AvatarFallback className="bg-gradient-to-br from-accent to-accent/80 text-white font-extrabold text-2xl">
                    {avatarLabel}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={avatarMutation.isPending}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white"
                  title="Change profile picture"
                >
                  {avatarMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>

              <div className="mt-3 grid gap-1">
                <h3 className="font-bold text-sm text-foreground">{profile.name}</h3>
                <Badge variant="outline" className="text-[11px] uppercase font-bold py-0.5 px-2.5 mx-auto bg-accent/5 text-accent border-accent/20">
                  {profile.role}
                </Badge>
              </div>

              {profile.bio && (
                <p className="text-xs text-muted-foreground mt-4 leading-relaxed italic">
                  "{profile.bio}"
                </p>
              )}

              <div className="w-full border-t border-border/60 my-4 pt-4 text-xs text-left grid gap-2.5 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-accent shrink-0" />
                  <span className="truncate" title={profile.email}>{profile.email}</span>
                </div>
                {profile.department && (
                  <div className="flex items-center gap-2">
                    <Building size={13} className="text-accent shrink-0" />
                    <span className="truncate">{profile.department}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-accent shrink-0" />
                    <span className="truncate">{profile.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-accent shrink-0" />
                  <span>Joined {new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>

              {!isEditing && (
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={startEditing}>
                  <Pencil size={12} /> Edit Profile
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Personal info / links (view or edit) + Role request */}
        <div className="grid gap-6">

          <Card className="border-border">
            <CardHeader className="p-5 border-b border-border bg-gradient-to-r from-muted/20 to-transparent flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <UserCheck size={15} className="text-accent" />
                Personal Information
              </CardTitle>
              {isEditing && (
                <Badge variant="outline" className="text-[10px] font-semibold uppercase">Editing</Badge>
              )}
            </CardHeader>

            {isEditing ? (
              <CardContent className="p-5">
                <form onSubmit={handleSave} className="grid gap-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label htmlFor="prof-name" className="text-xs font-semibold">Full Name</Label>
                      <Input id="prof-name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="prof-dept" className="text-xs font-semibold">Department</Label>
                      <Input id="prof-dept" placeholder="e.g. Computer Science & Engineering" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-semibold">Institutional Email</Label>
                      <Input value={profile.email} disabled className="opacity-70" />
                      <p className="text-[10px] text-muted-foreground">The email you signed up with — cannot be changed here.</p>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="prof-phone" className="text-xs font-semibold">Phone</Label>
                      <Input id="prof-phone" placeholder="+880 1XXX-XXXXXX" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="prof-bio" className="text-xs font-semibold">Short Bio</Label>
                    <Textarea id="prof-bio" rows={3} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                      placeholder="A sentence or two about your research interests or role." className="resize-none" />
                  </div>

                  <div className="border-t border-border/60 pt-4 grid gap-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Links</h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {LINK_FIELDS.map(({ key, label, icon: Icon }) => (
                        <div key={key} className="grid gap-1.5">
                          <Label htmlFor={`prof-${key}`} className="text-xs font-semibold flex items-center gap-1.5">
                            <Icon size={12} className="text-accent" /> {label}
                          </Label>
                          <Input id={`prof-${key}`} type="url" placeholder="https://…" value={form[key]}
                            onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs" onClick={cancelEditing} disabled={updateMutation.isPending}>
                      <X size={13} /> Cancel
                    </Button>
                    <Button type="submit" size="sm" className="gap-1.5 text-xs bg-accent hover:bg-accent/90 text-white" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            ) : (
              <CardContent className="p-5 grid gap-5">
                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div className="grid gap-0.5">
                    <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wide">Email</span>
                    <span className="text-foreground font-medium">{profile.email}</span>
                  </div>
                  <div className="grid gap-0.5">
                    <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wide">Department</span>
                    <span className="text-foreground font-medium">{profile.department || <span className="text-muted-foreground italic">Not set</span>}</span>
                  </div>
                  <div className="grid gap-0.5">
                    <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wide">Phone</span>
                    <span className="text-foreground font-medium">{profile.phone || <span className="text-muted-foreground italic">Not set</span>}</span>
                  </div>
                  <div className="grid gap-0.5">
                    <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wide">Role</span>
                    <span className="text-foreground font-medium flex items-center gap-1"><Shield size={12} className="text-accent" /> {profile.role}</span>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-4 grid gap-2.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Links</h4>
                  {LINK_FIELDS.every(({ key }) => !profile[key]) ? (
                    <p className="text-xs text-muted-foreground italic">No links added yet — click Edit Profile to add your CV, LinkedIn, GitHub, or Google Scholar.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {LINK_FIELDS.filter(({ key }) => profile[key]).map(({ key, label, icon: Icon }) => (
                        <a key={key} href={profile[key]} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-muted/20 hover:bg-accent/10 hover:border-accent/30 hover:text-accent transition-colors">
                          <Icon size={13} /> {label} <ExternalLink size={10} className="opacity-50" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Role Request upgrade Form */}
          <Card className="border-border">
            <CardHeader className="p-5 border-b border-border bg-gradient-to-r from-muted/20 to-transparent">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Shield size={15} className="text-accent" />
                Request Role Upgrade
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid gap-5">

              <form onSubmit={handleRoleRequestSubmit} className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="req-role-select" className="text-xs font-semibold">Desired Workspace Role</Label>
                  <Select id="req-role-select" value={requestedRole} onChange={e => setRequestedRole(e.target.value)}>
                    <option value="CONTRIBUTOR">Contributor (Ability to upload resource cards directly)</option>
                    <option value="REVIEWER">Technical Reviewer (Access to Review queue desk)</option>
                    <option value="STAFF">Operations Staff (Manage circulations & operational tasks)</option>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="req-reason" className="text-xs font-semibold">Justification / Purpose</Label>
                  <Textarea id="req-reason" placeholder="Explain why you require this role upgrade (e.g. course assignments, course supervisor verification, reviewer credentials)..." rows={3}
                    value={requestReason} onChange={e => setRequestReason(e.target.value)} required />
                </div>

                <Button type="submit" size="sm" disabled={submittingRequest} className="w-fit ml-auto gap-1 text-xs bg-accent hover:bg-accent/90 text-white">
                  <Send size={12} /> {submittingRequest ? 'Submitting...' : 'Submit Request'}
                </Button>
              </form>

              {/* Request history status list */}
              <div className="border-t border-border/60 pt-5 grid gap-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <UserCheck size={12} /> Upgrade History & Status
                </h4>

                <div className="grid gap-3">
                  {roleRequests.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No role upgrade requests yet.</p>
                  )}
                  {roleRequests.map((req) => (
                    <div key={req.id} className="p-4 rounded-xl border border-border bg-muted/10 grid gap-2.5">
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <div className="grid gap-0.5">
                          <span className="text-[10px] text-muted-foreground">Requested: {new Date(req.createdAt).toLocaleDateString()}</span>
                          <h5 className="text-xs font-bold text-foreground">Requested Role: <Badge variant="outline" className="text-[10px] bg-background font-bold">{req.requestedRole}</Badge></h5>
                        </div>
                        <Badge className={`text-[10px] px-2.5 py-0.5 border font-semibold uppercase ${resolveStatusBadge(req.status)}`}>
                          {req.status}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground bg-background p-2.5 rounded-lg border border-border/40">
                        {req.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  )
}
