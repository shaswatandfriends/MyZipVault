import { Card, CardContent } from "@/components/ui/card";

/**
 * ProficiencyScaleLegend
 *
 * Phase 4.3 — shows the 1-4 rating scale with labels, matching the
 * reference site healthcareskillschecklist.com/checklist/rn.
 *
 * Place this above the rating UI so candidates have a reference for
 * what each number means.
 */
export function ProficiencyScaleLegend() {
  const levels = [
    { value: 1, label: "No Experience", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
    { value: 2, label: "Need Training", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
    { value: 3, label: "With Supervision", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
    { value: 4, label: "Independent", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  ];

  return (
    <Card className="border-dashed">
      <CardContent className="p-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Proficiency Scale
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {levels.map((lvl) => (
            <div key={lvl.value} className="flex items-center gap-2">
              <span className={`flex size-6 items-center justify-center rounded text-xs font-bold ${lvl.color}`}>
                {lvl.value}
              </span>
              <span className="text-xs text-foreground">{lvl.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
