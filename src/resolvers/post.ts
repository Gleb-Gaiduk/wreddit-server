import { TMyContext } from 'src/types';
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from 'type-graphql';
import { Post } from '../entities/Posts';
import { isAuth } from '../middleware/isAuth';

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@Resolver()
export class PostResolver {
  // GET
  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return Post.find();
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
