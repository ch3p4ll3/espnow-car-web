export interface CommandMessage {
    leftMotorDirection: boolean,        // true = forward, false = backwards
    leftMotorSpeed: number,             // 0 - 100%, 0 = stop

    rightMotorDirection: boolean,       // true = forward, false = backwards
    rightMotorSpeed: number             // 0 - 100%, 0 = stop
}