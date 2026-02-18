import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
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
  // 1. Check user doc for existing sharedListId
  const existing = await getUserListId(userId);
  if (existing) {
    const listDoc = await getDoc(doc(db, 'lists', existing));
    if (listDoc.exists()) return existing;
  }

  // 2. Fallback: find any list where user is already a member (prevents duplicates)
  const listsSnap = await getDocs(
    query(collection(db, 'lists'), where('members', 'array-contains', userId)),
  );
  if (!listsSnap.empty) {
    const picked = listsSnap.docs[0].id;
    await setDoc(doc(db, 'users', userId), { sharedListId: picked }, { merge: true });
    return picked;
  }

  // 3. No lists at all — create one
  return createPersonalList(userId);
}

export async function consolidateUserLists(
  userId: string,
  currentListId: string,
): Promise<number> {
  const listsSnap = await getDocs(
    query(collection(db, 'lists'), where('members', 'array-contains', userId)),
  );

  const otherListIds = listsSnap.docs
    .map((d) => d.id)
    .filter((id) => id !== currentListId);
  if (otherListIds.length === 0) return 0;

  // Firestore "in" queries allow up to 10 values. Process in chunks.
  const chunkSize = 10;
  let moved = 0;

  for (let i = 0; i < otherListIds.length; i += chunkSize) {
    const chunk = otherListIds.slice(i, i + chunkSize);
    const rSnap = await getDocs(
      query(collection(db, 'restaurants'), where('listId', 'in', chunk)),
    );

    let batch = writeBatch(db);
    let batchCount = 0;

    for (const rDoc of rSnap.docs) {
      batch.update(doc(db, 'restaurants', rDoc.id), { listId: currentListId });
      moved++;
      batchCount++;

      if (batchCount >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
  }

  return moved;
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
  const memberDocs = await Promise.all(
    memberIds.map((uid) => getDoc(doc(db, 'users', uid))),
  );
  return memberDocs
    .filter((d) => d.exists())
    .map((d) => ({
      userId: d.id,
      email: d.data()?.email ?? '',
      displayName: d.data()?.displayName ?? '',
    }));
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
