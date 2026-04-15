import { createContext } from "react";
import type { RoleCapabilities } from "../types/role-context.types";

export const RoleContext = createContext<RoleCapabilities | null>(null);
