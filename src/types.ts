import { Connection, EntityManager, IDatabaseDriver } from '@mikro-orm/core';
import { Request, Response } from 'express';

declare module 'express-session' {
  export interface SessionData {
    userId: number;
  }
}

export type TMyContext = {
  em: EntityManager<IDatabaseDriver<Connection>>;
  req: Request;
  res: Response;
};
