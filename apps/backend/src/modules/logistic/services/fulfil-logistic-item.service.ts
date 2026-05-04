import { markAsCompleted } from "./mark-as-completed.service.js";

export const fulfilLogisticItemService = async (input: {
  scanHistoryId: string;
  shopId: string;
  username: string;
}): Promise<void> => {
  await markAsCompleted(input);
};
