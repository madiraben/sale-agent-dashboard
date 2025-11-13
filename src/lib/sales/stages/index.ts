// Export all stage handlers
export { handleDiscoveringStage } from "./discovering";
export { handleConfirmingProductsStage } from "./confirming-products";
export { handleConfirmingOrderStage } from "./confirming-order";
export { handleCollectingContactStage } from "./collecting-contact";

// Export types
export type { StageResponse } from "./types";

// Export helper functions (if needed externally)
export {
  detectCartModification,
  isAskingToBrowseProducts,
  extractProductTypeFromQuery,
  isAskingAboutCart,
  extractProductIdsFromSelection,
} from "./helpers";


