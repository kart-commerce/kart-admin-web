import { HttpErrorResponse } from '@angular/common/http';

import { extractErrorCode, extractErrorMessage } from './problem';

describe('problem helpers', () => {
  it('extracts the message from a Problem-shaped HttpErrorResponse', () => {
    const error = new HttpErrorResponse({ error: { code: 'permission_denied', message: 'No grant.' } });
    expect(extractErrorMessage(error, 'fallback')).toBe('No grant.');
    expect(extractErrorCode(error)).toBe('permission_denied');
  });

  it('falls back when the error is not Problem-shaped', () => {
    expect(extractErrorMessage(new Error('boom'), 'fallback')).toBe('fallback');
    expect(extractErrorMessage(new HttpErrorResponse({ error: 'not json' }), 'fallback')).toBe('fallback');
    expect(extractErrorCode(new Error('boom'))).toBeUndefined();
  });
});
