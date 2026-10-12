// Invite links over the API: the selected player makes them (the code comes back once), lists her live ones and
// withdraws one; whoever opens a link uses its code to become her friend.
import { z } from 'zod';
import { CreatedInviteDto, InviteAcceptedDto, InviteList } from '@miu/schema/invites';
import { api } from '../api-client';

const none = z.undefined();

export const loadInvites = (): Promise<InviteList> => api('GET', '/invites', InviteList);
export const createInvite = (): Promise<CreatedInviteDto> => api('POST', '/invites', CreatedInviteDto);
export const revokeInvite = (id: string): Promise<void> => api('DELETE', `/invites/${encodeURIComponent(id)}`, none);
export const acceptInvite = (code: string): Promise<InviteAcceptedDto> => api('POST', `/invites/${encodeURIComponent(code)}/accept`, InviteAcceptedDto);
