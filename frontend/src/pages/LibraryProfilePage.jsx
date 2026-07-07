import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '../app/use-auth.js'
import LibraryMemberTabs from '../components/library/LibraryMemberTabs.jsx'
import { 
  User, 
  Mail, 
  Building, 
  Calendar, 
  Shield, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Send,
  UserCheck,
  Settings
} from 'lucide-react'

export default function LibraryProfilePage() {
  const { authState, login } = useAuth()

  // Form states
  const [profileName, setProfileName] = useState(authState.name || '')
  const [profileEmail, setProfileEmail] = useState(authState.email || 'scholar@csedu.ac.bd')
  const [profileDept, setProfileDept] = useState('Computer Science & Engineering')
  const [profileBio, setProfileBio] = useState('Undergraduate research student working on machine learning applications in computer vision.')

  // Role Request states
  const [requestedRole, setRequestedRole] = useState('CONTRIBUTOR')
  const [requestReason, setRequestReason] = useState('')
  const [roleRequests, setRoleRequests] = useState(() => {
    const saved = localStorage.getItem('dkp_role_requests')
    return saved ? JSON.parse(saved) : [
      {
        id: 'mock-1',
        requestedRole: 'CONTRIBUTOR',
        reason: 'Need access to publish lecture slides and lab manuals for the CSE-201 course.',
        status: 'Approved',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  })

  // Sync role requests to localStorage
  useEffect(() => {
    localStorage.setItem('dkp_role_requests', JSON.stringify(roleRequests))
  }, [roleRequests])

  const avatarLabel = (profileName || 'U').trim().charAt(0).toUpperCase()

  const handleProfileUpdate = (e) => {
    e.preventDefault()
    login({
      ...authState,
      name: profileName,
    })
    alert('Profile updated successfully!')
  }

  const handleRoleRequestSubmit = (e) => {
    e.preventDefault()
    if (!requestReason.trim()) {
      alert('Please provide a justification for this role request.')
      return
    }

    const newRequest = {
      id: `req-${Date.now()}`,
      requestedRole,
      reason: requestReason.trim(),
      status: 'Pending',
      createdAt: new Date().toISOString()
    }

    setRoleRequests(prev => [newRequest, ...prev])
    setRequestReason('')
    alert('Role upgrade request submitted to administrator!')
  }

  // Simulate administrator approval/rejection for testing
  const simulateAdminDecision = (id, decision) => {
    setRoleRequests(prev => prev.map(req => {
      if (req.id === id) {
        const nextStatus = decision === 'approve' ? 'Approved' : 'Rejected'
        
        // If approved, update user's session role in state and session storage
        if (decision === 'approve') {
          login({
            role: req.requestedRole,
            name: authState.name,
            token: authState.token,
            refreshToken: authState.refreshToken,
            expiresAt: authState.expiresAt
          })
        }
        
        return { ...req, status: nextStatus }
      }
      return req
    }))
  }

  const resolveStatusBadge = (status) => {
    if (status === 'Approved') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    if (status === 'Rejected') return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-2">
      
      {/* Page Header */}
      <div className="border-b border-border pb-3 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground">My Profile</h2>
          <p className="text-xs text-muted-foreground">Manage your account information, workspace preferences, and roles.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        
        {/* Left Side: Avatar and Account Card */}
        <div className="grid gap-6 self-start">
          <Card className="border-border overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-accent/30 to-accent/10 relative" />
            <CardContent className="p-5 pt-0 relative flex flex-col items-center text-center">
              
              {/* Avatar circle */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent/80 text-white font-extrabold text-3xl border-4 border-card flex items-center justify-center -mt-10 shadow-md">
                {avatarLabel}
              </div>

              <div className="mt-3 grid gap-1">
                <h3 className="font-bold text-sm text-foreground">{profileName}</h3>
                <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5 px-2.5 mx-auto bg-accent/5 text-accent border-accent/20">
                  {authState.role}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground mt-4 leading-relaxed italic">
                "{profileBio}"
              </p>

              <div className="w-full border-t border-border/60 my-4 pt-4 text-xs text-left grid gap-2.5 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-accent" />
                  <span className="truncate">{profileEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building size={13} className="text-accent" />
                  <span>CSE Department</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-accent" />
                  <span>Joined June 2026</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Profile Details & Role requests */}
        <div className="grid gap-6">
          
          {/* Profile Details Form */}
          <Card className="border-border">
            <CardHeader className="p-5 border-b border-border bg-gradient-to-r from-muted/20 to-transparent">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <User size={15} className="text-accent" />
                Personal Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleProfileUpdate} className="grid gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="prof-name" className="text-xs font-semibold">Full Name</Label>
                    <Input id="prof-name" value={profileName} onChange={e => setProfileName(e.target.value)} required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="prof-email" className="text-xs font-semibold">Institutional Email</Label>
                    <Input id="prof-email" type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} required />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="prof-dept" className="text-xs font-semibold">Department / Affiliation</Label>
                  <Input id="prof-dept" value={profileDept} onChange={e => setProfileDept(e.target.value)} />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="prof-bio" className="text-xs font-semibold">Short Bio</Label>
                  <Textarea id="prof-bio" rows={3} value={profileBio} onChange={e => setProfileBio(e.target.value)}
                    className="resize-none" />
                </div>

                <Button type="submit" size="sm" className="w-fit ml-auto text-xs bg-accent hover:bg-accent/90 text-white">
                  Save Changes
                </Button>
              </form>
            </CardContent>
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

                <Button type="submit" size="sm" className="w-fit ml-auto gap-1 text-xs bg-accent hover:bg-accent/90 text-white">
                  <Send size={12} /> Submit Request
                </Button>
              </form>

              {/* Request history status list */}
              <div className="border-t border-border/60 pt-5 grid gap-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <UserCheck size={12} /> Upgrade History & Status
                </h4>

                <div className="grid gap-3">
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

                      {/* Administrative actions simulator */}
                      {req.status === 'Pending' && (
                        <div className="flex gap-2 items-center justify-end border-t border-dashed border-border/60 pt-2.5 mt-1">
                          <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-0.5">
                            <Settings size={10} /> Test Administrator:
                          </span>
                          <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10 font-bold"
                            onClick={() => simulateAdminDecision(req.id, 'approve')}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 text-red-600 border-red-500/20 hover:bg-red-500/10 font-bold"
                            onClick={() => simulateAdminDecision(req.id, 'reject')}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </CardContent>
          </Card>

        </div>

      </div>

      {/* ── Library Activity: Loans, History, Fines, Holds ─────── */}
      <div className="border-t border-border pt-6">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-foreground">Library Activity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your active loans, borrowing history, fines, and hold requests.
          </p>
        </div>
        <LibraryMemberTabs />
      </div>

    </div>
  )
}
