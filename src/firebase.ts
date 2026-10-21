import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  updateProfile,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { UserStats, BrushingRecord } from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Designated Super Admin Email from user brief (The ONLY one who can manage generated data)
export const SUPER_ADMIN_EMAIL = 'p17325124424@student.poltekkesbandung.ac.id';

// Predefined Player Account requested by user:
// Akun pengguna ssga01 dengan password 12345
export const PRESET_PLAYER_ACCOUNT = {
  username: 'ssga01',
  password: '12345',
  email: 'ssga01@gigijuara.app',
  displayName: 'ssga01',
  userId: 'ssga01',
};

export const ACTIVE_PLAYER_KEY = 'gigijuara_active_account_type';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Check if a user is Super Admin (Only p17325124424@student.poltekkesbandung.ac.id)
export function isUserSuperAdmin(user: User | null, profile?: CloudUserProfile | null): boolean {
  if (profile && profile.role === 'superadmin' && profile.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  if (!user || !user.email) return false;
  return user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

// Get active target user ID for saving records (player account or auth.currentUser.uid)
export function getActiveStorageUserId(): string {
  try {
    const activeId = localStorage.getItem(ACTIVE_PLAYER_KEY);
    if (activeId) {
      return activeId;
    }
  } catch {
    // Ignore
  }
  return auth.currentUser ? auth.currentUser.uid : 'ssga01';
}

export interface CloudUserProfile {
  userId: string;
  email: string;
  username?: string;
  displayName: string;
  photoURL: string;
  role: 'superadmin' | 'user';
  currentStreak: number;
  bestStreak: number;
  totalStars: number;
  totalSessions: number;
  selectedToothbrushId: string;
  lastBrushedDate?: string;
  hasReadEducation?: boolean;
  lastReadEducationAt?: string;
  hasPassedQuiz?: boolean;
  quizScore?: number;
  createdAt: string;
  updatedAt: string;
}

// Ensure an authenticated session exists with Firebase Auth for Firestore rules verification
async function ensureAuthSession(): Promise<User> {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  const cred = await signInAnonymously(auth);
  return cred.user;
}

// ============================================================================
// 1. LOGIN SEBAGAI AKUN PEMAIN (Dengan nama pengguna yang dapat diupdate)
// ============================================================================
export async function loginAsPlayerAccount(
  usernameInput: string, 
  passwordInput: string,
  localStats?: UserStats
): Promise<CloudUserProfile> {
  const rawUsername = usernameInput.trim();
  if (!rawUsername) {
    throw new Error('Silakan masukkan nama pengguna.');
  }

  const cleanPassword = passwordInput.trim();
  if (!cleanPassword) {
    throw new Error('Silakan masukkan kata sandi.');
  }

  if (cleanPassword !== '12345') {
    throw new Error('Kata sandi tidak valid. Silakan periksa kembali.');
  }

  // Ensure active Firebase Auth session so firestore security rules allow writing
  await ensureAuthSession();

  // Create clean slug for database ID while preserving original username
  const cleanSlug = rawUsername.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'pemain';
  const targetUserId = cleanSlug === 'ssga01' ? 'ssga01' : `player_${cleanSlug}`;

  const userRef = doc(db, 'users', targetUserId);
  const path = `users/${targetUserId}`;
  const now = new Date().toISOString();

  try {
    const snap = await getDoc(userRef);

    let profile: CloudUserProfile;

    if (!snap.exists()) {
      // Create initial persistent profile in database
      profile = {
        userId: targetUserId,
        username: rawUsername,
        email: `${cleanSlug}@gigijuara.app`,
        displayName: rawUsername,
        photoURL: '',
        role: 'user',
        currentStreak: localStats?.currentStreak || 0,
        bestStreak: localStats?.bestStreak || 0,
        totalStars: Math.max(localStats?.totalStars || 50, 50),
        totalSessions: localStats?.totalSessions || 0,
        selectedToothbrushId: localStats?.selectedToothbrushId || 'classic-blue',
        lastBrushedDate: localStats?.lastBrushedDate || '',
        hasReadEducation: localStats?.hasReadEducation || false,
        lastReadEducationAt: localStats?.lastReadEducationAt || '',
        hasPassedQuiz: localStats?.hasPassedQuiz || false,
        quizScore: localStats?.quizScore || 0,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(userRef, profile);
    } else {
      profile = snap.data() as CloudUserProfile;

      // Update display name or username if changed
      let shouldUpdate = false;
      const updates: Partial<CloudUserProfile> = { updatedAt: now };

      if (profile.displayName !== rawUsername) {
        updates.displayName = rawUsername;
        profile.displayName = rawUsername;
        shouldUpdate = true;
      }
      if (profile.username !== rawUsername) {
        updates.username = rawUsername;
        profile.username = rawUsername;
        shouldUpdate = true;
      }

      // Smart merge if local device had higher progress
      if (localStats) {
        if ((localStats.totalStars || 0) > (profile.totalStars || 0)) {
          updates.totalStars = localStats.totalStars;
          profile.totalStars = localStats.totalStars;
          shouldUpdate = true;
        }
        if ((localStats.currentStreak || 0) > (profile.currentStreak || 0)) {
          updates.currentStreak = localStats.currentStreak;
          profile.currentStreak = localStats.currentStreak;
          shouldUpdate = true;
        }
        if ((localStats.bestStreak || 0) > (profile.bestStreak || 0)) {
          updates.bestStreak = localStats.bestStreak;
          profile.bestStreak = localStats.bestStreak;
          shouldUpdate = true;
        }
        if ((localStats.totalSessions || 0) > (profile.totalSessions || 0)) {
          updates.totalSessions = localStats.totalSessions;
          profile.totalSessions = localStats.totalSessions;
          shouldUpdate = true;
        }
        if (localStats.hasPassedQuiz && !profile.hasPassedQuiz) {
          updates.hasPassedQuiz = true;
          updates.quizScore = localStats.quizScore || 100;
          profile.hasPassedQuiz = true;
          profile.quizScore = localStats.quizScore || 100;
          shouldUpdate = true;
        }
      }

      if (shouldUpdate) {
        await updateDoc(userRef, updates);
      }
    }

    try {
      localStorage.setItem(ACTIVE_PLAYER_KEY, targetUserId);
    } catch {
      // Ignore
    }

    return profile;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

// ============================================================================
// 2. LOGIN SEBAGAI SUPER ADMIN (p17325124424@student.poltekkesbandung.ac.id)
// ============================================================================
export async function loginWithGmail(): Promise<User> {
  try {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Bootstrap or sync user profile
    await syncUserProfile(user);

    try {
      localStorage.removeItem(ACTIVE_PLAYER_KEY);
    } catch {
      // Ignore
    }

    return user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Direct Admin Login Helper for Poltekkes email
export async function loginAsSuperAdminDirect(email: string, localStats?: UserStats): Promise<CloudUserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail !== SUPER_ADMIN_EMAIL.toLowerCase()) {
    throw new Error(`Akses Ditolak: Hanya ${SUPER_ADMIN_EMAIL} yang berhak mengakses Super Admin.`);
  }

  let currentUser = auth.currentUser;
  if (!currentUser) {
    const cred = await signInAnonymously(auth);
    currentUser = cred.user;
  }

  try {
    await updateProfile(currentUser, { displayName: 'Super Admin Poltekkes' });
  } catch {
    // Non-fatal
  }

  const profile = await syncUserProfile(currentUser, localStats, cleanEmail, 'Super Admin Poltekkes');
  try {
    localStorage.removeItem(ACTIVE_PLAYER_KEY);
  } catch {
    // Ignore
  }
  return profile;
}

// Sync or fetch user profile on login with smart merge of existing local progress
export async function syncUserProfile(
  user: User, 
  localStats?: UserStats, 
  customEmail?: string, 
  customName?: string
): Promise<CloudUserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const path = `users/${user.uid}`;

  try {
    const snap = await getDoc(userRef);
    const resolvedEmail = customEmail || user.email || '';
    const resolvedName = customName || user.displayName || resolvedEmail.split('@')[0] || 'Juara Cilik';
    const isSuper = resolvedEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    const now = new Date().toISOString();

    if (!snap.exists()) {
      const newProfile: CloudUserProfile = {
        userId: user.uid,
        email: resolvedEmail,
        displayName: resolvedName,
        photoURL: user.photoURL || '',
        role: isSuper ? 'superadmin' : 'user',
        currentStreak: localStats?.currentStreak || 0,
        bestStreak: localStats?.bestStreak || 0,
        totalStars: Math.max(localStats?.totalStars || 0, 50),
        totalSessions: localStats?.totalSessions || 0,
        selectedToothbrushId: localStats?.selectedToothbrushId || 'classic-blue',
        lastBrushedDate: localStats?.lastBrushedDate || '',
        hasReadEducation: localStats?.hasReadEducation || false,
        lastReadEducationAt: localStats?.lastReadEducationAt || '',
        hasPassedQuiz: localStats?.hasPassedQuiz || false,
        quizScore: localStats?.quizScore || 0,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(userRef, newProfile);

      // If super admin, register in /admins too
      if (isSuper) {
        try {
          await setDoc(doc(db, 'admins', user.uid), {
            email: resolvedEmail,
            role: 'superadmin',
            createdAt: now,
          });
        } catch {
          // Non-fatal if already set
        }
      }

      return newProfile;
    } else {
      const existing = snap.data() as CloudUserProfile;
      let shouldUpdate = false;
      const updates: Partial<CloudUserProfile> = { updatedAt: now };

      if (customEmail && existing.email !== customEmail) {
        updates.email = customEmail;
        existing.email = customEmail;
        shouldUpdate = true;
      }
      if (customName && (!existing.displayName || existing.displayName === 'Juara Cilik')) {
        updates.displayName = customName;
        existing.displayName = customName;
        shouldUpdate = true;
      }

      // Auto upgrade role if designated email
      if (isSuper && existing.role !== 'superadmin') {
        updates.role = 'superadmin';
        existing.role = 'superadmin';
        shouldUpdate = true;

        try {
          await setDoc(doc(db, 'admins', user.uid), {
            email: resolvedEmail,
            role: 'superadmin',
            createdAt: now,
          });
        } catch {
          // Non-fatal
        }
      }

      // Merge local stats if higher
      if (localStats) {
        if ((localStats.totalStars || 0) > (existing.totalStars || 0)) {
          updates.totalStars = localStats.totalStars;
          existing.totalStars = localStats.totalStars;
          shouldUpdate = true;
        }
        if ((localStats.bestStreak || 0) > (existing.bestStreak || 0)) {
          updates.bestStreak = localStats.bestStreak;
          existing.bestStreak = localStats.bestStreak;
          shouldUpdate = true;
        }
        if ((localStats.totalSessions || 0) > (existing.totalSessions || 0)) {
          updates.totalSessions = localStats.totalSessions;
          existing.totalSessions = localStats.totalSessions;
          shouldUpdate = true;
        }
        if (localStats.hasReadEducation && !existing.hasReadEducation) {
          updates.hasReadEducation = true;
          updates.lastReadEducationAt = localStats.lastReadEducationAt || now;
          existing.hasReadEducation = true;
          existing.lastReadEducationAt = localStats.lastReadEducationAt || now;
          shouldUpdate = true;
        }
        if (localStats.hasPassedQuiz && !existing.hasPassedQuiz) {
          updates.hasPassedQuiz = true;
          updates.quizScore = localStats.quizScore || 100;
          existing.hasPassedQuiz = true;
          existing.quizScore = localStats.quizScore || 100;
          shouldUpdate = true;
        }
      }

      if (shouldUpdate) {
        await updateDoc(userRef, updates);
      }

      return existing;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

// Log in or register with email address and name directly
export async function loginWithEmailDirect(email: string, displayName: string, localStats?: UserStats): Promise<CloudUserProfile> {
  let currentUser = auth.currentUser;
  if (!currentUser) {
    const cred = await signInAnonymously(auth);
    currentUser = cred.user;
  }

  try {
    await updateProfile(currentUser, { displayName });
  } catch {
    // Non-fatal
  }

  const profile = await syncUserProfile(currentUser, localStats, email, displayName);
  try {
    localStorage.removeItem(ACTIVE_PLAYER_KEY);
  } catch {
    // Ignore
  }
  return profile;
}

// Logout
export async function logoutUser(): Promise<void> {
  try {
    localStorage.removeItem(ACTIVE_PLAYER_KEY);
  } catch {
    // Ignore
  }
  await signOut(auth);
}

// ============================================================================
// DATA PERSISTENCE: Save Stats & Daily Records to Firestore
// ============================================================================
export async function saveUserStatsToCloud(
  targetUserId: string, 
  stats: UserStats, 
  userEmail?: string, 
  displayName?: string, 
  photoURL?: string
): Promise<void> {
  // Ensure we have an active auth session before writing
  await ensureAuthSession();

  const userRef = doc(db, 'users', targetUserId);
  const path = `users/${targetUserId}`;

  try {
    const isSuper = userEmail?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    const payload: Partial<CloudUserProfile> = {
      userId: targetUserId,
      email: userEmail || (targetUserId === 'ssga01' ? PRESET_PLAYER_ACCOUNT.email : auth.currentUser?.email || ''),
      displayName: displayName || (targetUserId === 'ssga01' ? 'Pemain ssga01' : auth.currentUser?.displayName || 'Juara Cilik'),
      photoURL: photoURL || auth.currentUser?.photoURL || '',
      role: isSuper ? 'superadmin' : 'user',
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
      totalStars: stats.totalStars,
      totalSessions: stats.totalSessions,
      selectedToothbrushId: stats.selectedToothbrushId,
      lastBrushedDate: stats.lastBrushedDate || '',
      hasReadEducation: stats.hasReadEducation ?? false,
      lastReadEducationAt: stats.lastReadEducationAt || '',
      hasPassedQuiz: stats.hasPassedQuiz ?? false,
      quizScore: stats.quizScore ?? 0,
      updatedAt: new Date().toISOString(),
    };

    if (targetUserId === 'ssga01') {
      payload.username = 'ssga01';
    }

    await setDoc(userRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Save daily brushing record to Firestore subcollection
export async function saveRecordToCloud(targetUserId: string, record: BrushingRecord): Promise<void> {
  await ensureAuthSession();

  const recordRef = doc(db, 'users', targetUserId, 'records', record.date);
  const path = `users/${targetUserId}/records/${record.date}`;

  try {
    await setDoc(recordRef, {
      ...record,
      userId: targetUserId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Fetch all daily records for user
export async function fetchUserRecordsFromCloud(targetUserId: string): Promise<Record<string, BrushingRecord>> {
  await ensureAuthSession();

  const recordsRef = collection(db, 'users', targetUserId, 'records');
  const path = `users/${targetUserId}/records`;

  try {
    const snap = await getDocs(recordsRef);
    const records: Record<string, BrushingRecord> = {};
    snap.forEach((d) => {
      records[d.id] = d.data() as BrushingRecord;
    });
    return records;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// ============================================================================
// 3. SUPER ADMIN MANAGEMENT FUNCTIONS (Only for p17325124424@student.poltekkesbandung.ac.id)
// ============================================================================

// Fetch all registered users for Super Admin dashboard
export async function fetchAllUsersForSuperAdmin(): Promise<CloudUserProfile[]> {
  const usersRef = collection(db, 'users');
  const path = 'users';

  try {
    const snap = await getDocs(usersRef);
    const users: CloudUserProfile[] = [];
    snap.forEach((d) => {
      users.push(d.data() as CloudUserProfile);
    });
    return users;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// Fetch detailed day-by-day records of a specific user
export async function fetchUserDetailRecordsForAdmin(userId: string): Promise<BrushingRecord[]> {
  const recordsRef = collection(db, 'users', userId, 'records');
  const path = `users/${userId}/records`;

  try {
    const snap = await getDocs(recordsRef);
    const records: BrushingRecord[] = [];
    snap.forEach((d) => {
      records.push(d.data() as BrushingRecord);
    });
    // Sort by date descending
    records.sort((a, b) => b.date.localeCompare(a.date));
    return records;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// Update or reset stats for a user by Super Admin
export async function updateUserStatsByAdmin(
  userId: string, 
  updates: Partial<CloudUserProfile>
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const path = `users/${userId}`;

  try {
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Delete user account and records by Super Admin
export async function deleteUserByAdmin(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const path = `users/${userId}`;

  try {
    // Delete subcollection records first
    const records = await fetchUserDetailRecordsForAdmin(userId);
    for (const rec of records) {
      await deleteDoc(doc(db, 'users', userId, 'records', rec.date));
    }
    // Delete user profile document
    await deleteDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Delete single brushing record by Super Admin
export async function deleteUserRecordByAdmin(userId: string, recordDate: string): Promise<void> {
  const recordRef = doc(db, 'users', userId, 'records', recordDate);
  const path = `users/${userId}/records/${recordDate}`;

  try {
    await deleteDoc(recordRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
