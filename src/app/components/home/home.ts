import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Decoders } from '../../services/decoders';
import { TOTAL_SIZE, TELEMETRY_HEADER } from '../../constants';

@Component({
  selector: 'app-home',
  imports: [ButtonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private decoders = inject(Decoders);
  private port: any;

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
            console.log(decoded);
            
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
}
