import { SessionData } from 'express-session';
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from 'type-graphql';
import { getConnection } from 'typeorm';
import { Post } from '../entities/Posts';
import { Updoot } from '../entities/Updoot';
import { isAuth } from '../middleware/isAuth';
import { TMyContext } from '../types';

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];
  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  // Return only a part of text when Post will be requested
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 50);
  }

  // VOTE FOR POST
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg('postId', () => Int) postId: number,
    @Arg('value', () => Int) value: number,
    @Ctx() { req }: TMyContext
  ): Promise<Boolean> {
    let userIdFromSession: SessionData['userId'];
    if (req.session.userId) userIdFromSession = req.session.userId;
    const updootValue = value !== -1 ? 1 : -1;

    const existingUpdoot = await Updoot.findOne({
      where: { postId, userId: userIdFromSession },
    });

    // User changes an existing vote
    if (existingUpdoot && existingUpdoot.value !== updootValue) {
      await getConnection().transaction(async tm => {
        await tm.query(
          `
        update updoot
        set value = $1
        where "postId" = $2 and "userId" = $3
        `,
          [updootValue, postId, userIdFromSession]
        );

        await tm.query(
          `
        update post
        set points = points + $1
        where id = $2
        `,
          [2 * updootValue, postId]
        );
      });
      // Hasn't voted before
    } else if (!existingUpdoot) {
      await getConnection().transaction(async tm => {
        await tm.query(
          `
        insert into updoot ("userId", "postId", value)
        values ($1,$2,$3);
          `,
          [userIdFromSession, postId, updootValue]
        );

        await tm.query(
          `
        update post
        set points = points + $1
        where id = $2
        `,
          [updootValue, postId]
        );
      });
    }

    return true;
  }

  // GET
  @Query(() => PaginatedPosts)
  async posts(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null,
    @Ctx() { req }: TMyContext
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    // It is used to fill in returned hasMore field to show the client whether there are more posts left to be requested or not.
    const realLimitPlusOne = realLimit + 1;

    const replacements: any[] = [realLimitPlusOne, req.session.userId];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const posts = await getConnection().query(
      `
    select p.*,
    json_build_object(
      'id', u.id,
      'username', u.username,
      'email', u.email,
      'createdAt', u."createdAt",
      'updatedAt', u."updatedAt"
      ) creator,
    ${
      req.session.userId
        ? '(select value from updoot where "userId" = $2 and "postId" = p.id) "voteStatus"'
        : 'null as "voteStatus"'
    }
    from post p
    inner join public.user u on u.id = p."creatorId"
    ${cursor ? `where p."createdAt" < $3` : ''}
    order by p."createdAt" DESC
    limit $1
    `,
      replacements
    );

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne,
    };
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
