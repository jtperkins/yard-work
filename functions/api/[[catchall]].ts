/** Unknown /api/* routes (or unsupported methods on known ones) → 404 JSON (plan §14.3). */
import { errorResponse } from '../../server/lib';

export const onRequest: PagesFunction = () => errorResponse(404, 'Not found');
