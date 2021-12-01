import { MikroORM } from '@mikro-orm/core';
import path from "path";
import { __prod__ } from './constants';
import { Post } from "./entities/Posts";

export default {
  entities: [Post],
  dbName: 'wreddit',
  type: 'postgresql',
  debug: !__prod__,
  user: 'hleb',
  password: 'Mydad-myhero77',
  migrations: {
    path: path.join(__dirname, './migrations'), // path to the folder with migrations
    pattern: /^[\w-]+\d+\.[tj]s$/, // regex pattern for the migration files
  }
} as Parameters<typeof MikroORM.init>[0];