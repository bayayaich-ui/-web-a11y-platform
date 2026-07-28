/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    useTypeScriptCli: true,
  },
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;
