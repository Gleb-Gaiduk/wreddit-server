import { ApolloServer } from 'apollo-server-express';
import connectRedis from 'connect-redis';
import cors from 'cors';
// import connectRedis from 'connect-redis';
import express from 'express';
import session from 'express-session';
import Redis from 'ioredis';
import 'reflect-metadata';
// import { createClient } from 'redis';
import { buildSchema } from 'type-graphql';
import { createConnection } from 'typeorm';
import { COOKIE_NAME, __prod__ } from './constants';
import { Post } from './entities/Posts';
import { User } from './entities/User';
import { HelloResolver } from './resolvers/hello';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';

const main = async () => {
  await createConnection({
    database: 'wreddit',
    type: 'postgres',
    username: 'hleb',
    password: 'Mydad-myhero77',
    // Show SQL in logs for each operation
    logging: true,
    synchronize: true,
    entities: [Post, User],
  });

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
    context: ({ req, res }) => ({ req, res, redis }),
  });

  appoloServer.applyMiddleware({ app, cors: false });

  app.listen(4000, () => {
    console.log('Server is started on 4000');
  });
};

main().catch(err => console.error(err));
