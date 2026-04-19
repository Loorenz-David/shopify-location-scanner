import { userRepository } from "../repositories/user.repository.js";

export const appEnterCommand = async (userId: string): Promise<void> => {
  await userRepository.updateLastOnline(userId, new Date());
};
