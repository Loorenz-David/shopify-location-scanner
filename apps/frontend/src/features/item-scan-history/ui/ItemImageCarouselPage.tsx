import { useItemImageViewerStore } from "../stores/item-image-viewer.store";
import { itemImageViewerActions } from "../actions/item-image-viewer.actions";
import { ItemImageCarousel } from "./ItemImageCarousel";
import { ItemImagePaginationIndicator } from "./ItemImagePaginationIndicator";
import { CloseIcon } from "../../../assets/icons";

export function ItemImageCarouselPage() {
  const images = useItemImageViewerStore((state) => state.images);
  const currentImageIndex = useItemImageViewerStore(
    (state) => state.currentImageIndex,
  );

  if (images.length === 0) {
    return null; // No images (should not happen)
  }

  const handleClose = () => {
    itemImageViewerActions.closeImageViewer();
  };

  const handleImageChange = (newIndex: number) => {
    itemImageViewerActions.navigateToImage(newIndex, images.length);
  };

  const handleDotClick = (index: number) => {
    handleImageChange(index);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Close button */}
      <div className="absolute top-4 right-4 z-50">
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/60 text-white hover:bg-slate-950/80 active:bg-slate-950 backdrop-blur transition-colors"
          aria-label="Close image viewer"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Carousel - takes full height */}
      <div className="flex-1">
        <ItemImageCarousel
          images={images}
          currentIndex={currentImageIndex}
          onImageChange={handleImageChange}
        />
      </div>

      {/* Pagination indicator - absolutely positioned at bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-6 z-40">
        <ItemImagePaginationIndicator
          currentIndex={currentImageIndex}
          totalCount={images.length}
          onDotClick={handleDotClick}
        />
      </div>
    </div>
  );
}
