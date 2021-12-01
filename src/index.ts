import { MikroORM } from '@mikro-orm/core';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import { buildSchema } from 'type-graphql';
import mikroOrmConfig from './mikro-orm.config';
import { HelloResolver } from './resolvers/hello';

const main = async () => {
  const orm = await MikroORM.init(mikroOrmConfig);
  await orm.getMigrator().up();

  const app = express();

  const appoloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver],
      validate: false,
    }),
  });

  appoloServer.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log('Server is started on 4000');
  });
};

main().catch(err => console.error(err));
