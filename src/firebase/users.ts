import { getDocument, setDocument } from './firestore';

export interface DbUser {
    id: string;
    email: string;
    name: string;
    role?: string;
    password?: string; // Should not be stored in plain text, just for legacy mirror
    updatedAt?: string;
}

export const getUserProfile = async (id: string) => {
    return await getDocument<DbUser>('User', id);
};

export const createUserProfile = async (id: string, data: DbUser) => {
    await setDocument('User', id, data);
};
