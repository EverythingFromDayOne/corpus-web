import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { User } from './entities/user.entity.js';
import { SessionAuthGuard } from './session.guard.js';

/**
 * `GET /me` — the single protected route in this slice. The browser
 * calls this from the Next.js app on every page render that needs to
 * know the user's identity, and uses the response to decide whether
 * to show "Sign in" or the user's avatar.
 *
 * Returns a JSON shape with **only** the public-safe fields. Never
 * `googleSub`, never `id`. Those are server-internal.
 */
@ApiTags('auth')
@Controller()
@ApiBearerAuth('session')
export class MeController {
  /**
   * `GET /me` is the only operation in this controller. There is no
   * POST/PATCH because updating the profile happens on every Google
   * login via `AuthService.upsertByGoogleProfile`. The future profile-
   * update endpoint lands as a separate controller when the prompt
   * that asks for it lands.
   */
  @Get('me')
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: 'Return the currently authenticated user' })
  me(@Req() req: Request): MeResponse {
    const user = req.user as User;
    return {
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
    };
  }
}

export interface MeResponse {
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  locale: string | null;
}
