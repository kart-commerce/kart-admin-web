import { TestBed } from '@angular/core/testing';

import { SessionBroadcastService } from './session-broadcast.service';

describe('SessionBroadcastService', () => {
  it('receives a message posted from another channel instance to the same name', (done) => {
    const service = TestBed.inject(SessionBroadcastService);
    service.messages$.subscribe((message) => {
      expect(message).toEqual({ type: 'logout' });
      done();
    });

    const otherTabChannel = new BroadcastChannel('kart-admin-session');
    otherTabChannel.postMessage({ type: 'logout' });
    otherTabChannel.close();
  });

  it('post() does not throw when called', () => {
    const service = TestBed.inject(SessionBroadcastService);
    expect(() => service.post({ type: 'activity' })).not.toThrow();
  });
});
