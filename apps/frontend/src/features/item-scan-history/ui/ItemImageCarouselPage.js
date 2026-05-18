import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useItemImageViewerStore } from "../stores/item-image-viewer.store";
import { itemImageViewerActions } from "../actions/item-image-viewer.actions";
import { ItemImageCarousel } from "./ItemImageCarousel";
import { ItemImagePaginationIndicator } from "./ItemImagePaginationIndicator";
import { CloseIcon } from "../../../assets/icons";
export function ItemImageCarouselPage() {
    const images = useItemImageViewerStore((state) => state.images);
    const currentImageIndex = useItemImageViewerStore((state) => state.currentImageIndex);
    if (images.length === 0) {
        return null; // No images (should not happen)
    }
    const handleClose = () => {
        itemImageViewerActions.closeImageViewer();
    };
    const handleImageChange = (newIndex) => {
        itemImageViewerActions.navigateToImage(newIndex, images.length);
    };
    const handleDotClick = (index) => {
        handleImageChange(index);
    };
    return (_jsxs("div", { className: "fixed inset-0 z-50 bg-black flex flex-col", children: [_jsx("div", { className: "absolute top-4 right-4 z-50", children: _jsx("button", { type: "button", onClick: handleClose, className: "inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/60 text-white hover:bg-slate-950/80 active:bg-slate-950 backdrop-blur transition-colors", "aria-label": "Close image viewer", children: _jsx(CloseIcon, { className: "h-5 w-5" }) }) }), _jsx("div", { className: "flex-1", children: _jsx(ItemImageCarousel, { images: images, currentIndex: currentImageIndex, onImageChange: handleImageChange }) }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 flex justify-center pb-6 z-40", children: _jsx(ItemImagePaginationIndicator, { currentIndex: currentImageIndex, totalCount: images.length, onDotClick: handleDotClick }) })] }));
}
