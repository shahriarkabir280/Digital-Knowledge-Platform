import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '../app/use-auth.js'
import { apiRequest } from '../services/api/client'
import { ExternalLink, Loader2, AlertCircle, Download, FileText } from 'lucide-react'

export default function ViewerPage() {
  const { docId } = useParams()
  const { authState } = useAuth()
  const [document, setDocument] = useState(null)
  const [fileUrl, setFileUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
        
        console.log('Document response:', docResponse)
        console.log('Document ID:', docId)
        
        // Extract document from response - check both possible response structures
        let docData = null
        if (docResponse?.data?.document) {
          docData = docResponse.data.document
        } else if (docResponse?.document) {
          docData = docResponse.document
        } else {
          console.error('Unexpected response structure:', docResponse)
          setError('Failed to load document - invalid response structure')
          setLoading(false)
          return
        }
        
        setDocument(docData)
        
        // Get the signed URL for the file
        // The /content endpoint redirects to a signed Supabase URL
        // We need to follow that redirect to get the actual file URL
        try {
          const fileResponse = await fetch(`/api/repository/files/${docId}/content`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${authState?.token}`,
            },
            redirect: 'follow', // Follow redirects automatically
          })
          
          if (fileResponse.ok) {
            // Get the final URL after redirects
            setFileUrl(fileResponse.url)
            console.log('File URL obtained:', fileResponse.url)
          } else {
            console.error('Failed to get file URL:', fileResponse.status)
          }
        } catch (err) {
          console.error('Error fetching file URL:', err)
        }
      } catch (err) {
        console.error('Failed to fetch document:', err)
        setError(err.message || 'Failed to load document')
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [docId, authState?.token])

  const getGoogleDocsViewerUrl = () => {
    if (!fileUrl) return ''
    // Use the actual Supabase signed URL for Google Docs Viewer
    return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
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
    <section className="mx-auto grid w-full max-w-6xl gap-4 p-4">
      <div className="grid gap-2">
        <p className="brand-kicker">Document Viewer</p>
        <h2 className="text-2xl font-semibold tracking-tight">
          {document?.title || `Document #${docId}`}
        </h2>
        {document && (
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
            <span>Format: <strong>{document.format?.toUpperCase()}</strong></span>
            <span>Type: <strong>{document.type}</strong></span>
            <span>Version: <strong>{document.version}</strong></span>
            <span>State: <strong>{document.state}</strong></span>
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {fileUrl && (
          <Button asChild size="sm" variant="outline" className="gap-2">
            <a 
              href={fileUrl} 
              target="_blank" 
              rel="noreferrer"
              download
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </Button>
        )}
        {document?.format?.toLowerCase() === 'pdf' && (
          <Button asChild size="sm" variant="outline" className="gap-2">
            <a 
              href={getGoogleDocsViewerUrl()} 
              target="_blank" 
              rel="noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              Open in Google Viewer
            </a>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Preview - {document?.format?.toUpperCase() || 'Document'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fileUrl ? (
            <div className="rounded-lg border border-border overflow-hidden bg-muted/10">
              <iframe
                src={getGoogleDocsViewerUrl()}
                width="100%"
                height="600"
                frameBorder="0"
                className="rounded-lg"
                title="Document Preview"
              />
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p>Unable to load preview</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
