import { Connection, EntityManager, IDatabaseDriver } from '@mikro-orm/core';

export type TMyContext = {
  em: EntityManager<IDatabaseDriver<Connection>>;
};
