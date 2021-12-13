import argon2 from 'argon2';
import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql';
import { v4 } from 'uuid';
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from '../constants';
import { User } from '../entities/User';
import { TMyContext } from '../types';
import { sendEmail } from '../utils/sendEmail';
import { UsernamePasswordInput } from '../utils/UsernamePasswordInput';
import { validateRegister } from './../utils/validateRegister';

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

// Used for typing res from DB
@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  // CHANGE PASSWORD
  @Mutation(() => UserResponse)
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() { redis, em, req }: TMyContext
  ): Promise<UserResponse> {
    // TO DO: refactor validation
    if (newPassword.length < 8) {
      return {
        errors: [
          {
            field: 'newPassword',
            message: 'password length might be at least 8 characters',
          },
        ],
      };
    }

    const emailTokenKey = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(emailTokenKey);

    if (!userId) {
      return {
        errors: [
          {
            field: 'token',
            message: 'token expired',
          },
        ],
      };
    }

    const user = await em.findOne(User, { id: Number(userId) });

    if (!user) {
      return {
        errors: [
          {
            field: 'token',
            message: 'user no longer exist',
          },
        ],
      };
    }

    user.password = await argon2.hash(newPassword);
    await em.persistAndFlush(user);

    await redis.del(emailTokenKey);

    // Log in user after change password
    req.session.userId = user.id;

    return { user };
  }

  // CHANGE PASSWORD EMAIL
  @Mutation(() => Boolean)
  async sendChangePasswordEmail(
    @Arg('email') email: string,
    @Ctx() { em, redis }: TMyContext
  ) {
    const user = await em.findOne(User, { email });
    if (!user) return true;

    const token = v4();
    await redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id,
      'ex',
      1000 * 60 * 60 * 24 * 3
    );

    sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">Reset password</a>`
    );
  }

  // REGISTER
  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: TMyContext
  ): Promise<UserResponse> {
    // Consider using validation lib in the future
    const errors = validateRegister(options);
    if (errors) return { errors };

    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      email: options.email,
      username: options.username,
      password: hashedPassword,
    });

    try {
      await em.persistAndFlush(user);
    } catch (err) {
      // Code returned from DB for an existing field
      if (err.detail.includes('already exists')) {
        return {
          errors: [{ field: 'username', message: 'username already taken' }],
        };
      }
    }

    req.session.userId = user.id;

    return {
      user,
    };
  }

  // LOGIN
  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() { em, req }: TMyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(
      User,
      usernameOrEmail.includes('@')
        ? { email: usernameOrEmail }
        : { username: usernameOrEmail }
    );

    if (!user) {
      return {
        errors: [
          {
            field: 'usernameOrEmail',
            message: "that user doesn't exists",
          },
        ],
      };
    }

    const valid = await argon2.verify(user.password, password);

    if (!valid) {
      return {
        errors: [
          {
            field: 'password',
            message: 'incorrect password',
          },
        ],
      };
    }

    // Store userId in session & set a cookie on the user
    // Keep a user logged in after registration
    req.session.userId = user.id;

    return {
      user,
    };
  }

  @Query(() => User, { nullable: true })
  async auth(@Ctx() { em, req }: TMyContext) {
    // User is not logged in
    if (!req.session.userId) {
      return null;
    }

    const user = await em.findOne(User, { id: req.session.userId });
    return user;
  }

  // LOGOUT
  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: TMyContext) {
    return new Promise(resolve =>
      req.session.destroy(err => {
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }

        res.clearCookie(COOKIE_NAME);
        resolve(true);
      })
    );
  }
}
