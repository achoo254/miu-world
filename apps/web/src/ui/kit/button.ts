// Button look as class names, so the same style applies to <button>, <a> and router <Link>.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function buttonClass(variant: ButtonVariant = 'primary', { small = false, block = false }: { small?: boolean; block?: boolean } = {}): string {
  return ['btn', `btn--${variant}`, small ? 'btn--sm' : '', block ? 'btn--block' : ''].filter(Boolean).join(' ');
}
