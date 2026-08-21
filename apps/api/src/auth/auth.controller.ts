import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { RegisterDto, LoginDto } from "./auth.dto";
import { JwtAuthGuard, CurrentUser } from "./auth.guards";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("refresh")
  @UseGuards(AuthGuard("jwt-refresh"))
  @HttpCode(200)
  refresh(@CurrentUser() user: { id: string; email: string; role: string }) {
    return this.authService.refresh(user);
  }
}

@Controller("users")
export class UsersController {
  constructor(private authService: AuthService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { id: string }) {
    return this.authService.me(user.id);
  }
}
