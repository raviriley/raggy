/** @type {import('next').NextConfig} */
const nextConfig = {
  // When exporting to static HTML, we don't need rewrites
  // The API calls will be handled by the Docker container's nginx
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
