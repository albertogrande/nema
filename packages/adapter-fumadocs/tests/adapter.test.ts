// SPDX-License-Identifier: Apache-2.0
import { fileURLToPath } from 'node:url';
import { assertAdapterConformance, runAdapterConformance } from '@getnema/adapter-kit';
import { type ContentSource, type ResolvedConfig, contentSourceFromConfig } from '@getnema/core';
import { describe, expect, it } from 'vitest';
import { fumadocsAdapter, provenanceBadgeProps } from '../src/index.js';

function source(): ContentSource {
  const contentRoot = fileURLToPath(new URL('./fixtures/docs', import.meta.url));
  const config: ResolvedConfig = {
    rootDir: fileURLToPath(new URL('./fixtures', import.meta.url)),
    contentDir: 'docs',
    contentRoot,
    codeRoot: contentRoot,
    reviewSlaDays: 180,
    rootExempt: ['index'],
    baseUrl: '',
  };
  return contentSourceFromConfig(config);
}

describe('fumadocsAdapter', () => {
  it('passes the adapter conformance suite', () => {
    const result = runAdapterConformance(fumadocsAdapter, source());
    expect(result.failures).toEqual([]);
    expect(() => assertAdapterConformance(fumadocsAdapter, source())).not.toThrow();
  });

  it('projects pages into a Fumadocs source', () => {
    const rendererSource = fumadocsAdapter.toRendererSource(source());
    const intro = rendererSource.pages.find((p) => p.url === '/guide/intro');
    expect(intro?.slugs).toEqual(['guide', 'intro']);
    expect(intro?.data.status).toBe('reviewed');
  });

  it('serves the .md route verbatim (parity)', () => {
    const src = source();
    const intro = src.getPage('guide/intro')!;
    expect(fumadocsAdapter.markdownRoute(src, intro)).toBe(src.renderMarkdown(intro));
  });
});

describe('provenanceBadgeProps', () => {
  it('reports a reviewed page', () => {
    const src = source();
    const prov = src.getPage('guide/intro')!.provenance ?? null;
    const props = provenanceBadgeProps(prov);
    expect(props.reviewed).toBe(true);
    expect(props.reviewer).toBe('alberto');
    expect(props.tone).toBe('reviewed');
  });
  it('reports an AI draft', () => {
    const props = provenanceBadgeProps({
      schema: 1,
      authored_by: 'ai',
      model: { name: 'claude-opus-4-8' },
      sources: [],
      transitions: [{ to: 'draft', by: 'ai', ts: '2026-06-20T14:02:00Z' }],
    });
    expect(props.tone).toBe('ai');
    expect(props.label).toMatch(/pending review/);
  });
  it('handles missing provenance', () => {
    expect(provenanceBadgeProps(null).label).toBe('No provenance');
  });
});
