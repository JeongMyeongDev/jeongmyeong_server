import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ConsensusesModule } from './modules/consensuses/consensuses.module';
import { DebatesModule } from './modules/debates/debates.module';
import { PostsModule } from './modules/posts/posts.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    DebatesModule,
    PostsModule,
    ConsensusesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
