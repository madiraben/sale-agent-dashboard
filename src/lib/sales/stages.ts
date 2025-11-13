/**
 * Sales bot stage handlers
 * 
 * This file re-exports all stage handlers from the stages/ directory
 * for backward compatibility with existing imports.
 * 
 * The implementation has been refactored into separate files:
 * - stages/discovering.ts - Initial browsing and ordering stage
 * - stages/confirming-products.ts - Product selection stage
 * - stages/confirming-order.ts - Order confirmation stage
 * - stages/collecting-contact.ts - Contact information collection stage
 */

// Re-export everything from the stages directory
export {
  handleDiscoveringStage,
  handleConfirmingProductsStage,
  handleConfirmingOrderStage,
  handleCollectingContactStage,
  type StageResponse,
  detectCartModification,
  isAskingToBrowseProducts,
  extractProductTypeFromQuery,
  isAskingAboutCart,
  extractProductIdsFromSelection,
} from "./stages/index";
