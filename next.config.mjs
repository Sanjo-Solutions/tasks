import nextPWA from 'next-pwa'
import remarkGfm from 'remark-gfm'
import remarkHeadingId from 'remark-heading-id'
import createMDX from '@next/mdx'

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
}

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm, [remarkHeadingId, { defaults: true }]],
    rehypePlugins: [],
  },
})

const withPWA = nextPWA({
  dest: 'public',
})

export default withPWA(withMDX(nextConfig))
