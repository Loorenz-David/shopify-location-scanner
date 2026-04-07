import bcrypt from "bcryptjs";

const PASSWORD_HASH_ROUNDS = 12;

export const passwordHasher = {
  hash: async (value: string): Promise<string> => {
    return bcrypt.hash(value, PASSWORD_HASH_ROUNDS);
  },

  verify: async (value: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(value, hash);
  },
};
