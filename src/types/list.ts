export interface RestaurantList {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  createdAt: Date;
  inviteCode: string;
}
