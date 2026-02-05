import { Injectable } from '@angular/core';
import { TelemetryMessage } from '../interfaces/telemetry';
import { MESSAGE_HEADER } from '../constants';


@Injectable({
  providedIn: 'root',
})
export class Decoders {
  decodeTelemetry(buffer: ArrayBuffer): TelemetryMessage | null {
    const dv = new DataView(buffer);
    
    // Verify Header
    if (dv.getUint8(0) !== MESSAGE_HEADER) return null;

    let offset = 1;

    // ---- left motor ----
    const leftMotorDirection = dv.getUint8(offset) !== 0;
    offset += 1;

    offset += 1; // padding (uint16 alignment)

    const leftMotorSpeed = dv.getUint16(offset, true);
    offset += 2;

    const trueLeftSpeed = dv.getFloat32(offset, true);
    offset += 4;

    // ---- right motor ----
    const rightMotorDirection = dv.getUint8(offset) !== 0;
    offset += 1;

    offset += 1; // padding (uint16 alignment)

    const rightMotorSpeed = dv.getUint16(offset, true);
    offset += 2;

    const trueRightSpeed = dv.getFloat32(offset, true);
    offset += 4;

    // ---- GPS ----
    const lat = dv.getFloat64(offset, true);
    offset += 8;

    const lon = dv.getFloat64(offset, true);
    offset += 8;

    const gpsSpeed = dv.getFloat64(offset, true);

    return {
        leftMotorDirection,
        leftMotorSpeed,
        trueLeftSpeed,
        rightMotorDirection,
        rightMotorSpeed,
        trueRightSpeed,
        lat,
        lon,
        gpsSpeed
    };
  }
}