import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController, UsersController } from "./auth.controller";
import { JwtStrategy, JwtRefreshStrategy } from "./auth.strategies";
import { RolesGuard } from "./auth.guards";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PassportModule, JwtModule.register({}), PrismaModule],
  controllers: [AuthController, UsersController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, RolesGuard],
  exports: [AuthService],
})
export class AuthModule {}
