import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state shown while the employer dashboard / jobs / submissions pages
 * are server-rendered or while client-side fetches are in flight.
 */
export default function EmployerLoading() {
  return (
    <div className="space-y-6">
      {/* Page header placeholder */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[110px] rounded-xl" />
        ))}
      </div>

      {/* Two-column main */}
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-[400px] rounded-xl md:col-span-2" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    </div>
  );
}
