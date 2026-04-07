export const asyncHandler = (handler) => {
    return (req, res, next) => {
        void handler(req, res, next).catch(next);
    };
};
//# sourceMappingURL=async-handler.js.map