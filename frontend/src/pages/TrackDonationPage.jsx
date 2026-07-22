import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { trackBookDonation } from '../services/api/library.js'
import { Search, Loader2, BookOpen } from 'lucide-react'

const STATUS_BADGES = {
  SUBMITTED: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  ACCEPTED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  DECLINED: 'bg-red-500/10 text-red-600 border-red-500/20',
  RECEIVED: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  CANCELLED: 'bg-muted text-muted-foreground border-border',
}

const STATUS_COPY = {
  SUBMITTED: 'Your offer is waiting for a librarian to review it.',
  ACCEPTED: "Your offer was accepted — please bring or send the books to the library if you haven't already.",
  DECLINED: 'This donation offer was declined.',
  RECEIVED: "We've received your books and are deciding which ones to add to the collection.",
  COMPLETED: 'This donation is complete — thank you!',
  CANCELLED: 'This donation was cancelled.',
}

const ITEM_DECISION_LABEL = {
  PENDING: 'Awaiting decision',
  WANTED: 'Wanted — being cataloged',
  NOT_NEEDED: 'Not needed for the collection',
  CATALOGED: 'Added to the library!',
}

export default function TrackDonationPage() {
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [donation, setDonation] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setDonation(null)

    if (!code.trim() || !email.trim()) {
      setError('Enter your reference code and the email you used to submit the offer.')
      return
    }

    try {
      setLoading(true)
      const response = await trackBookDonation(code.trim(), email.trim())
      setDonation(response?.data?.donation || null)
    } catch (err) {
      setError(err.message || 'No donation matched that code and email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-xl gap-4">
      <div className="grid gap-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">Track your donation</h2>
        <p className="text-sm text-muted-foreground">
          Enter the reference code you received and your email address to check the status.
        </p>
        <Link to="/donate-books" className="w-fit text-xs font-semibold text-[hsl(var(--primary))] hover:underline">
          &larr; Offer more books
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="code">Reference code</Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="DON-7F3K9Q" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <Button type="submit" disabled={loading} className="gap-1.5">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              {loading ? 'Looking up...' : 'Track'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && <Alert variant="error">{error}</Alert>}

      {donation && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Donation {donation.reference_code}</CardTitle>
              <Badge className={`border text-[10px] font-bold uppercase ${STATUS_BADGES[donation.status] || ''}`}>
                {donation.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">{STATUS_COPY[donation.status] || ''}</p>

            {donation.staff_note && (
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Note from the library</span>
                <p className="mt-1 text-foreground">{donation.staff_note}</p>
              </div>
            )}

            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Books offered</span>
              {(donation.items || []).map((item) => (
                <div key={item.id} className="flex items-start gap-2 rounded-lg border border-border p-2.5">
                  <BookOpen size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="grid gap-0.5 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                    {item.authors && <p className="text-xs text-muted-foreground">{item.authors}</p>}
                    <p className="text-xs font-medium text-[hsl(var(--primary))]">
                      {ITEM_DECISION_LABEL[item.decision] || item.decision}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
