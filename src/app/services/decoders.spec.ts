import { TestBed } from '@angular/core/testing';

import { Decoders } from './decoders';

describe('Decoders', () => {
  let service: Decoders;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Decoders);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
