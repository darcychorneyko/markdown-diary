export function LinkRenderer({
  href,
  children,
  onNavigate
}: {
  href?: string;
  children: React.ReactNode;
  onNavigate(target: string): void;
}) {
  if (!href) {
    return <span>{children}</span>;
  }

  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(href);
      }}
    >
      {children}
    </a>
  );
}
