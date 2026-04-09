import type { ComponentType } from "react";

interface PageOutletProps {
  activePageTitle: string;
  ActivePageComponent: ComponentType;
}

export function PageOutlet({
  activePageTitle,
  ActivePageComponent,
}: PageOutletProps) {
  return (
    <section
      className="min-h-svh box-border  pb-36 pt-9  max-[640px]:pb-32 max-[640px]:pt-6"
      aria-label={activePageTitle}
    >
      <ActivePageComponent />
    </section>
  );
}
