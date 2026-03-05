/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // Игнорировать ошибки типов при билде
  },
  eslint: {
    ignoreDuringBuilds: true, // Игнорировать ошибки линтера
  },
};

export default nextConfig;

