import { auth } from './config';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    updateProfile,
    updatePassword,
    User
} from 'firebase/auth';

/**
 * Firebase Authentication Wrappers
 * These export the standard Firebase Auth functions bound to the configured app.
 */
export {
    auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    updateProfile,
    updatePassword
};

export type FirebaseUser = User & {
    id?: string;
    user_metadata?: {
        name?: string;
        avatar_url?: string;
        phone?: string;
        location?: string;
        [key: string]: any;
    };
};
