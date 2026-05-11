export interface ItemImageViewerState {
  isOpen: boolean;
  images: string[];
  currentImageIndex: number;
  title: string | null;
}

export interface ItemImage {
  url: string;
  index: number;
}
