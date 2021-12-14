import { TMyContext } from 'src/types';
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from 'type-graphql';
import { getConnection } from 'typeorm';
import { Post } from '../entities/Posts';
import { isAuth } from '../middleware/isAuth';

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@Resolver(Post)
export class PostResolver {
  // Return only a part of text when Post will be requested
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 50);
  }

  // GET
  @Query(() => [Post])
  async posts(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null
  ): Promise<Post[]> {
    const realLimit = Math.min(50, limit);

    const qb = await getConnection()
      .getRepository(Post)
      .createQueryBuilder('p')
      .orderBy('"createdAt"', 'DESC')
      .take(realLimit);

    if (cursor) {
      qb.where('"createdAt" < :cursor', { cursor: new Date(Number(cursor)) });
    }

    return qb.getMany();
  }

  // GET BY ID
  @Query(() => Post, { nullable: true })
  post(@Arg('id') id: number): Promise<Post | undefined> {
    return Post.findOne(id);
  }

  // POST
  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg('options') options: PostInput,
    @Ctx() { req }: TMyContext
  ): Promise<Post> {
    return Post.create({
      title: options.title,
      text: options.text,
      creatorId: req.session.userId,
    }).save();
  }

  // PUT
  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg('id') id: number,
    @Arg('title', () => String, { nullable: true }) title: string
  ): Promise<Post | null> {
    const post = await Post.findOne({ where: { id } });
    if (!post) return null;

    if (typeof title !== 'undefined') {
      post.title = title;
      await Post.update({ id }, { title });
    }

    return post;
  }

  // DELETE
  @Mutation(() => Boolean)
  async deletePost(@Arg('id') id: number): Promise<boolean> {
    try {
      await Post.delete(id);
      return true;
    } catch (error) {
      return false;
    }
  }
}
