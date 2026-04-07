import bcrypt from "bcryptjs";
const PASSWORD_HASH_ROUNDS = 12;
export const passwordHasher = {
    hash: async (value) => {
        return bcrypt.hash(value, PASSWORD_HASH_ROUNDS);
    },
    verify: async (value, hash) => {
        return bcrypt.compare(value, hash);
    },
};
//# sourceMappingURL=password-hasher.js.map