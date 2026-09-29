import type { z } from 'zod';

/** Server error with its stable code (`invalid-credentials`, `parent-gate-closed`…). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

/** Same-origin JSON call; responses are validated so the UI never trusts an unexpected shape. */
export async function api<S extends z.ZodType>(method: string, path: string, schema: S, body?: unknown): Promise<z.infer<S>> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network');
  }
  if (res.status === 204) return schema.parse(undefined);
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const code = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : 'unknown';
    throw new ApiError(res.status, code);
  }
  return schema.parse(data);
}

const MESSAGES: Record<string, string> = {
  network: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại nhé.',
  'invalid-input': 'Thông tin chưa hợp lệ, kiểm tra lại giúp nhé.',
  'invalid-credentials': 'Email hoặc mật khẩu chưa đúng.',
  'email-taken': 'Email này đã có tài khoản. Hãy đăng nhập.',
  'rate-limited': 'Thử quá nhiều lần. Đợi một lúc rồi thử lại nhé.',
  'invalid-pin': 'Mã PIN chưa đúng.',
  'pin-locked': 'Mã PIN bị khóa do nhập sai nhiều lần. Đăng nhập lại bằng Google để mở.',
  'parent-gate-closed': 'Cần nhập mã PIN phụ huynh.',
  'consent-required': 'Phụ huynh cần đồng ý trước khi tạo hồ sơ.',
  'profile-limit': 'Mỗi tài khoản có tối đa 3 hồ sơ.',
  'invalid-display-name': 'Hãy chọn tên trong danh sách.',
  'not-found': 'Không tìm thấy hồ sơ.',
  'pin-already-set': 'Mã PIN đã được đặt trước đó.',
  'pin-not-set': 'Cần đặt mã PIN phụ huynh trước.',
};

export function errorMessage(err: unknown): string {
  const code = err instanceof ApiError ? err.code : 'unknown';
  return MESSAGES[code] ?? 'Có lỗi xảy ra, thử lại sau nhé.';
}
