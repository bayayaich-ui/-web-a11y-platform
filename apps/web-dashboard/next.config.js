/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  experimental: {
    useTypeScriptCli: true,
  },
  // Point both outputFileTracingRoot and turbopack.root to the monorepo root
  // so Next/Turbopack resolve packages correctly in a monorepo layout.
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
};

module.exports = nextConfig;
