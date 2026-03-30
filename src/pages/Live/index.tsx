import VideoCard from '@/components/VideoCard';
import {
  getLiveList,
  type FrontendLiveStatus,
  type LiveBroadcast,
} from '@/services/live';
import { VideoCameraOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useLocation, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Skeleton,
  Space,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';

const { Title, Text } = Typography;

const getStatusPresentation = (status: FrontendLiveStatus, intl: any) => {
  if (status === 'live') {
    return {
      label: intl.formatMessage({ id: 'live.status.live' }),
      description: intl.formatMessage({ id: 'live.status.onAir' }),
      isLive: true,
    };
  }

  if (status === 'ready') {
    return {
      label: intl.formatMessage({ id: 'live.status.notStarted' }),
      description: intl.formatMessage({ id: 'live.status.readyToGoLive' }),
      isLive: false,
    };
  }

  if (status === 'ended') {
    return {
      label: intl.formatMessage({ id: 'live.status.ended' }),
      description: intl.formatMessage({ id: 'live.status.broadcastEnded' }),
      isLive: false,
    };
  }

  return {
    label: intl.formatMessage({ id: 'live.status.starting' }),
    description: intl.formatMessage({ id: 'live.status.streamStarting' }),
    isLive: false,
  };
};

const LIVE_FALLBACK_COVER = '/assets/NotStart.png';

const getPosterUrl = (item: LiveBroadcast) =>
  item.thumbnail_url || item.preview_image_url || item.snapshot_url || '';

const isNotStartedStatus = (status: FrontendLiveStatus) =>
  status === 'ready' || status === 'waiting_for_signal';

const isNewsLiveStream = (stream: LiveBroadcast) => {
  const categoryValue = String(stream.category || '').toLowerCase();
  return categoryValue.includes('news');
};

const toLiveVideoCardData = (item: LiveBroadcast, intl: any) => {
  const normalizedStatus = item.normalized_status || 'waiting_for_signal';
  const status = getStatusPresentation(normalizedStatus, intl);
  const creatorName =
    item.creator?.name ||
    item.creator?.username ||
    item.creator?.email ||
    intl.formatMessage({ id: 'live.common.creatorFallback' });
  const viewerCount = item.viewer_count ?? item.viewerCount ?? 0;
  const posterUrl = getPosterUrl(item);
  const shouldUseFallbackCover =
    !posterUrl || isNotStartedStatus(normalizedStatus);

  return {
    id: item.id,
    routePath: `/live/${item.id}`,
    title: item.title || item.name || `Stream ${item.id}`,
    name: item.title || item.name || `Stream ${item.id}`,
    author: creatorName,
    owner_name: creatorName,
    created_at: item.started_at || item.created_at,
    date: item.started_at || item.created_at,
    thumbnail_url: shouldUseFallbackCover ? LIVE_FALLBACK_COVER : posterUrl,
    thumbnail: shouldUseFallbackCover ? LIVE_FALLBACK_COVER : posterUrl,
    category_name:
      item.category ||
      intl.formatMessage({ id: 'live.common.categoryFallback' }),
    category_display:
      item.category ||
      intl.formatMessage({ id: 'live.common.categoryFallback' }),
    views: intl.formatMessage(
      { id: 'live.common.viewers' },
      { count: viewerCount.toLocaleString() },
    ),
    description: `${status.description} · ${status.label.toUpperCase()}`,
    description_preview: `${
      status.description
    } · ${status.label.toUpperCase()}`,
    status: status.isLive
      ? 'broadcasting'
      : String(item.status || '').toLowerCase(),
    normalized_status: normalizedStatus,
    duration_display: status.isLive
      ? intl.formatMessage({ id: 'videoCard.live' })
      : undefined,
  };
};

export default function ExploreLivePage() {
  const intl = useIntl();
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const [streams, setStreams] = useState<LiveBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const isCreator = Boolean(
    initialState?.currentUser &&
      (initialState.currentUser.is_creator ||
        initialState.currentUser.role === 'creator' ||
        initialState.currentUser.user_type === 'creator'),
  );
  const showNewsOnly = location.pathname === '/news/live';
  const visibleStreams = streams.filter((item) =>
    showNewsOnly ? isNewsLiveStream(item) : true,
  );
  const getLiveCreateUrl = () => '/live/create';
  const handleGoLiveClick = () => {
    history.push(
      isLoggedIn
        ? getLiveCreateUrl()
        : `/login?redirect=${encodeURIComponent(getLiveCreateUrl())}`,
    );
  };

  useEffect(() => {
    let active = true;

    getLiveList()
      .then((data) => {
        if (active) {
          setStreams(data);
        }
      })
      .catch((error: any) => {
        if (active) {
          setStreams([]);
          setErrorMessage(
            error?.message ||
              intl.formatMessage({ id: 'live.explore.error.load' }),
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [intl]);

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '8px 0 24px' }}>
        <Card bordered={false} style={{ borderRadius: 20, marginBottom: 20 }}>
          <Space
            align="start"
            style={{ width: '100%', justifyContent: 'space-between' }}
            wrap
          >
            <div>
              <Title level={2} style={{ margin: 0 }}>
                {intl.formatMessage({ id: 'nav.exploreLive' })}
              </Title>
              <Text type="secondary">
                {intl.formatMessage({ id: 'live.explore.subtitle' })}
              </Text>
            </div>
            <Button
              type="primary"
              icon={<VideoCameraOutlined />}
              onClick={handleGoLiveClick}
              disabled={isLoggedIn && !isCreator}
            >
              {intl.formatMessage({ id: 'nav.goLive' })}
            </Button>
          </Space>
        </Card>

        {errorMessage ? (
          <Alert
            type="warning"
            showIcon
            message={errorMessage}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        {loading ? (
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        ) : visibleStreams.length === 0 ? (
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <Empty
              description={intl.formatMessage({ id: 'live.explore.empty' })}
            >
              <Button type="primary" onClick={handleGoLiveClick}>
                {intl.formatMessage({ id: 'live.explore.createFirst' })}
              </Button>
            </Empty>
          </Card>
        ) : (
          <Row gutter={[14, 18]}>
            {visibleStreams.map((item) => (
              <Col xs={24} sm={12} md={8} lg={6} xl={6} key={String(item.id)}>
                <VideoCard data={toLiveVideoCardData(item, intl)} />
              </Col>
            ))}
          </Row>
        )}
      </div>
    </PageContainer>
  );
}
