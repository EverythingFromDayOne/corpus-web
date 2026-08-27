import { z } from 'zod';
import { Slug } from './common.js';

export const CalloutVariant = z.enum(['info', 'success', 'warn', 'error']);
export type CalloutVariant = z.infer<typeof CalloutVariant>;

/**
 * Themed note injected after a heading. Body is plain text or simple inline
 * markdown (`**bold**`, `code`); no nested callouts, no fenced code.
 */
export const CalloutSidecar = z.object({
  id: Slug,
  variant: CalloutVariant,
  title: z.string().min(1).optional(),
  body: z.string().min(1),
  afterSection: z.string().optional(),
});
export type CalloutSidecar = z.infer<typeof CalloutSidecar>;

export const CalloutSidecarFile = z.union([
  CalloutSidecar,
  z.object({
    schema: z.literal(1),
    article_id: Slug,
    callouts: z.array(CalloutSidecar).min(1),
  }),
]);
export type CalloutSidecarFile = z.infer<typeof CalloutSidecarFile>;

export function normaliseCalloutSidecars(file: CalloutSidecarFile): CalloutSidecar[] {
  if ('callouts' in file) return file.callouts;
  return [file];
}
