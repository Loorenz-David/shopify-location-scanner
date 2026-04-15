export interface SavePushSubscriptionRequestDto {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface DeletePushSubscriptionRequestDto {
  endpoint: string;
}
