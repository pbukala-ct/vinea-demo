import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    /**
     * Product imagery is served straight from the origin CDN, NOT through next/image's optimiser.
     *
     * The optimiser fetches server-side in Node, and Zscaler's TLS interception of
     * cdn.metcash.media makes Node reject the certificate (UNABLE_TO_GET_ISSUER_CERT_LOCALLY)
     * while browsers are fine — they use the OS trust store. Optimising here would mean every
     * product image 500s on any machine behind Zscaler without NODE_EXTRA_CA_CERTS set, which is
     * a terrible property for a demo that gets cloned and run by colleagues.
     *
     * Cost: no resizing/AVIF. The CDN is Cloudinary-backed and the URLs already carry a
     * w_800/w_1500 transform, so images arrive pre-sized anyway.
     */
    unoptimized: true,
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.metcash.media' }],
  },
};

export default nextConfig;
