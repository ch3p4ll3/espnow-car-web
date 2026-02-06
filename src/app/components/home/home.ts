import { Component, inject, HostListener, NgZone, ChangeDetectorRef } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Decoders } from '../../services/decoders';
import { FormsModule } from '@angular/forms';
import { SliderModule } from 'primeng/slider';
import { InputTextModule } from 'primeng/inputtext';
import { TELEMETRY_SIZE, MESSAGE_HEADER, RAMP_STEP, TICK_RATE } from '../../constants';
import { TelemetryMessage } from '../../interfaces/telemetry';
import { CommandMessage } from '../../interfaces/command';
import { Encoders } from '../../services/encoders';

@Component({
  selector: 'app-home',
  imports: [ButtonModule, FormsModule, SliderModule, InputTextModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  public maxSpeed: number = 50;
  public targetLeft: number = 0;
  public targetRight: number = 0;

  public telemetry: TelemetryMessage;
  public command: CommandMessage;
  public activeKeys = new Set<string>();

  private decoders = inject(Decoders);
  private encoders = inject(Encoders);
  private port: any;
  private rampInterval: any;

  constructor(
    private ngZone: NgZone,
    private cdref: ChangeDetectorRef,
  ) {
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

    this.command = {
      leftMotorDirection: true,
      leftMotorSpeed: 0,
      rightMotorDirection: true,
      rightMotorSpeed: 0
    }

    this.startRampLoop();
  }

  ngOnDestroy() {
    if (this.rampInterval) clearInterval(this.rampInterval);
  }

  public get is_connected(): boolean {
    return this.port && this.port.conected === true;
    //return true;
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
        while (accumulator.length >= TELEMETRY_SIZE) {
          // Find the header TELEMETRY_HEADER
          const headerIndex = accumulator.indexOf(MESSAGE_HEADER);

          if (headerIndex === -1) {
            accumulator = new Uint8Array(0); // No header found, clear buffer
            break;
          }

          if (headerIndex > 0) {
            accumulator = accumulator.slice(headerIndex); // Discard junk before header
          }

          if (accumulator.length >= TELEMETRY_SIZE) {
            const packet = accumulator.slice(0, TELEMETRY_SIZE);
            const decoded = this.decoders.decodeTelemetry(packet.buffer);

            if (decoded)
              this.telemetry = decoded;
            
            accumulator = accumulator.slice(TELEMETRY_SIZE); // Remove processed packet
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
    this.targetLeft = left;
    this.targetRight = right;
  }

  private startRampLoop() {
    this.rampInterval = setInterval(() => {
      this.applyRamp();
    }, TICK_RATE);
  }

  private applyRamp() {
    // Smoothly approach the target speed
    this.ngZone.run(() => {
      this.command.leftMotorSpeed = this.approach(this.command.leftMotorSpeed, this.targetLeft, RAMP_STEP);
      this.command.rightMotorSpeed = this.approach(this.command.rightMotorSpeed, this.targetRight, RAMP_STEP);
      this.cdref.detectChanges();
    });

    if (this.is_connected) {
      this.sendMotorCommand();
    }
  }

  private approach(current: number, target: number, step: number): number {
    if (current < target) return Math.min(current + step, target);
    if (current > target) return Math.max(current - step, target);
    return target;
  }

  private async sendMotorCommand() {
    const leftSpeed = Math.abs(this.command.leftMotorSpeed);
    const rightSpeed = Math.abs(this.command.rightMotorSpeed);

    let buffer = this.encoders.encodeCommandMessage({
      leftMotorDirection: this.command.leftMotorSpeed > 0,
      leftMotorSpeed: leftSpeed,
      rightMotorDirection: this.command.rightMotorSpeed > 0,
      rightMotorSpeed: rightSpeed
    });


    if (this.port?.writable) {
      const writer = this.port.writable.getWriter();
      await writer.write(new Uint8Array(buffer));
      writer.releaseLock();
    }
  }

  emergencyStop() {
    this.updateMotors(0, 0);
  }

  isKeyPressed(key: string): boolean {
    return this.activeKeys.has(key);
  }
}
