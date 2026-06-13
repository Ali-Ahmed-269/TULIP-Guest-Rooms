export default function Loading() {
  return (
    <div className="grid gap-4">
      <div className="h-8 w-48 rounded bg-[rgba(0,0,0,0.08)]" />
      <div className="panel grid gap-3">
        <div className="h-5 w-40 rounded bg-[rgba(0,0,0,0.08)]" />
        <div className="h-4 w-full rounded bg-[rgba(0,0,0,0.06)]" />
        <div className="h-4 w-5/6 rounded bg-[rgba(0,0,0,0.06)]" />
      </div>
    </div>
  );
}
