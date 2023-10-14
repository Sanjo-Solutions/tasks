import Link from 'next/link.js'

export function useMDXComponents(components) {
  return {
    Link,
    ...components,
  }
}
