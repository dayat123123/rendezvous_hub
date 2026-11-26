export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 border-b px-5 py-4">
      <h3 id={id} className="text-sm font-medium">
        {title}
      </h3>
      {children}
    </section>
  )
}
