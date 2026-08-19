import { AlertTriangle } from "lucide-react";

export function SafetyNotice() {
  return (
    <section className="py-12 bg-amber-50 dark:bg-amber-950/30 border-y border-amber-200 dark:border-amber-800" aria-label="Safety notice">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 flex gap-4">
        <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h2 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">Important Safety Notice</h2>
          <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
            NaviAssist is an <strong>assistive navigation tool</strong> designed to complement — not replace — a white cane or guide dog.
            AI detection may not be 100% accurate in all conditions. Always use appropriate mobility aids alongside this application.
            If AI confidence is low or visibility is poor, the app will notify you accordingly.
          </p>
        </div>
      </div>
    </section>
  );
}
