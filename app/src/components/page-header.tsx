interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="py-8">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      </div>
    </header>
  );
}
