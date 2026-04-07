import { useEffect } from "react";

import { homeShellActions } from "../actions/home-shell.actions";
import { HOME_DEFAULT_PAGE_ID } from "../domain/page-registry.domain";
import type {
  HomePageId,
  HomePageRegistration,
} from "../types/home-shell.types";

interface UseHomeShellFlowInput {
  pages: HomePageRegistration[];
  defaultPageId?: HomePageId;
}

export function useHomeShellFlow({
  pages,
  defaultPageId = HOME_DEFAULT_PAGE_ID,
}: UseHomeShellFlowInput): void {
  useEffect(() => {
    homeShellActions.registerFeaturePages(pages);
    homeShellActions.bootstrapDefaultPage(defaultPageId);
  }, [defaultPageId, pages]);
}
