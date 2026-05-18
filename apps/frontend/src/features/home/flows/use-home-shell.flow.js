import { useEffect } from "react";
import { homeShellActions } from "../actions/home-shell.actions";
import { HOME_DEFAULT_PAGE_ID } from "../domain/page-registry.domain";
export function useHomeShellFlow({ pages, defaultPageId = HOME_DEFAULT_PAGE_ID, }) {
    useEffect(() => {
        homeShellActions.registerFeaturePages(pages);
        homeShellActions.bootstrapDefaultPage(defaultPageId);
    }, [defaultPageId, pages]);
}
