// SPDX-License-Identifier: Apache-2.0
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@getnema/core',
    '@getnema/schema',
    '@getnema/provenance',
    '@getnema/adapter-fumadocs',
  ],
};

export default nextConfig;
