import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { INVITE_CODE_LENGTH } from '../config/constants';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createPersonalList(userId: string): Promise<string> {
  const docRef = await addDoc(collection(db, 'lists'), {
    name: 'Mi lista',
    ownerId: userId,
    members: [userId],
    createdAt: serverTimestamp(),
    inviteCode: generateInviteCode(),
  });

  await setDoc(doc(db, 'users', userId), { sharedListId: docRef.id }, { merge: true });
  return docRef.id;
}

export async function getUserListId(userId: string): Promise<string | null> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) return null;
  return userDoc.data()?.sharedListId ?? null;
}

export async function ensureUserList(userId: string): Promise<string> {
  const existing = await getUserListId(userId);
  if (existing) return existing;
  return createPersonalList(userId);
}

export async function getListInviteCode(listId: string): Promise<string | null> {
  const listDoc = await getDoc(doc(db, 'lists', listId));
  if (!listDoc.exists()) return null;
  return listDoc.data()?.inviteCode ?? null;
}

export async function getListMembers(
  listId: string,
): Promise<{ userId: string; email: string; displayName: string }[]> {
  const listDoc = await getDoc(doc(db, 'lists', listId));
  if (!listDoc.exists()) return [];

  const memberIds: string[] = listDoc.data()?.members ?? [];
  const members: { userId: string; email: string; displayName: string }[] = [];

  for (const uid of memberIds) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const d = userDoc.data();
      members.push({
        userId: uid,
        email: d.email ?? '',
        displayName: d.displayName ?? '',
      });
    }
  }
  return members;
}

export async function joinListByCode(
  userId: string,
  code: string,
): Promise<{ listId: string; ownerName: string }> {
  const upperCode = code.trim().toUpperCase();

  const q = query(
    collection(db, 'lists'),
    where('inviteCode', '==', upperCode),
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Codigo no encontrado');
  }

  const listDoc = snap.docs[0];
  const listId = listDoc.id;
  const data = listDoc.data();
  const members: string[] = data.members ?? [];

  if (members.includes(userId)) {
    throw new Error('Ya eres miembro de esta lista');
  }

  // Add user to list members
  await updateDoc(doc(db, 'lists', listId), {
    members: arrayUnion(userId),
  });

  // Update user's sharedListId
  await setDoc(doc(db, 'users', userId), { sharedListId: listId }, { merge: true });

  // Get owner name
  const ownerDoc = await getDoc(doc(db, 'users', data.ownerId));
  const ownerName = ownerDoc.exists()
    ? ownerDoc.data()?.displayName || ownerDoc.data()?.email || 'tu pareja'
    : 'tu pareja';

  return { listId, ownerName };
}

export async function leaveSharedList(
  userId: string,
  listId: string,
): Promise<string> {
  // Remove from members
  await updateDoc(doc(db, 'lists', listId), {
    members: arrayRemove(userId),
  });

  // Create new personal list
  const newListId = await createPersonalList(userId);
  return newListId;
}
