import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({ className, variant = 'secondary', size = 'md', ...props }: ButtonProps) {
  return <button className={cn('button inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50', `button--${variant}`, `button--${size}`, className)} {...props} />
}
