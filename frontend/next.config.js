/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Allow dev origins for HMR when visiting via common local hosts in development
  allowedDevOrigins: [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://192.168.1.44:3000",
  ],
};

module.exports = nextConfig;
