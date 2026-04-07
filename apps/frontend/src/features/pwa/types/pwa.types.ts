export interface PwaState {
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  isApplyingUpdate: boolean;
}

export interface RegisterPwaControllerArgs {
  onNeedRefresh: (registration: ServiceWorkerRegistration) => void;
  onRegistered?: (registration: ServiceWorkerRegistration) => void;
}
