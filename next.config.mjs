import nextPWA from "next-pwa"
import createMDX from "@next/mdx"
import { mdxOptions } from "./src/mdxOptions.mjs"

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
}

const withMDX = createMDX({
  options: {
    ...mdxOptions,
  },
})

const withPWA = nextPWA({
  dest: "public",
})

export default withPWA(withMDX(nextConfig))
