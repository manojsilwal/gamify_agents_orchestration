import type { HTMLAttributes } from 'react'

type Props = HTMLAttributes<HTMLSpanElement> & {
  name: string
  fill?: boolean
  size?: number
}

export function MaterialIcon({ name, fill, size = 24, className = '', ...rest }: Props) {
  return (
    <span
      className={`material-symbols-outlined ${fill ? 'fill' : ''} ${className}`.trim()}
      style={{ fontSize: size }}
      {...rest}
    >
      {name}
    </span>
  )
}
