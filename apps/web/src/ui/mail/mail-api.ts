import { MailClaimResponse, MailListResponse } from '@miu/schema/mail';

export async function fetchMailList(): Promise<MailListResponse> {
  const res = await fetch('/api/mail', {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`fetch_mail_failed: ${res.status}`);
  }
  const data = await res.json();
  return MailListResponse.parse(data);
}

export async function markMailRead(id: string): Promise<void> {
  const res = await fetch(`/api/mail/${id}/read`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`mark_mail_read_failed: ${res.status}`);
  }
}

export async function claimMailReward(id: string): Promise<MailClaimResponse> {
  const res = await fetch(`/api/mail/${id}/claim`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`claim_mail_reward_failed: ${res.status}`);
  }
  const data = await res.json();
  return MailClaimResponse.parse(data);
}
