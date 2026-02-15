export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  sharedListId: string | null;
}
