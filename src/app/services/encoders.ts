import { Injectable } from '@angular/core';
import { TelemetryMessage } from '../interfaces/telemetry';
import { TOTAL_SIZE, TELEMETRY_HEADER } from '../constants';

@Injectable({
  providedIn: 'root',
})
export class Encoders {
  encodeTelemetryMessage(msg: TelemetryMessage): ArrayBuffer {
    const buffer = new ArrayBuffer(TOTAL_SIZE);
    const view = new DataView(buffer);

    // ---- Header ----
    view.setUint8(0, TELEMETRY_HEADER);

    let offset = 1;

    // ---- left motor ----
    view.setUint8(offset, msg.leftMotorDirection ? 1 : 0);
    offset += 1;

    offset += 1; // padding for uint16 alignment

    view.setUint16(offset, msg.leftMotorSpeed, true);
    offset += 2;

    view.setFloat32(offset, msg.trueLeftSpeed, true);
    offset += 4;

    // ---- right motor ----
    view.setUint8(offset, msg.rightMotorDirection ? 1 : 0);
    offset += 1;

    offset += 1; // padding for uint16 alignment

    view.setUint16(offset, msg.rightMotorSpeed, true);
    offset += 2;

    view.setFloat32(offset, msg.trueRightSpeed, true);
    offset += 4;

    // ---- GPS ----
    view.setFloat64(offset, msg.lat, true);
    offset += 8;

    view.setFloat64(offset, msg.lon, true);
    offset += 8;

    view.setFloat64(offset, msg.gpsSpeed, true);

    return buffer;
  }
}
