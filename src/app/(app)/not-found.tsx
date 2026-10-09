import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card px-6 py-10 text-center">
      <p className="font-medium">Task not found.</p>
      <p className="mt-1 text-sm text-slate-500">It may have been deleted, or it belongs to another account.</p>
      <Link href="/" className="btn mt-4">
        Back to tasks
      </Link>
    </div>
  );
}
