import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
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
        background: '#fef2f2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        border: '1px solid #fecaca',
      }}>
        🔒
      </div>
      <div style={{ display: 'grid', gap: '8px', maxWidth: '400px' }}>
        <p style={{ fontSize: '.8rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'hsl(var(--destructive))' }}>
          403 — Unauthorized
        </p>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          Access denied
        </h2>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6, fontSize: '.9rem' }}>
          You don't have permission to view this page. Contact an administrator if you believe this is an error.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/dashboard">Return to Dashboard</Link>
      </Button>
    </div>
  )
}
