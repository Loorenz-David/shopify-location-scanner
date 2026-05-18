export const soldItemRule = {
    evaluate: (item) => (item.isSold ? "logistic" : null),
};
