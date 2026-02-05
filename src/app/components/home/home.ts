import { Component, inject, HostListener } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Decoders } from '../../services/decoders';
import { FormsModule } from '@angular/forms';
import { SliderModule } from 'primeng/slider';
import { InputTextModule } from 'primeng/inputtext';
import { TOTAL_SIZE, TELEMETRY_HEADER } from '../../constants';
import { TelemetryMessage } from '../../interfaces/telemetry';

@Component({
  selector: 'app-home',
  imports: [ButtonModule, FormsModule, SliderModule, InputTextModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  public maxSpeed: number = 50;
  public telemetry: TelemetryMessage;
  public activeKeys = new Set<string>();

  private decoders = inject(Decoders);
  private port: any;

  constructor() {
    this.telemetry = {
      leftMotorDirection: true,
      leftMotorSpeed: 0,
      trueLeftSpeed: 0,
      
      rightMotorDirection: true,
      rightMotorSpeed: 0,
      trueRightSpeed: 0,

      lat: 0,
      lon: 0,
      gpsSpeed: 0
    }
  }

  public get is_connected(): boolean {
    // return this.port && this.port.conected === true;
    return true;
  }

  public async onConnect(){
    if (!(navigator as any).serial){
      console.log("no serial support");
      return;
    }

    await this.connect();
  }

  async connect() {
    try {
      // 1. Request port (triggers browser popup)
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate: 112500 });

      this.readLoop();
    } catch (err) {
      console.error('Connection failed:', err);
    }
  }

  private async readLoop() {
  let accumulator = new Uint8Array(0);

  while (this.port?.readable) {
    const reader = this.port.readable.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // 1. Add new bytes to existing buffer
        const newBuf = new Uint8Array(accumulator.length + value.length);
        newBuf.set(accumulator);
        newBuf.set(value, accumulator.length);
        accumulator = newBuf;

        // 2. Process all complete packets in the buffer
        while (accumulator.length >= TOTAL_SIZE) {
          // Find the header TELEMETRY_HEADER
          const headerIndex = accumulator.indexOf(TELEMETRY_HEADER);

          if (headerIndex === -1) {
            accumulator = new Uint8Array(0); // No header found, clear buffer
            break;
          }

          if (headerIndex > 0) {
            accumulator = accumulator.slice(headerIndex); // Discard junk before header
          }

          if (accumulator.length >= TOTAL_SIZE) {
            const packet = accumulator.slice(0, TOTAL_SIZE);
            const decoded = this.decoders.decodeTelemetry(packet.buffer);

            if (decoded)
              this.telemetry = decoded;
            
            accumulator = accumulator.slice(TOTAL_SIZE); // Remove processed packet
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

  async write(message: string) {
    if (this.port?.writable) {
      const writer = this.port.writable.getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(message));
      writer.releaseLock();
    }
  }

  // Listen for Key Press
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (!this.is_connected) return;

    this.activeKeys.add(event.key);

    switch (event.key) {
      case 'ArrowUp':
        this.updateMotors(this.maxSpeed, this.maxSpeed);
        break;
      case 'ArrowDown':
        this.updateMotors(-this.maxSpeed, -this.maxSpeed);
        break;
      case 'ArrowLeft':
        this.updateMotors(-this.maxSpeed, this.maxSpeed); // Tank turn left
        break;
      case 'ArrowRight':
        this.updateMotors(this.maxSpeed, -this.maxSpeed); // Tank turn right
        break;
      case ' ': // Spacebar for Emergency Stop
        this.emergencyStop();
        break;
    }
  }

  // Listen for Key Release
  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) {
    this.activeKeys.delete(event.key);
    // Stop motors when keys are released
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      this.updateMotors(0, 0);
    }
  }

  updateMotors(left: number, right: number) {
    this.telemetry.leftMotorSpeed = left;
    this.telemetry.rightMotorSpeed = right;

    // Call serial service to send the command
  }

  emergencyStop() {
    this.updateMotors(0, 0);
  }

  isKeyPressed(key: string): boolean {
    return this.activeKeys.has(key);
  }
}
