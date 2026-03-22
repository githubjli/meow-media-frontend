import {
  ClockCircleOutlined,
  FolderOpenOutlined,
  LikeOutlined,
  SaveOutlined,
  ShareAltOutlined,
  UserAddOutlined,
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
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  getPublicVideoDetail,
  listPublicVideos,
  type PublicVideo,
} from '@/services/publicVideos';

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
  video?.channel_name ||
  video?.author ||
  video?.category_display ||
  'Media Stream';

const getThumbnail = (video: PublicVideo) =>
  video.thumbnail_url ||
  video.thumbnail ||
  `https://picsum.photos/seed/${video.id}/640/360`;

const getRecommendationMeta = (video: PublicVideo) =>
  [video.category_display, formatDate(video.created_at)]
    .filter(Boolean)
    .join(' • ');

const getSubscriberLabel = (video?: PublicVideo | null) => {
  const fallbackSeed = String(video?.id || getAuthorLabel(video)).length;
  return `${(fallbackSeed * 17 + 120).toLocaleString()} followers`;
};

const RecommendationItem = ({ video }: { video: PublicVideo }) => {
  const title = video.title || `Video #${video.id}`;
  const authorLabel = getAuthorLabel(video);

  return (
    <div
      onClick={() => history.push(`/browse/${video.id}`)}
      style={{
        display: 'flex',
        gap: 12,
        cursor: 'pointer',
        borderRadius: 16,
        padding: 10,
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = 'translateY(-1px)';
        event.currentTarget.style.boxShadow =
          '0 10px 24px rgba(15, 23, 42, 0.08)';
        event.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.92)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = 'translateY(0)';
        event.currentTarget.style.boxShadow = 'none';
        event.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div
        style={{
          width: 168,
          maxWidth: '42%',
          aspectRatio: '16 / 9',
          borderRadius: 14,
          overflow: 'hidden',
          flexShrink: 0,
          background: '#0f172a',
        }}
      >
        <img
          alt={title}
          src={getThumbnail(video)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <Title
          level={5}
          ellipsis={{ rows: 2 }}
          style={{ margin: '0 0 6px', fontSize: 14, lineHeight: 1.45 }}
        >
          {title}
        </Title>
        <Space size={8} align="center" style={{ marginBottom: 6 }}>
          <Avatar
            size={24}
            src={`https://api.dicebear.com/7.x/identicon/svg?seed=${authorLabel}`}
          />
          <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
            {authorLabel}
          </Text>
        </Space>
        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.5 }}>
          {getRecommendationMeta(video) || 'Recently added'}
        </Text>
      </div>
    </div>
  );
};

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

  const interactionItems = useMemo(
    () => [
      {
        key: 'like',
        label: 'Like',
        icon: <LikeOutlined />,
      },
      {
        key: 'save',
        label: 'Save',
        icon: <SaveOutlined />,
      },
      {
        key: 'share',
        label: 'Share',
        icon: <ShareAltOutlined />,
      },
    ],
    [],
  );

  const metadataItems = useMemo(() => {
    if (!video) {
      return [];
    }

    return [
      video.created_at
        ? {
            key: 'published',
            icon: <ClockCircleOutlined />,
            label: 'Published',
            value: formatDate(video.created_at),
          }
        : null,
      video.category_display
        ? {
            key: 'category',
            icon: <FolderOpenOutlined />,
            label: 'Category',
            value: video.category_display,
          }
        : null,
      {
        key: 'video-id',
        label: 'Video ID',
        value: String(video.id),
      },
    ].filter(Boolean) as Array<{
      key: string;
      icon?: ReactNode;
      label: string;
      value: string;
    }>;
  }, [video]);

  return (
    <PageContainer title={false}>
      <div style={{ padding: '8px 8px 20px' }}>
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
          <Row gutter={[20, 20]} align="top">
            <Col xs={24} lg={16} xl={17}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Card
                  bordered={false}
                  style={{ borderRadius: 18, overflow: 'hidden' }}
                >
                  {video.file_url ? (
                    <video
                      controls
                      style={{
                        width: '100%',
                        borderRadius: 14,
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
                </Card>

                <Card bordered={false} style={{ borderRadius: 18 }}>
                  <Space
                    wrap
                    size={[8, 8]}
                    style={{
                      width: '100%',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <Space wrap size={[8, 8]}>
                      {video.category_display ? (
                        <Tag color="processing">{video.category_display}</Tag>
                      ) : null}
                      <Text type="secondary">Public watch page</Text>
                    </Space>
                    <Button onClick={() => history.push('/browse')}>
                      Back to browse
                    </Button>
                  </Space>

                  <Title
                    level={2}
                    style={{ margin: '0 0 6px', lineHeight: 1.3 }}
                  >
                    {video.title || `Video #${video.id}`}
                  </Title>
                  <Text
                    type="secondary"
                    style={{ display: 'block', marginBottom: 16, fontSize: 14 }}
                  >
                    Published content with quick context, simple interactions,
                    and related videos nearby.
                  </Text>

                  <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
                    {metadataItems.map((item) => (
                      <Col xs={24} sm={12} md={8} key={item.key}>
                        <div
                          style={{
                            borderRadius: 14,
                            padding: '12px 14px',
                            background: 'rgba(15, 23, 42, 0.04)',
                            border: '1px solid rgba(15, 23, 42, 0.06)',
                            minHeight: 72,
                          }}
                        >
                          <Text
                            type="secondary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: 12,
                              marginBottom: 6,
                            }}
                          >
                            {item.icon}
                            {item.label}
                          </Text>
                          <div>
                            <Text strong style={{ fontSize: 14 }}>
                              {item.value}
                            </Text>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>

                  <div
                    style={{
                      borderRadius: 16,
                      padding: 12,
                      background: 'rgba(255, 255, 255, 0.78)',
                      border: '1px solid rgba(15, 23, 42, 0.06)',
                    }}
                  >
                    <Space
                      wrap
                      size={[12, 12]}
                      style={{ width: '100%', justifyContent: 'space-between' }}
                    >
                      <div>
                        <Text
                          strong
                          style={{ display: 'block', marginBottom: 4 }}
                        >
                          Quick actions
                        </Text>
                        <Text type="secondary">
                          UI-first controls for the public watch experience.
                        </Text>
                      </div>
                      <Space wrap size={[8, 8]}>
                        {interactionItems.map((action) => (
                          <Button key={action.key} icon={action.icon}>
                            {action.label}
                          </Button>
                        ))}
                      </Space>
                    </Space>
                  </div>
                </Card>

                <Card bordered={false} style={{ borderRadius: 18 }}>
                  <Space
                    align="start"
                    size={16}
                    style={{ width: '100%', justifyContent: 'space-between' }}
                    wrap
                  >
                    <Space
                      align="start"
                      size={16}
                      style={{ flex: 1, minWidth: 280 }}
                    >
                      <Avatar
                        size={64}
                        src={`https://api.dicebear.com/7.x/identicon/svg?seed=${getAuthorLabel(
                          video,
                        )}`}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Space wrap size={[8, 8]} style={{ marginBottom: 4 }}>
                          <Title level={4} style={{ margin: 0 }}>
                            {getAuthorLabel(video)}
                          </Title>
                          {video.category_display ? (
                            <Tag bordered={false} color="default">
                              {video.category_display}
                            </Tag>
                          ) : null}
                        </Space>
                        <Text
                          type="secondary"
                          style={{ display: 'block', marginBottom: 4 }}
                        >
                          {getSubscriberLabel(video)}
                        </Text>
                        <Text
                          type="secondary"
                          style={{ display: 'block', marginBottom: 14 }}
                        >
                          Featured public creator · Follow UI is
                          placeholder-only for this demo.
                        </Text>
                        <Paragraph
                          style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}
                        >
                          {video.description ||
                            'No description has been added for this video yet. Check the recommendation panel for more public content to explore.'}
                        </Paragraph>
                      </div>
                    </Space>

                    <Button type="primary" icon={<UserAddOutlined />}>
                      Follow
                    </Button>
                  </Space>
                </Card>
              </Space>
            </Col>

            <Col xs={24} lg={8} xl={7}>
              <Card
                bordered={false}
                title="Up next"
                style={{ borderRadius: 18 }}
                styles={{ body: { padding: 10 } }}
              >
                <Text
                  type="secondary"
                  style={{
                    display: 'block',
                    marginBottom: 12,
                    paddingInline: 4,
                  }}
                >
                  More public videos from the same category when available, with
                  latest uploads as backup.
                </Text>
                {recommendationsLoading ? (
                  <Skeleton active paragraph={{ rows: 6 }} title={false} />
                ) : recommendationsError ? (
                  <Alert type="error" showIcon message={recommendationsError} />
                ) : recommendations.length === 0 ? (
                  <Empty description="No recommendations available yet." />
                ) : (
                  <Space
                    direction="vertical"
                    size={8}
                    style={{ width: '100%' }}
                  >
                    {recommendations.map((item) => (
                      <RecommendationItem key={item.id} video={item} />
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
