const nextPWA = require('next-pwa')

/** @type {import('next').NextConfig} */
const nextConfig = {}

const withPWA = nextPWA({
  dest: 'public',
})

module.exports = withPWA(nextConfig)
