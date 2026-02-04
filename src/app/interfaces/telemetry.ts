export interface TelemetryMessage {
  leftMotorDirection: boolean;
  leftMotorSpeed: number;
  trueLeftSpeed: number;
  
  rightMotorDirection: boolean;
  rightMotorSpeed: number;
  trueRightSpeed: number;

  lat: number;
  lon: number;
  gpsSpeed: number;
}