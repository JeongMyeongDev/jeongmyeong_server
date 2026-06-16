import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DefinitionReferencesModule } from '../definition-references/definition-references.module';
import { SanctionsModule } from '../sanctions/sanctions.module';
import { CommentsController } from './comments.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule, DefinitionReferencesModule, SanctionsModule],
  controllers: [PostsController, CommentsController],
  providers: [PostsService],
})
export class PostsModule {}
