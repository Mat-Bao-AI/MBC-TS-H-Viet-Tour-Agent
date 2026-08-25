/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Có 2 lockfile trong workspace (root workspace + frontend/) — chỉ định rõ
  // root để Turbopack khỏi tự đoán nhầm.
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
