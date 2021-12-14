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
    @Ctx() { redis, req }: TMyContext
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
    const userIdNum = Number(userId);
    const user = await User.findOne(userIdNum);

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

    await User.update(
      { id: userIdNum },
      { password: await argon2.hash(newPassword) }
    );

    await redis.del(emailTokenKey);

    // Log in user after change password
    req.session.userId = user.id;

    return { user };
  }

  // CHANGE PASSWORD EMAIL
  @Mutation(() => Boolean)
  async sendChangePasswordEmail(
    @Arg('email') email: string,
    @Ctx() { redis }: TMyContext
  ) {
    const user = await User.findOne({ where: { email } });
    if (!user) return false;

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

    return true;
  }

  // REGISTER
  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { req }: TMyContext
  ): Promise<UserResponse> {
    // Consider using validation lib in the future
    const errors = validateRegister(options);
    if (errors) return { errors };

    const hashedPassword = await argon2.hash(options.password);

    let user;
    try {
      user = await User.create({
        email: options.email,
        username: options.username,
        password: hashedPassword,
      }).save();

      if (user) req.session.userId = user.id;
    } catch (err) {
      if (err.code === '23505') {
        return {
          errors: [{ field: 'username', message: 'username already taken' }],
        };
      }
    }

    return {
      user,
    };
  }

  // LOGIN
  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() { req }: TMyContext
  ): Promise<UserResponse> {
    const user = await User.findOne(
      usernameOrEmail.includes('@')
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } }
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
  auth(@Ctx() { req }: TMyContext) {
    // User is not logged in
    if (!req.session.userId) {
      return null;
    }

    return User.findOne({ where: { id: req.session.userId } });
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
