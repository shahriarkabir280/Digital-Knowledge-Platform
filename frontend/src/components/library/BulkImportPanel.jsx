/**
 * Bulk Import Panel
 * Drag-and-drop CSV / MARC import with validation report.
 */

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, Download } from 'lucide-react'
import { loadAuthSession } from '../../app/auth-session.js'

const ACCEPTED_EXT = ['.csv', '.mrc', '.marc', '.xml']

export default function BulkImportPanel() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleFile = (f) => {
    if (!f) return
    const name = f.name.toLowerCase()
    if (!ACCEPTED_EXT.some((ext) => name.endsWith(ext))) {
      alert('Supported formats: CSV, MARC (.mrc / .marc), MARCXML (.xml).')
      return
    }
    setFile(f)
    setResult(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    handleFile(f)
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(
        (import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api')) +
          '/library/catalog/import',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${loadAuthSession()?.token || ''}`,
          },
          body: formData,
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Import failed')
      setResult(data)
    } catch (err) {
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const headers = 'title,authors,isbn,subject,description,location,category,language,publisher,publication_year,total_copies'
    const sample = '"Introduction to Algorithms","Thomas H. Cormen","978-0262033848","Computer Science","Classic algorithms textbook","CSE-Shelf-A1","textbook","EN","MIT Press",2009,5'
    const blob = new Blob([headers + '\n' + sample], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'catalog_import_template.csv'
    a.click()
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Bulk Catalog Import</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload a CSV or MARC (.mrc / .marc / .xml) file to add up to 10,000 catalog items at once.
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={downloadTemplate}>
          <Download size={12} /> Template CSV
        </Button>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors
          ${dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40 bg-muted/10 hover:bg-muted/20'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.mrc,.marc,.xml"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {file ? (
          <div className="flex items-center gap-3">
            <FileText size={24} className="text-accent" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              className="ml-2 text-muted-foreground hover:text-red-500 transition-colors"
              onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null) }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <Upload size={28} className="text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                Drop CSV or MARC file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                CSV · MARC (.mrc/.marc) · MARCXML (.xml) — Max 10,000 rows · 20 MB limit
              </p>
            </div>
          </>
        )}
      </div>

      {file && !result && (
        <Button
          onClick={handleImport}
          disabled={loading}
          className="w-full gap-2 bg-accent hover:bg-accent/90 text-white"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {loading ? 'Importing…' : `Import ${file.name}`}
        </Button>
      )}

      {/* Result */}
      {result && (
        <Card className={`border ${result.error ? 'border-red-200 dark:border-red-900/30' : 'border-emerald-200 dark:border-emerald-900/30'}`}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              {result.error ? (
                <AlertCircle size={14} className="text-red-500" />
              ) : (
                <CheckCircle2 size={14} className="text-emerald-500" />
              )}
              {result.error ? 'Import Failed' : 'Import Complete'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {result.error ? (
              <p className="text-xs text-red-600 dark:text-red-400">{result.error}</p>
            ) : (
              <div className="grid gap-3">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Total rows', value: result.total, color: 'bg-muted/30 text-foreground' },
                    { label: 'Imported', value: result.imported, color: 'bg-emerald-500/10 text-emerald-600' },
                    { label: 'Duplicates', value: result.duplicates, color: 'bg-amber-500/10 text-amber-600' },
                    { label: 'Errors', value: result.error_count, color: 'bg-red-500/10 text-red-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`rounded-lg p-2.5 text-center ${color}`}>
                      <p className="text-lg font-bold">{value ?? 0}</p>
                      <p className="text-[12px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
                    </div>
                  ))}
                </div>

                {result.errors?.length > 0 && (
                  <div className="rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 p-3 max-h-48 overflow-y-auto">
                    <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-2">
                      First {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}:
                    </p>
                    <div className="grid gap-1.5">
                      {result.errors.map((err, i) => (
                        <div key={i} className="text-[13px] text-red-600 dark:text-red-400">
                          <span className="font-semibold">Line {err.line}: </span>
                          {err.row} — {err.errors?.join(', ')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit text-xs"
                  onClick={() => { setFile(null); setResult(null) }}
                >
                  Import Another File
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
