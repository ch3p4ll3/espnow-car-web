import { TestBed } from '@angular/core/testing';

import { Encoders } from './encoders';

describe('Encoders', () => {
  let service: Encoders;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Encoders);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
