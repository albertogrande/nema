// SPDX-License-Identifier: Apache-2.0
import { ImageResponse } from 'next/og';

export const alt = 'Nema — your coding agents write the docs, you approve the PR';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Social-share card: dark brand canvas, wordmark, canonical headline. */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#14120b',
        color: '#edecec',
        padding: 80,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 54, fontWeight: 700, letterSpacing: -1 }}>nema</div>
        <div style={{ width: 24, height: 40, background: '#fb923c' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 62,
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: -1.5,
          }}
        >
          <div>Your coding agents write the docs.</div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            You approve the PR.
            <div style={{ width: 26, height: 48, background: '#fb923c', marginLeft: 14 }} />
          </div>
        </div>
        <div style={{ fontSize: 26, color: '#a8a29e', letterSpacing: 2 }}>
          open source · self-hostable · apache-2.0
        </div>
      </div>
    </div>,
    { ...size },
  );
}
