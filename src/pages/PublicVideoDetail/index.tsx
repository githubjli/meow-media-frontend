import VideoCard from '@/components/VideoCard';
import {
  getPublicVideoDetail,
  listPublicVideos,
  type PublicVideo,
} from '@/services/publicVideos';
import {
  LikeOutlined,
  SaveOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Title, Text, Paragraph } = Typography;
const RECOMMENDATION_LIMIT = 6;

const formatDate = (value?: string) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getAuthorLabel = (video?: PublicVideo | null) =>
  video?.owner_name ||
  video?.author ||
  video?.category_display ||
  'Media Stream';

const toCardData = (video: PublicVideo) => ({
  ...video,
  routePath: `/browse/${video.id}`,
  name: video.title,
  author: video.category_display || 'Public video',
  date: formatDate(video.created_at) || 'Recently added',
  views: video.category_display || 'Public',
  thumbnail: video.thumbnail,
  thumbnail_url: video.thumbnail_url,
  description: video.description,
});

export default function PublicVideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<PublicVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [recommendations, setRecommendations] = useState<PublicVideo[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    getPublicVideoDetail(id)
      .then((data) => setVideo(data))
      .catch((error: any) => {
        setVideo(null);
        setErrorMessage(error?.message || 'Unable to load this video.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!video?.id) {
      setRecommendations([]);
      setRecommendationsLoading(false);
      setRecommendationsError('');
      return;
    }

    let active = true;
    const currentId = String(video.id);

    const loadRecommendations = async () => {
      setRecommendationsLoading(true);
      setRecommendationsError('');

      try {
        const sameCategoryResponse = video.category
          ? await listPublicVideos({
              category: video.category,
              ordering: '-created_at',
              page: 1,
              page_size: RECOMMENDATION_LIMIT + 1,
            })
          : { results: [] as PublicVideo[] };

        const sameCategoryItems = sameCategoryResponse.results.filter(
          (item) => String(item.id) !== currentId,
        );

        let mergedItems = sameCategoryItems;

        if (mergedItems.length < RECOMMENDATION_LIMIT) {
          const fallbackResponse = await listPublicVideos({
            ordering: '-created_at',
            page: 1,
            page_size: RECOMMENDATION_LIMIT + 3,
          });

          const seen = new Set(mergedItems.map((item) => String(item.id)));
          mergedItems = [
            ...mergedItems,
            ...fallbackResponse.results.filter((item) => {
              const itemId = String(item.id);
              if (itemId === currentId || seen.has(itemId)) {
                return false;
              }
              seen.add(itemId);
              return true;
            }),
          ];
        }

        if (active) {
          setRecommendations(mergedItems.slice(0, RECOMMENDATION_LIMIT));
        }
      } catch (error: any) {
        if (active) {
          setRecommendations([]);
          setRecommendationsError(
            error?.message || 'Unable to load recommendations right now.',
          );
        }
      } finally {
        if (active) {
          setRecommendationsLoading(false);
        }
      }
    };

    loadRecommendations();

    return () => {
      active = false;
    };
  }, [video?.id, video?.category]);

  const actions = useMemo(
    () => [
      { key: 'like', label: 'Like', icon: <LikeOutlined /> },
      { key: 'save', label: 'Save', icon: <SaveOutlined /> },
      { key: 'share', label: 'Share', icon: <ShareAltOutlined /> },
    ],
    [],
  );

  return (
    <PageContainer title={false}>
      <div style={{ padding: '8px 8px 24px' }}>
        {loading ? (
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <Skeleton active paragraph={{ rows: 10 }} />
          </Card>
        ) : errorMessage ? (
          <Alert type="error" showIcon message={errorMessage} />
        ) : !video ? (
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <Empty description="Video not found." />
          </Card>
        ) : (
          <Row gutter={[24, 24]} align="top">
            <Col xs={24} lg={16} xl={17}>
              <Space direction="vertical" size={20} style={{ width: '100%' }}>
                <Card
                  bordered={false}
                  style={{ borderRadius: 20, overflow: 'hidden' }}
                >
                  {video.file_url ? (
                    <video
                      controls
                      style={{
                        width: '100%',
                        borderRadius: 16,
                        background: '#000',
                        aspectRatio: '16/9',
                        display: 'block',
                      }}
                      src={video.file_url}
                    />
                  ) : (
                    <Card
                      size="small"
                      style={{
                        borderRadius: 16,
                        textAlign: 'center',
                        minHeight: 320,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Text type="secondary">
                        This video is not available for playback yet.
                      </Text>
                    </Card>
                  )}

                  <div style={{ marginTop: 20 }}>
                    <Space
                      wrap
                      size={[8, 8]}
                      style={{ width: '100%', justifyContent: 'space-between' }}
                    >
                      <Space wrap size={[8, 8]}>
                        {video.category_display ? (
                          <Tag color="processing">{video.category_display}</Tag>
                        ) : null}
                        {video.created_at ? (
                          <Text type="secondary">
                            Published {formatDate(video.created_at)}
                          </Text>
                        ) : null}
                      </Space>
                      <Button onClick={() => history.push('/browse')}>
                        Back to browse
                      </Button>
                    </Space>

                    <Title level={2} style={{ margin: '12px 0 8px' }}>
                      {video.title || `Video #${video.id}`}
                    </Title>

                    <Space wrap size={[8, 8]}>
                      {actions.map((action) => (
                        <Button key={action.key} icon={action.icon}>
                          {action.label}
                        </Button>
                      ))}
                    </Space>
                  </div>
                </Card>

                <Card bordered={false} style={{ borderRadius: 20 }}>
                  <Space align="start" size={16} style={{ width: '100%' }}>
                    <Avatar
                      size={56}
                      src={`https://api.dicebear.com/7.x/identicon/svg?seed=${getAuthorLabel(
                        video,
                      )}`}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Title level={4} style={{ margin: '0 0 4px' }}>
                        {getAuthorLabel(video)}
                      </Title>
                      <Text
                        type="secondary"
                        style={{ display: 'block', marginBottom: 12 }}
                      >
                        Demo-friendly creator card for public video playback.
                      </Text>
                      <Paragraph style={{ marginBottom: 0 }}>
                        {video.description || 'No description provided.'}
                      </Paragraph>
                    </div>
                  </Space>
                </Card>
              </Space>
            </Col>

            <Col xs={24} lg={8} xl={7}>
              <Card
                bordered={false}
                title="Up next"
                style={{ borderRadius: 20 }}
                bodyStyle={{ padding: 16 }}
              >
                {recommendationsLoading ? (
                  <Skeleton active paragraph={{ rows: 6 }} title={false} />
                ) : recommendationsError ? (
                  <Alert type="error" showIcon message={recommendationsError} />
                ) : recommendations.length === 0 ? (
                  <Empty description="No recommendations available yet." />
                ) : (
                  <Space
                    direction="vertical"
                    size={12}
                    style={{ width: '100%' }}
                  >
                    {recommendations.map((item) => (
                      <div key={item.id}>
                        <VideoCard data={toCardData(item)} />
                      </div>
                    ))}
                  </Space>
                )}
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </PageContainer>
  );
}
