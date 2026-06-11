import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommentsController } from './comments.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [PostsController, CommentsController],
  providers: [PostsService],
})
export class PostsModule {}
