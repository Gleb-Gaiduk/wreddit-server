import { Arg, Ctx, Int, Mutation, Query, Resolver } from 'type-graphql';
import { Post } from '../entities/Posts';
import { TMyContext } from '../types';

@Resolver()
export class PostResolver {
  // GET
  @Query(() => [Post])
  posts(@Ctx() ctx: TMyContext): Promise<Post[]> {
    return ctx.em.find(Post, {});
  }

  // GET BY ID
  @Query(() => Post, { nullable: true })
  post(
    @Arg('id', () => Int) id: number,
    @Ctx() ctx: TMyContext
  ): Promise<Post | null> {
    return ctx.em.findOne(Post, { id });
  }

  @Mutation(() => Post)
  async createPost(
    @Arg('title') title: string,
    @Ctx() ctx: TMyContext
  ): Promise<Post> {
    const post = ctx.em.create(Post, { title });
    await ctx.em.persistAndFlush(post);
    return post;
  }
}
