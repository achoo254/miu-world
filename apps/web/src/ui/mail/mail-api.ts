// The child's mailbox on the server (`/api/mail`): the list, reading one, claiming its reward (the server pays it).
import { z } from 'zod';
import { MailClaimResponse, MailListResponse } from '@miu/schema/mail';
import { api } from '../api-client';

const MailReadResponse = z.object({ success: z.literal(true) });

export function fetchMailList(): Promise<MailListResponse> {
  return api('GET', '/mail', MailListResponse);
}

export async function markMailRead(id: string): Promise<void> {
  await api('POST', `/mail/${encodeURIComponent(id)}/read`, MailReadResponse);
}

export function claimMailReward(id: string): Promise<MailClaimResponse> {
  return api('POST', `/mail/${encodeURIComponent(id)}/claim`, MailClaimResponse);
}
