/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable to prevent double renders that cause input focus loss
  images: {
    domains: ['supabase.co', 'github.com', 'linkedin.com'],
  },
}

module.exports = nextConfig 