import { create } from "zustand";

interface TaskCountState {
  ids: Set<string>;
  setIds: (ids: string[]) => void;
  removeId: (id: string) => void;
}

export const useTaskCountStore = create<TaskCountState>((set) => ({
  ids: new Set(),
  setIds: (ids) => set({ ids: new Set(ids) }),
  removeId: (id) =>
    set((state) => {
      if (!state.ids.has(id)) return state;
      const next = new Set(state.ids);
      next.delete(id);
      return { ids: next };
    }),
}));

export const selectTaskCount = (state: TaskCountState): number =>
  state.ids.size;
