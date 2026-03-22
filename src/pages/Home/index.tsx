import VideoCard from '@/components/VideoCard';
import { type PublicCategory } from '@/services/publicCategories';
import { listPublicVideos, type PublicVideo } from '@/services/publicVideos';
import { AppstoreOutlined, RightOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { Alert, Button, Card, Col, Empty, Row, Spin, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import styles from './index.less';

const { Title, Text } = Typography;

const toCardData = (video: PublicVideo) => ({
  ...video,
  routePath: `/browse/${video.id}`,
  name: video.title,
  author: video.owner_name || video.author || 'Media Stream',
  date: video.created_at || 'Recently added',
  views: video.views || video.view_count || 'Public',
  thumbnail: video.thumbnail,
  thumbnail_url: video.thumbnail_url,
  description: video.description,
  description_preview: video.description_preview || video.description,
  category_display: video.category_name || video.category_display,
  category_name: video.category_name || video.category_display,
});

const TagsBar = ({ tags }: { tags: PublicCategory[] }) => (
  <div className={styles.tagsWrap}>
    <div className={styles.tagsBar}>
      <button
        type="button"
        onClick={() => history.push('/browse')}
        className={styles.tagChip}
      >
        All Videos
      </button>
      {tags.map((tag) => (
        <button
          key={tag.slug}
          type="button"
          onClick={() => history.push(`/categories/${tag.slug}`)}
          className={styles.tagChip}
        >
          {tag.name}
        </button>
      ))}
    </div>
  </div>
);

const ChannelRow = ({ title, path, items, description }: any) => (
  <section className={styles.sectionBlock}>
    <div className={styles.sectionHeader}>
      <div className={styles.sectionTitleWrap}>
        <span className={styles.sectionIcon}>
          <AppstoreOutlined />
        </span>
        <div>
          <Title level={3} className={styles.sectionTitle}>
            {title}
          </Title>
          <Text className={styles.sectionDescription}>{description}</Text>
        </div>
      </div>
      <Button
        type="link"
        onClick={() => history.push(path)}
        className={styles.sectionAction}
      >
        Show more <RightOutlined style={{ fontSize: 10 }} />
      </Button>
    </div>

    {items.length === 0 ? (
      <Empty description={`No videos available in ${title} yet.`} />
    ) : (
      <Row gutter={[14, 18]}>
        {items.map((item: PublicVideo) => (
          <Col xs={24} sm={12} md={8} lg={6} xl={6} key={item.id}>
            <VideoCard data={toCardData(item)} />
          </Col>
        ))}
      </Row>
    )}
  </section>
);

export default function HomePage() {
  const { initialState } = useModel('@@initialState');
  const categories = initialState?.publicCategories || [];
  const [videos, setVideos] = useState<PublicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    listPublicVideos({ ordering: '-created_at', page_size: 24 })
      .then((response) => setVideos(response.results))
      .catch((error: any) =>
        setErrorMessage(
          error?.message || 'Unable to load public videos right now.',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const latestVideos = videos.slice(0, 4);
  const sections = useMemo(
    () =>
      categories.slice(0, 3).map((category) => ({
        ...category,
        items: videos
          .filter((video) => video.category === category.slug)
          .slice(0, 4),
      })),
    [categories, videos],
  );

  return (
    <PageContainer title={false} ghost contentWidth="Fluid">
      <div className={styles.pageShell}>
        <Card bordered={false} className={styles.heroCard}>
          <div className={styles.heroHeader}>
            <div>
              <Text className={styles.heroEyebrow}>Public library</Text>
              <Title level={2} className={styles.heroTitle}>
                Browse the latest public videos by topic.
              </Title>
              <Text className={styles.heroDescription}>
                Explore fresh uploads, jump into category pages, or open the
                full browse experience for search, sorting, and filters.
              </Text>
            </div>
          </div>
          <TagsBar tags={categories} />
        </Card>

        {errorMessage ? (
          <Alert
            type="error"
            showIcon
            message={errorMessage}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <Spin />
          </div>
        ) : (
          <>
            <ChannelRow
              title="Latest"
              path="/browse"
              description="Recently published public videos across the platform."
              items={latestVideos}
            />
            {sections.map((section) => (
              <ChannelRow
                key={section.slug}
                title={section.name}
                path={`/categories/${section.slug}`}
                description={`Browse the latest videos in ${section.name}.`}
                items={section.items}
              />
            ))}
          </>
        )}
      </div>
    </PageContainer>
  );
}
