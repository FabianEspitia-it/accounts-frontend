/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    /** Expone `BACKEND_API_URL` al bundle del cliente (páginas de streaming). */
    BACKEND_API_URL: process.env.BACKEND_API_URL,
  },
};

export default nextConfig;
