import argon2 from 'argon2';

const PASSWORD_HASH_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 64 * 1024,
    timeCost: 3,
    parallelism: 4,
};

export function hashPassword(plaintext: string): Promise<string> {
    return argon2.hash(plaintext, PASSWORD_HASH_OPTIONS);
}

export function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, plaintext);
}
