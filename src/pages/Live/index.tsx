import VideoCard from '@/components/VideoCard';
import { getLiveList, type FrontendLiveStatus, type LiveBroadcast } from '@/services/live';
import { VideoCameraOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useLocation, useModel } from '@umijs/max';

import { firstNonEmpty, safeImageUrl, safeOptionalText, safeText } from '@/utils/fallbacks';
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

const getStatusPresentation = (status: FrontendLiveStatus) => {
  if (status === 'live') {
    return {
      label: 'LIVE',
      description: 'On air now',
      isLive: true,
    };
  }

  if (status === 'ready') {
    return {
      label: 'ready',
      description: 'Ready to go live',
      isLive: false,
    };
  }

  if (status === 'ended') {
    return {
      label: 'ended',
      description: 'Broadcast ended',
      isLive: false,
    };
  }

  return {
    label: 'waiting',
    description: 'Stream warming up',
    isLive: false,
  };
};

const LIVE_FALLBACK_COVER = '/assets/NotStart.png';

const getPosterUrl = (item: LiveBroadcast) =>
  safeImageUrl(
    firstNonEmpty(item.thumbnail_url, item.preview_image_url, item.snapshot_url),
  );

const isNotStartedStatus = (status: FrontendLiveStatus) =>
  status === 'ready' || status === 'waiting';

const isNewsLiveStream = (stream: LiveBroadcast) => {
  const categoryValue = String(stream.category || '').toLowerCase();
  return categoryValue.includes('news');
};

const toLiveVideoCardData = (item: LiveBroadcast) => {
  const normalizedStatus = item.normalized_status || 'waiting';
  const status = getStatusPresentation(normalizedStatus);
  const creatorName = safeText(
    item.creator?.name || item.creator?.username || item.creator?.email,
    'Unknown creator',
  );
  const viewerCount = item.viewer_count ?? item.viewerCount ?? 0;
  const posterUrl = getPosterUrl(item);
  const shouldUseFallbackCover =
    !posterUrl || isNotStartedStatus(normalizedStatus);

  return {
    id: item.id,
    routePath: `/live/${item.id}`,
    title: safeText(item.title || item.name, `Stream ${item.id}`),
    name: safeText(item.name || item.title, `Stream ${item.id}`),
    author: creatorName,
    owner_name: creatorName,
    created_at: firstNonEmpty(item.started_at, item.created_at),
    date: firstNonEmpty(item.started_at, item.created_at),
    thumbnail_url: shouldUseFallbackCover ? LIVE_FALLBACK_COVER : posterUrl,
    thumbnail: shouldUseFallbackCover ? LIVE_FALLBACK_COVER : posterUrl,
    category_name: safeText(item.category, 'Live broadcast'),
    category_display: safeText(item.category, 'Live broadcast'),
    views: `${viewerCount.toLocaleString()} viewers`,
    description: safeOptionalText(`${status.description} · ${status.label.toUpperCase()}`),
    description_preview: safeOptionalText(`${status.description} · ${status.label.toUpperCase()}`),
    status: status.isLive ? 'broadcasting' : String(item.status || '').toLowerCase(),
    duration_display: 'LIVE',
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
            error?.message || 'Unable to load live broadcasts right now.',
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
  }, []);

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
                Browse live events and open a room to watch stream playback and
                status.
              </Text>
            </div>
            <Button
              type="primary"
              icon={<VideoCameraOutlined />}
              onClick={handleGoLiveClick}
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
            <Empty description="No live streams are available yet.">
              <Button type="primary" onClick={handleGoLiveClick}>
                Create the first stream
              </Button>
            </Empty>
          </Card>
        ) : (
          <Row gutter={[14, 18]}>
            {visibleStreams.map((item) => (
              <Col xs={24} sm={12} md={8} lg={6} xl={6} key={String(item.id)}>
                <VideoCard data={toLiveVideoCardData(item)} />
              </Col>
            ))}
          </Row>
        )}
      </div>
    </PageContainer>
  );
}
