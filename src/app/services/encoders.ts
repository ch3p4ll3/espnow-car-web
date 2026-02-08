import { Injectable } from '@angular/core';
import { COMMAND_SIZE, MESSAGE_HEADER } from '../constants';
import { CommandMessage } from '../interfaces/command';

@Injectable({
  providedIn: 'root',
})
export class Encoders {
  encodeCommandMessage(msg: CommandMessage): ArrayBuffer {
    const buffer = new ArrayBuffer(COMMAND_SIZE);
    const view = new DataView(buffer);

    view.setUint8(0, 0xAA);

    // Pack Left Motor
    view.setUint8(1, Number(msg.leftMotorDirection));

    view.setUint16(2, msg.leftMotorSpeed, true); // Little-endian

    // Pack Right Motor
    view.setUint8(4, Number(msg.rightMotorDirection));
    view.setUint16(5, msg.rightMotorSpeed, true); // Little-endian

    return buffer;
  }
}
