import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!getApps().length) {
    if (process.env.GCP_PROJECT_ID && process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY) {
        initializeApp({
            credential: cert({
                projectId: process.env.GCP_PROJECT_ID,
                clientEmail: process.env.GCP_CLIENT_EMAIL,
                privateKey: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
    } else {
        // Native Firebase Cloud Functions runtime uses Application Default Credentials automatically
        initializeApp();
    }
}

export const db = getFirestore();
export const auth = getAuth();
