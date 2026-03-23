import {
  ClockCircleOutlined,
  CommentOutlined,
  EyeOutlined,
  FolderOpenOutlined,
  LikeOutlined,
  ShareAltOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Input,
  Modal,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  createVideoComment,
  getVideoInteractionSummary,
  likeVideo,
  listVideoComments,
  subscribeChannel,
  unlikeVideo,
  unsubscribeChannel,
} from '@/services/engagement';
import {
  getPublicVideoDetail,
  listPublicVideos,
  type PublicVideo,
} from '@/services/publicVideos';
import type {
  CommentItem,
  CommentListResponse,
  VideoInteractionSummary,
} from '@/types/engagement';

const { Title, Text, Paragraph } = Typography;
const RECOMMENDATION_LIMIT = 6;
const COMMENT_PAGE_SIZE = 10;

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

const getCreatorLabel = (video?: PublicVideo | null) =>
  video?.owner_name ||
  video?.channel_name ||
  video?.author ||
  'Creator unavailable';

const getThumbnail = (video: PublicVideo) =>
  video.thumbnail_url ||
  video.thumbnail ||
  `https://picsum.photos/seed/${video.id}/640/360`;

const getRecommendationMeta = (video: PublicVideo) =>
  [video.category_display, formatDate(video.created_at)]
    .filter(Boolean)
    .join(' • ');

const RecommendationItem = ({ video }: { video: PublicVideo }) => {
  const title = video.title || `Video #${video.id}`;
  const authorLabel = getCreatorLabel(video);

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
          <Avatar size={24} src={video.owner_avatar_url}>
            {authorLabel.charAt(0).toUpperCase()}
          </Avatar>
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
  const { initialState } = useModel('@@initialState');
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<PublicVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [recommendations, setRecommendations] = useState<PublicVideo[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState('');
  const [interactionSummary, setInteractionSummary] =
    useState<VideoInteractionSummary | null>(null);
  const [interactionLoading, setInteractionLoading] = useState(true);
  const [comments, setComments] = useState<CommentListResponse | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState('');
  const [commentsSubmitting, setCommentsSubmitting] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [likeSubmitting, setLikeSubmitting] = useState(false);
  const [subscribeSubmitting, setSubscribeSubmitting] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

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

  useEffect(() => {
    if (!video?.id) {
      setInteractionSummary(null);
      setInteractionLoading(false);
      return;
    }

    let active = true;
    setInteractionLoading(true);

    getVideoInteractionSummary(video.id)
      .then((data) => {
        if (active) {
          setInteractionSummary(data);
        }
      })
      .catch(() => {
        if (active) {
          setInteractionSummary(null);
        }
      })
      .finally(() => {
        if (active) {
          setInteractionLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [video?.id]);

  useEffect(() => {
    if (!video?.id) {
      setComments(null);
      setCommentsLoading(false);
      setCommentsError('');
      return;
    }
    loadComments(true);
  }, [video?.id]);

  const isAuthenticated = Boolean(initialState?.currentUser?.email);
  const viewsLabel =
    video?.views || video?.view_count
      ? String(video.views || video.view_count)
      : 'Views unavailable';
  const videoId = String(video?.id || '');
  const channelId = video?.owner_id;
  const creatorName = video?.owner_name || 'Creator unavailable';
  const likeCount = interactionSummary?.like_count;
  const commentCount = interactionSummary?.comment_count;
  const subscriberCount = interactionSummary?.subscriber_count;
  const isLiked = Boolean(interactionSummary?.viewer_has_liked);
  const isSubscribed = Boolean(interactionSummary?.viewer_is_subscribed);
  const followerLabel =
    typeof subscriberCount === 'number'
      ? `${subscriberCount.toLocaleString()} followers`
      : 'Followers unavailable';
  const likeLabel =
    typeof likeCount === 'number'
      ? `${isLiked ? 'Liked' : 'Like'} · ${likeCount.toLocaleString()}`
      : isLiked
      ? 'Liked'
      : 'Like';
  const commentLabel =
    typeof commentCount === 'number'
      ? `${commentCount.toLocaleString()} comments`
      : 'Comments unavailable';
  const commentPreview = comments?.results || [];

  const getReturnUrl = () =>
    typeof window === 'undefined'
      ? `/browse/${videoId}`
      : `${window.location.pathname}${window.location.search}`;

  const openAuthModal = () => {
    setAuthModalOpen(true);
  };

  const navigateToAuth = (path: '/login' | '/register') => {
    history.push(`${path}?redirect=${encodeURIComponent(getReturnUrl())}`);
  };

  const loadComments = async (reset = false) => {
    if (!video?.id) {
      return;
    }

    setCommentsLoading(true);
    if (reset) {
      setCommentsError('');
    }

    try {
      const nextPage = comments?.next
        ? new URL(
            comments.next,
            typeof window !== 'undefined'
              ? window.location.origin
              : 'http://localhost',
          ).searchParams.get('page') || 1
        : 1;

      const payload = await listVideoComments(video.id, {
        page_size: COMMENT_PAGE_SIZE,
        page: reset || !comments?.next ? 1 : nextPage,
      });

      setComments((current) =>
        reset || !current
          ? payload
          : {
              ...payload,
              results: [...current.results, ...payload.results],
            },
      );
    } catch (error: any) {
      if (reset) {
        setComments(null);
      }
      setCommentsError(error?.message || 'Comments are unavailable right now.');
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleLoadMoreComments = async () => {
    await loadComments(false);
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    try {
      if (navigator?.clipboard?.writeText && shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        message.success('Video link copied to your clipboard.');
        return;
      }
    } catch (error) {}

    message.info('Copy the current page URL to share this video.');
  };

  const handleLike = async () => {
    if (!video?.id) {
      return;
    }

    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    const previousSummary = interactionSummary;
    const optimisticLiked = !isLiked;

    setInteractionSummary((current) => ({
      ...(current || { video_id: video.id }),
      viewer_has_liked: optimisticLiked,
      like_count:
        typeof current?.like_count === 'number'
          ? Math.max(current.like_count + (optimisticLiked ? 1 : -1), 0)
          : current?.like_count,
    }));

    setLikeSubmitting(true);
    try {
      const nextSummary = optimisticLiked
        ? await likeVideo(video.id)
        : await unlikeVideo(video.id).then(() => ({
            ...(previousSummary || { video_id: video.id }),
            viewer_has_liked: false,
            like_count:
              typeof previousSummary?.like_count === 'number'
                ? Math.max(previousSummary.like_count - 1, 0)
                : previousSummary?.like_count,
          }));

      setInteractionSummary((current) => ({
        ...(current || {}),
        ...nextSummary,
      }));
    } catch (error: any) {
      setInteractionSummary(previousSummary);
      message.error(error?.message || 'Unable to update like status.');
    } finally {
      setLikeSubmitting(false);
    }
  };

  const handleSubscribe = async () => {
    if (!channelId) {
      message.info('Creator information is unavailable for this video.');
      return;
    }

    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    const previousSummary = interactionSummary;
    const optimisticSubscribed = !isSubscribed;

    setInteractionSummary((current) => ({
      ...(current || { video_id: videoId }),
      viewer_is_subscribed: optimisticSubscribed,
      subscriber_count:
        typeof current?.subscriber_count === 'number'
          ? Math.max(
              current.subscriber_count + (optimisticSubscribed ? 1 : -1),
              0,
            )
          : current?.subscriber_count,
    }));

    setSubscribeSubmitting(true);
    try {
      if (optimisticSubscribed) {
        await subscribeChannel(channelId);
      } else {
        await unsubscribeChannel(channelId);
      }
    } catch (error: any) {
      setInteractionSummary(previousSummary);
      message.error(error?.message || 'Unable to update subscription status.');
    } finally {
      setSubscribeSubmitting(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!video?.id) {
      return;
    }

    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    const content = commentInput.trim();
    if (!content) {
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticComment: CommentItem = {
      id: tempId,
      video_id: video.id,
      parent_id: null,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      like_count: 0,
      reply_count: 0,
      viewer_has_liked: false,
      user: {
        id: initialState?.currentUser?.id || 'me',
        name:
          initialState?.currentUser?.username ||
          initialState?.currentUser?.email ||
          'You',
        avatar_url: initialState?.currentUser?.avatar_url,
      },
    };

    const previousInput = commentInput;
    setCommentInput('');
    setCommentsError('');
    setComments((current) => ({
      count: (current?.count || 0) + 1,
      next: current?.next || null,
      previous: current?.previous || null,
      results: [optimisticComment, ...(current?.results || [])],
    }));
    setInteractionSummary((current) => ({
      ...(current || { video_id: video.id }),
      comment_count: (current?.comment_count || 0) + 1,
    }));

    setCommentsSubmitting(true);
    try {
      const created = await createVideoComment(video.id, {
        content,
        parent_id: null,
      });
      setComments((current) => {
        if (!current) {
          return {
            count: 1,
            next: null,
            previous: null,
            results: [created],
          };
        }

        return {
          ...current,
          results: current.results.map((comment) =>
            comment.id === tempId ? created : comment,
          ),
        };
      });
    } catch (error: any) {
      setCommentInput(previousInput);
      setComments((current) =>
        current
          ? {
              ...current,
              count: Math.max(current.count - 1, 0),
              results: current.results.filter(
                (comment) => comment.id !== tempId,
              ),
            }
          : current,
      );
      setInteractionSummary((current) => ({
        ...(current || { video_id: video.id }),
        comment_count: Math.max((current?.comment_count || 1) - 1, 0),
      }));
      setCommentsError(error?.message || 'Unable to publish your comment.');
    } finally {
      setCommentsSubmitting(false);
    }
  };

  const interactionItems = useMemo(
    () => [
      {
        key: 'like',
        label: likeLabel,
        icon: <LikeOutlined />,
        type: isLiked ? ('primary' as const) : ('default' as const),
        onClick: handleLike,
        loading: likeSubmitting,
      },
      {
        key: 'share',
        label: 'Share',
        icon: <ShareAltOutlined />,
        type: 'default' as const,
        onClick: handleShare,
      },
    ],
    [isLiked, likeLabel, likeSubmitting],
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
                    Published content with creator context, engagement signals,
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
                      <Space wrap size={[8, 8, 8]}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            borderRadius: 999,
                            background: 'rgba(15, 23, 42, 0.05)',
                          }}
                        >
                          <EyeOutlined style={{ color: '#667085' }} />
                          <Text strong>{viewsLabel}</Text>
                        </div>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            borderRadius: 999,
                            background: 'rgba(15, 23, 42, 0.05)',
                          }}
                        >
                          <CommentOutlined style={{ color: '#667085' }} />
                          <Text strong>{commentLabel}</Text>
                        </div>
                      </Space>
                      <Space wrap size={[8, 8]}>
                        {interactionItems.map((action) => (
                          <Button
                            key={action.key}
                            icon={action.icon}
                            type={action.type}
                            onClick={action.onClick}
                            loading={action.loading}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </Space>
                    </Space>
                  </div>
                </Card>

                <Card bordered={false} style={{ borderRadius: 18 }}>
                  <Space
                    direction="vertical"
                    size={14}
                    style={{ width: '100%' }}
                  >
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
                        <Avatar size={64} src={video.owner_avatar_url}>
                          {creatorName.charAt(0).toUpperCase()}
                        </Avatar>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Space wrap size={[8, 8]} style={{ marginBottom: 4 }}>
                            <Title level={4} style={{ margin: 0 }}>
                              {creatorName}
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
                            {interactionLoading
                              ? 'Loading audience details…'
                              : followerLabel}
                          </Text>
                          <Text type="secondary" style={{ display: 'block' }}>
                            {video.owner_name
                              ? 'Creator profile pulled from the published video record.'
                              : 'Creator details are not available for this video yet.'}
                          </Text>
                        </div>
                      </Space>

                      <Button
                        type={isSubscribed ? 'default' : 'primary'}
                        icon={<UserAddOutlined />}
                        onClick={handleSubscribe}
                        loading={subscribeSubmitting}
                        disabled={!channelId}
                      >
                        {isSubscribed ? 'Subscribed' : 'Subscribe'}
                      </Button>
                    </Space>

                    <Paragraph
                      style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}
                    >
                      {video.description ||
                        'No description has been added for this video yet. Check the recommendation panel for more public content to explore.'}
                    </Paragraph>

                    <Divider style={{ margin: '4px 0' }} />

                    <Card
                      size="small"
                      bordered={false}
                      style={{
                        borderRadius: 16,
                        background: 'rgba(15, 23, 42, 0.03)',
                      }}
                      styles={{ body: { padding: 18 } }}
                    >
                      <Space
                        direction="vertical"
                        size={14}
                        style={{ width: '100%' }}
                      >
                        <Space
                          wrap
                          align="center"
                          style={{
                            width: '100%',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <Title level={5} style={{ margin: 0 }}>
                              Comments
                            </Title>
                            <Text type="secondary">{commentLabel}</Text>
                          </div>
                        </Space>

                        <Input.TextArea
                          rows={3}
                          value={commentInput}
                          placeholder={
                            isAuthenticated
                              ? 'Add a public comment'
                              : 'Log in to join the conversation.'
                          }
                          onChange={(event) =>
                            setCommentInput(event.target.value)
                          }
                          onClick={() => {
                            if (!isAuthenticated) {
                              openAuthModal();
                            }
                          }}
                        />
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <Button
                            type="primary"
                            loading={commentsSubmitting}
                            disabled={isAuthenticated && !commentInput.trim()}
                            onClick={handleSubmitComment}
                          >
                            Comment
                          </Button>
                        </div>

                        {commentsError && commentPreview.length > 0 ? (
                          <Alert
                            type="warning"
                            showIcon
                            message={commentsError}
                          />
                        ) : null}

                        {commentsLoading && commentPreview.length === 0 ? (
                          <Skeleton
                            active
                            paragraph={{ rows: 3 }}
                            title={false}
                          />
                        ) : commentsError && commentPreview.length === 0 ? (
                          <Alert
                            type="warning"
                            showIcon
                            message={commentsError}
                          />
                        ) : commentPreview.length > 0 ? (
                          <Space
                            direction="vertical"
                            size={12}
                            style={{ width: '100%' }}
                          >
                            {commentPreview.slice(0, 3).map((comment) => (
                              <div
                                key={comment.id}
                                style={{
                                  padding: '12px 14px',
                                  borderRadius: 14,
                                  background: '#fff',
                                  border: '1px solid rgba(15, 23, 42, 0.06)',
                                }}
                              >
                                <Space align="start" size={12}>
                                  <Avatar src={comment.user?.avatar_url}>
                                    {String(comment.user?.name || 'V')
                                      .charAt(0)
                                      .toUpperCase()}
                                  </Avatar>
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <Text
                                      strong
                                      style={{
                                        display: 'block',
                                        marginBottom: 2,
                                      }}
                                    >
                                      {comment.user?.name || 'Viewer'}
                                    </Text>
                                    <Text
                                      type="secondary"
                                      style={{
                                        display: 'block',
                                        marginBottom: 6,
                                        fontSize: 12,
                                      }}
                                    >
                                      {formatDate(comment.created_at)}
                                    </Text>
                                    <Text
                                      type="secondary"
                                      style={{ display: 'block' }}
                                    >
                                      {comment.content}
                                    </Text>
                                  </div>
                                </Space>
                              </div>
                            ))}
                            {comments?.next ? (
                              <Button
                                onClick={handleLoadMoreComments}
                                loading={commentsLoading}
                                style={{ alignSelf: 'flex-start' }}
                              >
                                Load more
                              </Button>
                            ) : null}
                          </Space>
                        ) : (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No comments yet."
                          />
                        )}
                      </Space>
                    </Card>
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
      <Modal
        open={authModalOpen}
        onCancel={() => setAuthModalOpen(false)}
        footer={null}
        centered
        title="Continue with your account"
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Text type="secondary">
            Log in or create an account to like videos, subscribe to creators,
            and join the comments.
          </Text>
          <Space size={12}>
            <Button type="primary" onClick={() => navigateToAuth('/login')}>
              Log In
            </Button>
            <Button onClick={() => navigateToAuth('/register')}>Sign Up</Button>
          </Space>
        </Space>
      </Modal>
    </PageContainer>
  );
}
