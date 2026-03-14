import { hashPassword } from '../services/passwordService.js';

const plaintextPassword = process.argv[2];

if (typeof plaintextPassword !== 'string') {
    throw new Error('Password argument is required.');
}

console.log(await hashPassword(plaintextPassword));
