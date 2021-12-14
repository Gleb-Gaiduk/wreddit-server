import { TMyContext } from 'src/types';
import { MiddlewareFn } from 'type-graphql';

export const isAuth: MiddlewareFn<TMyContext> = ({ context }, next) => {
  if (!context.req.session.userId) {
    throw new Error('User is not authenticated');
  }

  return next();
};
