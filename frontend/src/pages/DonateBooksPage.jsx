import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { submitBookDonation } from '../services/api/library.js'
import { Heart, Loader2, Plus, Trash2, CheckCircle2, ClipboardCopy } from 'lucide-react'

const AFFILIATION_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'ALUMNI', label: 'Alumni' },
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'STUDENT', label: 'Current student' },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'PUBLIC', label: 'General public' },
]

const DELIVERY_OPTIONS = [
  { value: 'DROP_OFF', label: "I'll drop the books off at the library" },
  { value: 'PICKUP_REQUESTED', label: "I'd like the library to arrange a pickup" },
]

const emptyBook = () => ({ title: '', authors: '', isbn: '', quantity: '1', conditionNotes: '' })

const emptyDonorForm = {
  donorName: '',
  donorEmail: '',
  donorPhone: '',
  donorAffiliation: '',
  deliveryMethod: 'DROP_OFF',
  notes: '',
}

export default function DonateBooksPage() {
  const [form, setForm] = useState(emptyDonorForm)
  const [books, setBooks] = useState([emptyBook()])
  const [website, setWebsite] = useState('') // honeypot — must stay empty
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleBookChange = (index, field, value) => {
    setBooks((current) => current.map((book, i) => (i === index ? { ...book, [field]: value } : book)))
  }

  const addBook = () => setBooks((current) => [...current, emptyBook()])
  const removeBook = (index) => setBooks((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.donorName.trim() || !form.donorEmail.trim()) {
      setError('Please provide your name and email address.')
      return
    }

    const validBooks = books.filter((book) => book.title.trim())
    if (validBooks.length === 0) {
      setError('Add at least one book with a title.')
      return
    }

    try {
      setSubmitting(true)
      const response = await submitBookDonation({
        donorName: form.donorName.trim(),
        donorEmail: form.donorEmail.trim(),
        donorPhone: form.donorPhone.trim() || undefined,
        donorAffiliation: form.donorAffiliation || undefined,
        deliveryMethod: form.deliveryMethod,
        notes: form.notes.trim() || undefined,
        website,
        items: validBooks.map((book) => ({
          title: book.title.trim(),
          authors: book.authors.trim() || undefined,
          isbn: book.isbn.trim() || undefined,
          quantity: Number(book.quantity) || 1,
          conditionNotes: book.conditionNotes.trim() || undefined,
        })),
      })

      const donation = response?.data?.donation
      setResult(donation || { reference_code: null })
      setForm(emptyDonorForm)
      setBooks([emptyBook()])
    } catch (err) {
      setError(err.message || 'Failed to submit your donation offer. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const copyReferenceCode = () => {
    if (result?.reference_code) {
      navigator.clipboard?.writeText(result.reference_code).catch(() => {})
    }
  }

  if (result) {
    return (
      <section className="mx-auto grid w-full max-w-xl gap-4">
        <Card>
          <CardContent className="grid gap-4 pt-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div className="grid gap-1.5">
              <h2 className="text-xl font-bold text-foreground">Thank you for your donation offer!</h2>
              <p className="text-sm text-muted-foreground">
                A librarian will review it soon. Save your reference code to check the status anytime.
              </p>
            </div>

            {result.reference_code && (
              <div className="mx-auto flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-2.5">
                <strong className="font-mono text-lg tracking-wide text-foreground">{result.reference_code}</strong>
                <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={copyReferenceCode}>
                  <ClipboardCopy size={13} /> Copy
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild size="sm">
                <Link to="/donate-books/track">Track this donation</Link>
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setResult(null)}>
                Offer more books
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="mx-auto grid w-full max-w-2xl gap-4">
      <div className="grid gap-1.5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[hsl(var(--primary))]">
          <Heart size={14} /> Support the library
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Donate books</h2>
        <p className="text-sm text-muted-foreground">
          Alumni, faculty, and friends of the department are welcome to donate books to the physical library.
          Tell us what you'd like to give — no account needed — and a librarian will follow up with you.
        </p>
        <Link to="/donate-books/track" className="w-fit text-xs font-semibold text-[hsl(var(--primary))] hover:underline">
          Already offered books? Track your donation &rarr;
        </Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {/* Honeypot — hidden from real users, bots tend to fill every field */}
            <div className="hidden" aria-hidden="true">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="donorName">Full name *</Label>
                <Input id="donorName" name="donorName" value={form.donorName} onChange={handleChange} placeholder="Your name" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="donorEmail">Email *</Label>
                <Input id="donorEmail" name="donorEmail" type="email" value={form.donorEmail} onChange={handleChange} placeholder="you@example.com" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="donorPhone">Phone (optional)</Label>
                <Input id="donorPhone" name="donorPhone" value={form.donorPhone} onChange={handleChange} placeholder="+880…" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="donorAffiliation">I am a...</Label>
                <Select id="donorAffiliation" name="donorAffiliation" value={form.donorAffiliation} onChange={handleChange}>
                  {AFFILIATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="deliveryMethod">How will the books get to us?</Label>
              <Select id="deliveryMethod" name="deliveryMethod" value={form.deliveryMethod} onChange={handleChange}>
                {DELIVERY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="notes">Anything else we should know? (optional)</Label>
              <Textarea id="notes" name="notes" rows={2} value={form.notes} onChange={handleChange} placeholder="e.g. Preferred drop-off times" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Books you'd like to donate</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {books.map((book, index) => (
              <div key={index} className="grid gap-2.5 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Book {index + 1}</span>
                  {books.length > 1 && (
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:bg-red-500/10" onClick={() => removeBook(index)}>
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input placeholder="Title *" value={book.title} onChange={(e) => handleBookChange(index, 'title', e.target.value)} className="text-sm" />
                  <Input placeholder="Author(s)" value={book.authors} onChange={(e) => handleBookChange(index, 'authors', e.target.value)} className="text-sm" />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input placeholder="ISBN (optional)" value={book.isbn} onChange={(e) => handleBookChange(index, 'isbn', e.target.value)} className="text-sm" />
                  <Input type="number" min="1" placeholder="Quantity" value={book.quantity} onChange={(e) => handleBookChange(index, 'quantity', e.target.value)} className="text-sm" />
                  <Input placeholder="Condition (e.g. Good)" value={book.conditionNotes} onChange={(e) => handleBookChange(index, 'conditionNotes', e.target.value)} className="text-sm" />
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5" onClick={addBook}>
              <Plus size={13} /> Add another book
            </Button>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={submitting} className="w-fit gap-1.5">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} />}
          {submitting ? 'Submitting...' : 'Submit donation offer'}
        </Button>
      </form>
    </section>
  )
}
