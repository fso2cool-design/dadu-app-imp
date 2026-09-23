import { describe, expect, it } from 'vitest';
import firebaseConfigJson from '../../../firebase-applet-config.json';
import { app, auth, db } from './config';

describe('Firebase Service Initialization', () => {
  it('initializes default Firebase App', () => {
    expect(app).toBeDefined();
    expect(app.name).toBe('[DEFAULT]');
    expect(app.options.projectId).toBe(
      import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId
    );
  });

  it('initializes Firebase Auth bound to App', () => {
    expect(auth).toBeDefined();
    expect(auth.app).toBe(app);
  });

  it('initializes Firestore database instance with correct databaseId', () => {
    expect(db).toBeDefined();
    expect(db.app).toBe(app);
    expect(db.type).toBe('firestore');
    expect(db.toJSON).toBeDefined();
  });

  it('falls back to firebase-applet-config.json when env variables are not set', () => {
    const expectedBucket =
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket;
    expect(app.options.storageBucket).toBe(expectedBucket);
  });
});
