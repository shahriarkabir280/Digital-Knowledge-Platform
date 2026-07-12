import cseduLogo from '@/assets/CSEDULOGO.png'

/**
 * Shared split-screen shell for Login/Register: branded gradient panel on
 * the left (hidden on small screens), form content on the right.
 */
export default function AuthLayout({ eyebrow, title, description, panelExtra, children }) {
  return (
    <div className="grid min-h-[100svh] lg:grid-cols-2">
      {/* Left panel — branding */}
      <div className="hidden flex-col items-center justify-center gap-8 bg-gradient-to-br from-[var(--brand-700)] via-[var(--brand-500)] to-[var(--brand-400)] p-12 text-white lg:flex">
        <div className="grid gap-5 text-center">
          <img
            src={cseduLogo}
            alt="CSEDU Logo"
            className="mx-auto h-24 w-24 rounded-2xl border-[3px] border-white/25 object-cover"
          />
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-white/75">
              {eyebrow}
            </p>
            <h1 className="mb-3 text-[clamp(1.8rem,3vw,2.6rem)] font-extrabold leading-[1.1] tracking-tight">
              {title}
            </h1>
            <p className="mx-auto max-w-[32ch] text-[.95rem] leading-relaxed text-white/80">
              {description}
            </p>
          </div>
        </div>

        {panelExtra}
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col items-center justify-center overflow-y-auto bg-[hsl(var(--background))] p-8 sm:p-12">
        <div className="grid w-full max-w-[400px] gap-6">
          {children}
        </div>
      </div>
    </div>
  )
}
