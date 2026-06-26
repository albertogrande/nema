// SPDX-License-Identifier: Apache-2.0
import type { Provenance } from '@getnema/schema';

/**
 * Minimal C2PA manifest shape (a typed subset). This is a MAPPING STUB: it
 * proves the page-level provenance model is attestation-ready by projecting it
 * into C2PA assertions. It does NOT sign anything — cryptographic signing is a
 * deferred commercial ("managed attestation") feature.
 */
export interface C2PAAssertion {
  label: string;
  data: Record<string, unknown>;
}

export interface C2PAIngredient {
  title: string;
  format?: string;
  relationship: 'inputTo' | 'componentOf';
  metadata?: Record<string, unknown>;
}

export interface C2PAManifest {
  claim_generator: string;
  title?: string;
  assertions: C2PAAssertion[];
  ingredients: C2PAIngredient[];
}

export interface C2PAOptions {
  title?: string;
  path?: string;
  claimGenerator?: string;
}

/** Project page-level provenance into a (typed, unsigned) C2PA manifest. */
export function toC2PAManifest(prov: Provenance, opts: C2PAOptions = {}): C2PAManifest {
  const actions: Array<Record<string, unknown>> = [];

  const digitalSourceType =
    prov.authored_by === 'human'
      ? 'http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture'
      : 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia';

  actions.push({
    action: 'c2pa.created',
    digitalSourceType,
    softwareAgent: prov.model?.name,
    'com.nema.authored_by': prov.authored_by,
  });

  if (prov.reviewed_by) {
    actions.push({
      action: 'c2pa.reviewed',
      'com.nema.reviewer': prov.reviewed_by.login,
      'com.nema.method': prov.reviewed_by.method,
      'com.nema.pr': prov.reviewed_by.pr,
    });
  }

  const assertions: C2PAAssertion[] = [
    { label: 'c2pa.actions', data: { actions } },
    // Carry the raw Nema provenance as a custom assertion for round-tripping.
    { label: 'com.nema.provenance', data: { ...prov } },
  ];

  const ingredients: C2PAIngredient[] = prov.sources.map((s) => ({
    title: s.title,
    relationship: 'inputTo',
    metadata: { id: s.id, url: s.url, kind: s.kind, retrieved: s.retrieved },
  }));

  return {
    claim_generator: opts.claimGenerator ?? 'nema/0.1.0',
    title: opts.title,
    assertions,
    ingredients,
  };
}
