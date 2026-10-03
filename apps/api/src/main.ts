import * as path from 'node:path';
import * as fs from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Load root .env file by searching upwards from process.cwd() and __dirname
(() => {
  const searchStarts = [process.cwd(), __dirname];
  for (const start of searchStarts) {
    let dir = start;
    for (let i = 0; i < 6; i++) {
      const candidate = path.resolve(dir, '.env');
      if (fs.existsSync(candidate) && process.loadEnvFile) {
        process.loadEnvFile(candidate);
        return;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
})();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Restrict API access to legitimate frontend origins
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests from same-origin, localhost on any port, or configured domains
      if (
        !origin ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes(process.env.APP_DOMAIN || '')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Akses diblokir oleh kebijakan keamanan CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-app-client', 'X-App-Client'],
  });

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application running on: http://localhost:${port}/api`);
}
bootstrap();
