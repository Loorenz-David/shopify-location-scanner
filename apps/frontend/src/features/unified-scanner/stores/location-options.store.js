import { create } from "zustand";
export const useLocationOptionsStore = create((set) => ({
    options: [],
    setOptions: (options) => set({ options }),
    reset: () => set({ options: [] }),
}));
export const selectLocationOptions = (state) => state.options;
