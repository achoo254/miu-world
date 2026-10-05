import { describe, expect, it } from 'vitest';
import { PlayerDto, Email, ParentDto, ParentPin, PasswordField } from './account';

describe('account schema', () => {
  it('normalises email to lower case', () => {
    expect(Email.parse('  Me@Example.VN ')).toBe('me@example.vn');
    expect(Email.safeParse('not-an-email').success).toBe(false);
  });

  it('bounds the account secret length to 10–128', () => {
    expect(PasswordField.safeParse('x'.repeat(9)).success).toBe(false);
    expect(PasswordField.safeParse('x'.repeat(10)).success).toBe(true);
    expect(PasswordField.safeParse('x'.repeat(129)).success).toBe(false);
  });

  it('accepts 4–6 digit PINs only', () => {
    expect(ParentPin.safeParse('123').success).toBe(false);
    expect(ParentPin.safeParse('1234').success).toBe(true);
    expect(ParentPin.safeParse('123456').success).toBe(true);
    expect(ParentPin.safeParse('12a4').success).toBe(false);
  });

  it('strips hashes and foreign keys from DB rows', () => {
    const row = {
      id: '0b0e8e0c-6f1a-4b8e-9a53-1f1c2a3b4c5d',
      email: 'p@example.vn',
      passwordHash: 'hash-a',
      pinHash: 'hash-b',
    };
    expect(ParentDto.parse(row)).toEqual({ id: row.id, email: row.email });
    const player = PlayerDto.parse({ id: row.id, displayName: 'Mèo Mây', species: 'cat', primary: true, parentId: 'x' });
    expect(player).toEqual({ id: row.id, displayName: 'Mèo Mây', species: 'cat', language: 'vi', primary: true });
  });
});
