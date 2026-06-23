import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectWorkspaceLoading() {
  return <div className="flex h-dvh gap-px bg-border p-px"><Skeleton className="w-56 rounded-none" /><Skeleton className="flex-1 rounded-none" /><Skeleton className="w-80 rounded-none" /></div>;
}
