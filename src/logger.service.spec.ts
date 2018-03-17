/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import {NGXLogger, SaveLogAdapter} from './logger.service';
import {} from 'jasmine';

describe('NGXLogger', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NGXLogger]
    });
  });

  it('should ...', inject([NGXLogger], (service: NGXLogger) => {
    expect(service).toBeTruthy();
  }));

  it('should attempt to save', inject([NGXLogger], (service: NGXLogger) => {
      let mockFunction: SaveLogAdapter = (logObject) => {
          expect(logObject.message).toContain('testMessage');
      };
      spyOn(service, '_saveLogAdapter').and.callFake(mockFunction);
  }));

});
