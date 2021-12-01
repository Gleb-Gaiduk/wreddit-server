import { MikroORM } from '@mikro-orm/core';
import { Post } from './entities/Posts';
import mikroOrmConfig from './mikro-orm.config';

const main = async () => {
  const orm = await MikroORM.init(mikroOrmConfig);

  const post = orm.em.create(Post, { title: 'My First Post' });
  await orm.em.persistAndFlush(post);
};

main().catch(err => console.error(err))
