import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100svh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: 'hsl(var(--background))',
      textAlign: 'center',
      gap: '24px',
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '20px',
        background: 'var(--accent-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        border: '1px solid var(--accent-soft)',
      }}>
        🔍
      </div>
      <div style={{ display: 'grid', gap: '8px', maxWidth: '400px' }}>
        <p style={{ fontSize: '.8rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>
          404 — Not Found
        </p>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          Page doesn't exist
        </h2>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6, fontSize: '.9rem' }}>
          The route you requested doesn't exist or may have been moved.
        </p>
      </div>
      <Button asChild>
        <Link to="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  )
}
