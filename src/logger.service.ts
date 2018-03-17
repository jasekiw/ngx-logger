import {Inject, Injectable, Optional, PLATFORM_ID} from '@angular/core';

import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {isPlatformBrowser} from '@angular/common';

export class LoggerConfig {
  level: NgxLoggerLevel;
  serverLogLevel: NgxLoggerLevel;
  serverLoggingUrl?: string;
}

export enum NgxLoggerLevel {
  TRACE = 0, DEBUG, INFO, LOG, WARN, ERROR, OFF
}

export interface Log {
    level: string,
    message: string,
    additional: Array<string | null | undefined>,
    timestamp: string;
}

export type SaveLogAdapter = (log: Log) => void;

const Levels = [
  'TRACE',
  'DEBUG',
  'INFO',
  'LOG',
  'WARN',
  'ERROR',
  'OFF'
];

@Injectable()
export class NGXLogger {
  private _serverLogLevel: NgxLoggerLevel;
  private _clientLogLevel: NgxLoggerLevel;
  private _isIE: boolean;
  private _saveLogAdapter: SaveLogAdapter;
  private _saveToServerAdapter: SaveLogAdapter = (logObject) => this.sendToServer(logObject);

  constructor( private readonly http: HttpClient,
               @Inject(PLATFORM_ID) private readonly platformId,
               @Optional() private readonly options?: LoggerConfig
  ) {
    this._saveLogAdapter = this._saveToServerAdapter;
    this.options = this.options ? this.options : {
      level: NgxLoggerLevel.OFF,
      serverLogLevel: NgxLoggerLevel.OFF
    };
    this._serverLogLevel = this.options.serverLogLevel;
    this._clientLogLevel = this.options.level;
    this._isIE = isPlatformBrowser(platformId) &&
      !!(navigator.userAgent.indexOf('MSIE') !== -1 || navigator.userAgent.match(/Trident\//) || navigator.userAgent.match(/Edge\//));
  }

  public trace(message, ...additional: any[]): void {
    this._log(NgxLoggerLevel.TRACE, true, message, additional);
  }

  public debug(message, ...additional: any[]): void {
    this._log(NgxLoggerLevel.DEBUG, true, message, additional);
  }

  public info(message, ...additional: any[]): void {
    this._log(NgxLoggerLevel.INFO, true, message, additional);
  }

  public log(message, ...additional: any[]): void {
    this._log(NgxLoggerLevel.LOG, true, message, additional);
  }

  public warn(message, ...additional: any[]): void {
    this._log(NgxLoggerLevel.WARN, true, message, additional);
  }

  public error(message, ...additional: any[]): void {
    this._log(NgxLoggerLevel.ERROR, true, message, additional);
  }

  private _timestamp(): string {
    return new Date().toISOString();
  }

  private _saveLog(level: NgxLoggerLevel, message, additional: any[] = []): void {

    // If the loggingUrl is not set and the logging adapter is set to the default server adapter
    // the serverLoggingUrl is used for the _saveToServerAdapter
    if (!this.options.serverLoggingUrl && this._saveLogAdapter === this._saveToServerAdapter) {
      return;
    }

    // if the user provides a serverLogLevel and the current level is than that, do not log.
    if (level < this._serverLogLevel) {
        return;
    }



    let messageToLog = '';

    try {
      messageToLog = JSON.stringify(message);
    } catch (e) {
      messageToLog = 'The provided "message" value could not be parsed with JSON.stringify().';
    }

    let additionalToLog: Array<string | null | undefined> = [];

    if (additional === null || additional === undefined) {
      additionalToLog = [];
    } else {
      additionalToLog = additional.map((val: any, idx: number) => {
        try {
          return val === null || val === undefined || typeof val === 'string' ? val
            : JSON.stringify(val, null, 2);
        } catch (e) {
          return `The additional[${idx}] value could not be parsed using JSON.stringify().`;
        }
      });
    }

    // call the assigned storage method
    this._saveLogAdapter({
        level: Levels[level],
        message: messageToLog,
        additional: additionalToLog,
        timestamp: this._timestamp()
    });

  }

    /**
     * Set the adapter that should be called when a log needs to be saved
     * @param adapter
     */
  public setStorageMethod(adapter: SaveLogAdapter) {
      this._saveLogAdapter = adapter;
  }


  private sendToServer(logObject) {
      const headers = new HttpHeaders().set('Content-Type', 'application/json');
      this.http.post(this.options.serverLoggingUrl, logObject, { headers })
          .subscribe(
              (res: any) => this._log(NgxLoggerLevel.TRACE, false, 'Server logging successful', [res]),
              (error: HttpErrorResponse) => this._log(NgxLoggerLevel.ERROR, false, 'FAILED TO LOG ON SERVER', [error])
          );
  }

  private _logIE(level: NgxLoggerLevel, message: string, additional: any[] = []): void {
    switch (level) {
      case NgxLoggerLevel.WARN:
        console.warn(`${this._timestamp()} [${Levels[level]}] `, message, ...additional);
        break;
      case NgxLoggerLevel.ERROR:
        console.error(`${this._timestamp()} [${Levels[level]}] `, message, ...additional);
        break;
      case NgxLoggerLevel.INFO:
        console.info(`${this._timestamp()} [${Levels[level]}] `, message, ...additional);
        break;
      default:
        console.log(`${this._timestamp()} [${Levels[level]}] `, message, ...additional);
    }
  }

  private _log(level: NgxLoggerLevel, logOnServer: boolean, message, additional: any[] = []): void {
    if (!message) {
      return;
    }

    // Allow logging on server even if client log level is off
    if (logOnServer) {
      this._saveLog(level, message, additional);
    }

    // if no message or the log level is less than the environ
    if (level < this._clientLogLevel) {
      return;
    }

    try {
      message = typeof message === 'string' ? message
        : JSON.stringify(message, null, 2);
    } catch (e) {
      additional = [message, ...additional];
      message = 'The provided "message" value could not be parsed with JSON.stringify().';
    }

    // Coloring doesn't work in IE
    if (this._isIE) {
      return this._logIE(level, message, additional);
    }

    const color = this._getColor(level);

    console.log(`%c${this._timestamp()} [${Levels[level]}]`, `color:${color}`, message, ...additional);
  }

  private _getColor(level: NgxLoggerLevel): 'blue' | 'teal' | 'gray' | 'red' | undefined {
    switch (level) {
      case NgxLoggerLevel.TRACE:
        return 'blue';
      case NgxLoggerLevel.DEBUG:
        return 'teal';
      case NgxLoggerLevel.INFO:
      case NgxLoggerLevel.LOG:
        return 'gray';
      case NgxLoggerLevel.WARN:
      case NgxLoggerLevel.ERROR:
        return 'red';
      case NgxLoggerLevel.OFF:
      default:
        return;
    }
  }

}
