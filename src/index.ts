import { MikroORM } from '@mikro-orm/core';
import { ApolloServer } from 'apollo-server-express';
import connectRedis from 'connect-redis';
import cors from 'cors';
// import connectRedis from 'connect-redis';
import express from 'express';
import session from 'express-session';
import Redis from 'ioredis';
// import { createClient } from 'redis';
import { buildSchema } from 'type-graphql';
import { COOKIE_NAME, __prod__ } from './constants';
import mikroOrmConfig from './mikro-orm.config';
import { HelloResolver } from './resolvers/hello';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';

const main = async () => {
  const orm = await MikroORM.init(mikroOrmConfig);
  await orm.getMigrator().up();

  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis();

  app.use(
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    })
  );

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 86400 * 3, // 3 days
        httpOnly: true,
        secure: __prod__,
        sameSite: 'lax',
      },
      saveUninitialized: false,
      secret: 'sdfdsf24342fdsdfdsf23f2fdwf',
      resave: false,
    })
  );

  const appoloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    // context is an object accessible by all the resolvers
    context: ({ req, res }) => ({ em: orm.em, req, res, redis }),
  });

  appoloServer.applyMiddleware({ app, cors: false });

  app.listen(4000, () => {
    console.log('Server is started on 4000');
  });
};

main().catch(err => console.error(err));
