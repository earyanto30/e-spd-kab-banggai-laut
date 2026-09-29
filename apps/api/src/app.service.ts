import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'si-setda-api',
      timestamp: new Date().toISOString(),
    };
  }
}
