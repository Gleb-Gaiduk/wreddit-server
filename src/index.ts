import { MikroORM } from '@mikro-orm/core';
import express from 'express';
import mikroOrmConfig from './mikro-orm.config';

const main = async () => {
  const orm = await MikroORM.init(mikroOrmConfig);
  await orm.getMigrator().up();

  const app = express();

  app.listen(4000, () => {
    console.log('Server is started on 4000');
  });
};

main().catch(err => console.error(err));
