import { auth } from './config';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
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
    onAuthStateChanged
};

export type FirebaseUser = User;
