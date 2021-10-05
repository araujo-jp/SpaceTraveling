import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head'
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router'
import Link from 'next/link'

import Header from '../../components/Header/'
import { ExitPreview } from '../../components/Preview/ExitPreview'
import Comments from '../../components/Comments'

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

import { FiCalendar, FiUser, FiClock } from "react-icons/fi";
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  navigation: {
    prevPost: {
      uid: string;
      data: {
        title: string
      }
    }[],
    nextPost: {
      uid: string;
      data: {
        title: string
      }
    }[],
  }
}

export default function Post({ post, preview, navigation }: PostProps): JSX.Element {
  const router = useRouter()

  if (router.isFallback) {
    return <h1>Carregando...</h1>
  }

  const formatedDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  )

  const edited = post.first_publication_date !== post.last_publication_date

  let editionDate
  if(edited) {
    editionDate = format(
      new Date(post.last_publication_date),
      "'* editado em' dd MMM yyyy', às' H':'m",
      {
        locale: ptBR,
      }
    )
  }

  const totalWords = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length;

    const words = contentItem.body.map(item => item.text.split(' ').length)
    words.map(word => (total += word))
    return total;
  }, 0);
  const readTime = Math.ceil(totalWords / 200)

  return (
    <>
      <Head>
        <title>{post.data.title} | Space Traveling</title>
      </Head>
      <Header />
      <img className={styles.banner} src={post.data.banner.url} alt="" />
      <main className={commonStyles.container}>
        <article className={styles.post}>
          <div className={styles.postHead}>
            <h1>{post.data.title}</h1>
            <ul>
              <li>
                <FiCalendar />
                <span>{formatedDate}</span>
              </li>
              <li>
                <FiUser />
                <span>{post.data.author}</span>
              </li>
              <li>
                <FiClock />
                <span>{`${readTime} min`}</span>
              </li>
            </ul>
            <span>{edited && editionDate}</span>
          </div>
          <div>
            {post.data.content.map(content => {
              return (
                <section key={content.heading} className={styles.postMain} >
                  <h2>{content.heading}</h2>
                  <div dangerouslySetInnerHTML={{ __html: RichText.asHtml(content.body) }} />
                </section>
              )
            })}
          </div>
        </article>

        <section className={commonStyles.container}>
          <div className={styles.navigation}>
            {navigation.prevPost[0] && (
              <div>
                <h3>{navigation.prevPost[0].data.title}</h3>
                <Link href={`/post/${navigation.prevPost[0].uid}`}>
                  <a>Post anterior</a>
                </Link>
              </div>
            )}
            {navigation.nextPost[0] && (
              <div>
                <h3>{navigation.nextPost[0].data.title}</h3>
                <Link href={`/post/${navigation.nextPost[0].uid}`}>
                  <a>Próximo post</a>
                </Link>
              </div>
            )}
          </div>
        </section>

        <Comments />
        {preview && (
          <div>
            <ExitPreview />
          </div>
        )}
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'post')
  ]);

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid
      }
    }
  })

  return {
    paths,
    fallback: true
  }
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient()
  const { slug } = params
  const response = await prismic.getByUID('post', String(slug), {
    ref: previewData?.ref || null,
  });

  const prevPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]'
    }
  )

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.last_publication_date desc]'
    }
  )

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  return {
    props: {
      post,
      navigation: {
        prevPost: prevPost?.results,
        nextPost: nextPost?.results,
      },
      preview,
    },
    revalidate: 60 * 30, // 30 min
  }
};
