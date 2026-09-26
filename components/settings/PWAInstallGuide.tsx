'use client'

import React, { useEffect, useState } from 'react'
import { Share, PlusSquare, CheckCircle, Smartphone, Info } from 'lucide-react'

export function PWAInstallGuide() {
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      setIsStandalone(isStandaloneMode)
    }
  }, [])

  return (
    <div className="rounded-ios-lg bg-white border border-warm-200/80 p-5 shadow-soft space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-warm-100 flex items-center justify-center text-warm-800">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-warm-900 font-display">
            Install TogetherTime on iPhone
          </h3>
          <p className="text-[11px] text-warm-600">
            Add to your home screen for quick access and full app experience
          </p>
        </div>
      </div>

      {isStandalone ? (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>TogetherTime is installed and running in standalone mode!</span>
        </div>
      ) : (
        <div className="space-y-2.5 pt-1">
          <ol className="space-y-2 text-xs text-warm-800">
            <li className="flex items-start gap-2.5 p-2 rounded-xl bg-warm-50/70 border border-warm-100">
              <span className="w-5 h-5 rounded-full bg-warm-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <span>
                Open <strong>TogetherTime</strong> in Safari on your iPhone.
              </span>
            </li>
            <li className="flex items-start gap-2.5 p-2 rounded-xl bg-warm-50/70 border border-warm-100">
              <span className="w-5 h-5 rounded-full bg-warm-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <span className="flex items-center gap-1.5 flex-wrap">
                Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline text-warm-700" /> at the bottom of the screen.
              </span>
            </li>
            <li className="flex items-start gap-2.5 p-2 rounded-xl bg-warm-50/70 border border-warm-100">
              <span className="w-5 h-5 rounded-full bg-warm-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <span className="flex items-center gap-1.5 flex-wrap">
                Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-warm-700" />.
              </span>
            </li>
            <li className="flex items-start gap-2.5 p-2 rounded-xl bg-warm-50/70 border border-warm-100">
              <span className="w-5 h-5 rounded-full bg-warm-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                4
              </span>
              <span>
                Tap <strong>Add</strong> in the top right corner. You&apos;re all set!
              </span>
            </li>
          </ol>
        </div>
      )}
    </div>
  )
}
