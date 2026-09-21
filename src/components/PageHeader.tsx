interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export default function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div className="page-heading mb-6">
      {eyebrow ? (
        <div className="inline-flex items-center gap-2 mb-1 w-fit">
          <span className="w-4 h-[2px] bg-[#d9b571]" />
          <span className="text-[11px] font-bold tracking-[0.18em] text-[#d9b571] uppercase">
            {eyebrow}
          </span>
        </div>
      ) : null}
      <h1 className="text-2xl md:text-3xl font-heading font-bold text-white tracking-tight">
        {title}
      </h1>
      {description ? (
        <p className="text-sm text-[#b7c0cb] mt-1 leading-relaxed">
          {description}
        </p>
      ) : null}
    </div>
  );
}
