import VideoCard from '@/components/VideoCard';
import { listPublicVideos, type PublicVideo } from '@/services/publicVideos';
import {
  ClockCircleOutlined,
  PlaySquareOutlined,
  ReadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Alert, Button, Card, Col, Empty, Row, Spin, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import styles from './index.less';

const { Title, Text } = Typography;

const toCardData = (video: PublicVideo) => ({
  ...video,
  routePath: `/browse/${video.id}`,
  name: video.title,
  author: video.category_display || 'Public video',
  date: video.created_at || 'Recently added',
  views: video.category_display || 'Public',
  thumbnail: video.thumbnail,
  description: video.description,
});

const TagsBar = ({
  tags,
}: {
  tags: Array<{ label: string; value: string }>;
}) => (
  <div className={styles.tagsWrap}>
    <div className={styles.tagsBar}>
      {tags.map((tag) => (
        <button
          key={tag.value}
          type="button"
          onClick={() =>
            history.push(
              tag.value === 'all' ? '/browse' : `/categories/${tag.value}`,
            )
          }
          className={styles.tagChip}
        >
          {tag.label}
        </button>
      ))}
    </div>
  </div>
);

const ChannelRow = ({ title, path, items, icon, description }: any) => (
  <section className={styles.sectionBlock}>
    <div className={styles.sectionHeader}>
      <div className={styles.sectionTitleWrap}>
        <span className={styles.sectionIcon}>{icon}</span>
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
      <Row gutter={[20, 24]}>
        {items.map((item: PublicVideo) => (
          <Col xs={24} sm={12} md={8} lg={6} xl={6} key={item.id}>
            <VideoCard data={toCardData(item)} />
          </Col>
        ))}
      </Row>
    )}
  </section>
);

const matchCategory = (video: PublicVideo, target: string) => {
  const value = `${video.category || ''} ${
    video.category_display || ''
  }`.toLowerCase();
  return value.includes(target.toLowerCase());
};

export default function HomePage() {
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

  const categoryTags = useMemo(() => {
    const seen = new Map<string, { label: string; value: string }>();
    seen.set('all', { label: 'All Videos', value: 'all' });
    videos.forEach((video) => {
      if (video.category) {
        seen.set(video.category, {
          value: video.category,
          label: video.category_display || video.category,
        });
      }
    });
    return Array.from(seen.values()).slice(0, 6);
  }, [videos]);

  const latestVideos = videos.slice(0, 4);
  const techVideos = videos
    .filter((video) => matchCategory(video, 'tech'))
    .slice(0, 4);
  const entertainmentVideos = videos
    .filter((video) => matchCategory(video, 'entertainment'))
    .slice(0, 4);

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
          <TagsBar tags={categoryTags} />
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
              icon={<ClockCircleOutlined />}
              description="Recently published public videos across the platform."
              items={latestVideos}
            />
            <ChannelRow
              title="Tech"
              path="/categories/tech"
              icon={<ReadOutlined />}
              description="Technology-focused uploads, demos, and explainers."
              items={techVideos}
            />
            <ChannelRow
              title="Entertainment"
              path="/categories/entertainment"
              icon={<PlaySquareOutlined />}
              description="Watchable highlights, pop culture, and casual viewing picks."
              items={entertainmentVideos}
            />
          </>
        )}
      </div>
    </PageContainer>
  );
}
