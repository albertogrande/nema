// SPDX-License-Identifier: Apache-2.0
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@nema/core', '@nema/schema', '@nema/provenance', '@nema/adapter-fumadocs'],
};

export default nextConfig;
