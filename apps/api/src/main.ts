import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

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
