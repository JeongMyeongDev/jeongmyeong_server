import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ConsensusesModule } from './modules/consensuses/consensuses.module';
import { DebatesModule } from './modules/debates/debates.module';
import { DefinitionsModule } from './modules/definitions/definitions.module';
import { HealthModule } from './modules/health/health.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PostsModule } from './modules/posts/posts.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SanctionsModule } from './modules/sanctions/sanctions.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    DebatesModule,
    DefinitionsModule,
    PostsModule,
    ConsensusesModule,
    NotificationsModule,
    ReportsModule,
    ModerationModule,
    SanctionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
