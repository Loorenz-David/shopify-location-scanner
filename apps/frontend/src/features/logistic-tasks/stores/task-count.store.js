import { create } from "zustand";
export const useTaskCountStore = create((set) => ({
    ids: new Set(),
    setIds: (ids) => set({ ids: new Set(ids) }),
    removeId: (id) => set((state) => {
        if (!state.ids.has(id))
            return state;
        const next = new Set(state.ids);
        next.delete(id);
        return { ids: next };
    }),
}));
export const selectTaskCount = (state) => state.ids.size;
