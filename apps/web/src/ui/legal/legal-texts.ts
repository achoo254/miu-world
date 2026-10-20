// The public legal texts of content/legal/, checked against their schemas once when the UI loads.
import { PrivacyDocument, TermsDocument } from '@miu/schema/content';
import privacyJson from '../../../../../content/legal/privacy-vi.json';
import termsJson from '../../../../../content/legal/terms-vi.json';

export const PRIVACY = PrivacyDocument.parse(privacyJson);
export const TERMS = TermsDocument.parse(termsJson);
