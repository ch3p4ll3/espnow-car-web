import { Injectable } from '@angular/core';
import { TelemetryMessage } from '../interfaces/telemetry';
import { MESSAGE_HEADER, TELEMETRY_SIZE } from '../constants';

@Injectable({
  providedIn: 'root',
})
export class Decoders {
  decodeTelemetry(buffer: ArrayBuffer): TelemetryMessage | null {
    if (buffer.byteLength < TELEMETRY_SIZE) return null;

    const dv = new DataView(buffer);
    if (dv.getUint8(0) !== MESSAGE_HEADER) return null;

    return {
      leftMotorDirection:  dv.getUint8(1) !== 0,
      leftMotorSpeed:      dv.getUint16(2, true),
      trueLeftSpeed:       dv.getFloat32(4, true),

      rightMotorDirection: dv.getUint8(8) !== 0,
      rightMotorSpeed:     dv.getUint16(9, true),
      trueRightSpeed:      dv.getFloat32(11, true),

      lat:                 dv.getFloat64(15, true),
      lon:                 dv.getFloat64(23, true),
      gpsSpeed:            dv.getFloat64(31, true),
    };
  }
}