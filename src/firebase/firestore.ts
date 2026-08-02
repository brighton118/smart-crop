import { db } from './config';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    DocumentData,
    QueryConstraint
} from 'firebase/firestore';

/**
 * Fetch a single document by ID
 */
export const getDocument = async <T = DocumentData>(collectionName: string, id: string): Promise<T | null> => {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
};

/**
 * Fetch all documents in a collection, optionally filtered by constraints
 */
export const getDocuments = async <T = DocumentData>(collectionName: string, constraints: QueryConstraint[] = []): Promise<T[]> => {
    const colRef = collection(db, collectionName);
    const q = query(colRef, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as T);
};

/**
 * Set a document (creates if not exists, overwrites completely or merges)
 */
export const setDocument = async <T extends object>(collectionName: string, id: string, data: T, merge = true): Promise<void> => {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, data, { merge });
};

/**
 * Update specific fields in a document (fails if does not exist)
 */
export const updateDocument = async (collectionName: string, id: string, data: Partial<DocumentData>): Promise<void> => {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data);
};

/**
 * Delete a document
 */
export const deleteDocument = async (collectionName: string, id: string): Promise<void> => {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
};

/**
 * Generate an ID for a new document before creating it
 */
export const generateId = (collectionName: string): string => {
    return doc(collection(db, collectionName)).id;
};
