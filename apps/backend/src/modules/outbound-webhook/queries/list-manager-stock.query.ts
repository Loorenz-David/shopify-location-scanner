import type {
  ManagerStockLedgerRecord,
  ManagerStockQuery,
} from "../contracts/outbound-webhook.contract.js";
import { managerStockLedgerRepository } from "../repositories/manager-stock-ledger.repository.js";

/**
 * §12A.9 / §8: what Manager currently holds for a rule and whether it accepted
 * it, which rules it is refusing (`outcome=category_not_found`), and which rules
 * were deleted there and by which sync (`state=deleted` → `lastDeliveryId`).
 */
export const listManagerStockQuery = async (
  input: { shopId: string } & ManagerStockQuery,
): Promise<ManagerStockLedgerRecord[]> => managerStockLedgerRepository.list(input);
