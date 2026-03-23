import { EyeOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useLocation, useParams } from '@umijs/max';
import { Avatar, Card, Empty, Skeleton, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as vjs_module from 'video.js';
import 'video.js/dist/video-js.css';

import { listVideoComments, type CommentItem } from '@/services/engagement';
import { getLiveBroadcast, type LiveBroadcast } from '@/services/live';

const { Title, Text } = Typography;

const getLocationQuery = (search: string) => new URLSearchParams(search);

export default function LiveRoomPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const query = useMemo(
    () => getLocationQuery(location.search),
    [location.search],
  );
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [broadcast, setBroadcast] = useState<LiveBroadcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);

  const hlsUrl = broadcast?.hlsUrl || `/live-api/live/streams/${id}.m3u8`;
  const title = broadcast?.name || query.get('title') || `Live Session ${id}`;
  const category = broadcast?.category || query.get('category') || 'Live';
  const viewerLabel =
    typeof broadcast?.viewerCount === 'number'
      ? `${broadcast.viewerCount.toLocaleString()} watching`
      : 'Viewer count unavailable';

  useEffect(() => {
    if (!id) {
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const data = await getLiveBroadcast(id);
        if (active) {
          setBroadcast(data);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    const interval = window.setInterval(load, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }

    let active = true;
    setCommentsLoading(true);

    listVideoComments(id, { page: 1, page_size: 8 })
      .then((data) => {
        if (active) {
          setComments(data.results || []);
        }
      })
      .catch(() => {
        if (active) {
          setComments([]);
        }
      })
      .finally(() => {
        if (active) {
          setCommentsLoading(false);
        }
      });

    const interval = window.setInterval(() => {
      listVideoComments(id, { page: 1, page_size: 8 })
        .then((data) => active && setComments(data.results || []))
        .catch(() => active && setComments([]));
    }, 12000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [id]);

  useEffect(() => {
    const videojs: any = (vjs_module as any).default || vjs_module;
    if (!videoRef.current || !id || typeof videojs !== 'function') {
      return;
    }

    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }
    videoRef.current.innerHTML = '';

    const element = document.createElement('video-js');
    element.className = 'vjs-big-play-centered vjs-fluid';
    videoRef.current.appendChild(element);

    playerRef.current = videojs(element, {
      autoplay: true,
      controls: true,
      preload: 'auto',
      sources: [{ src: hlsUrl, type: 'application/x-mpegURL' }],
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [hlsUrl, id]);

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '8px 0 24px' }}>
        {loading ? (
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <Skeleton active paragraph={{ rows: 10 }} />
          </Card>
        ) : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card bordered={false} style={{ borderRadius: 20 }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color="error">LIVE</Tag>
                  <Tag>{category}</Tag>
                  <Tag icon={<EyeOutlined />}>{viewerLabel}</Tag>
                </Space>
                <Title level={2} style={{ margin: 0 }}>
                  {title}
                </Title>
                <Text type="secondary">
                  Live broadcast mode with HLS playback and a lightweight
                  companion chat panel.
                </Text>
              </Space>
            </Card>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 0.8fr)',
                gap: 20,
              }}
            >
              <Card
                bordered={false}
                style={{ borderRadius: 20, overflow: 'hidden' }}
              >
                <div
                  style={{
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: '#000',
                  }}
                >
                  <div ref={videoRef} key={id} />
                </div>
              </Card>

              <Card
                bordered={false}
                style={{ borderRadius: 20 }}
                title="Live Chat"
              >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Text type="secondary">
                    Temporary chat panel using the existing comments UI until
                    real-time messaging is added.
                  </Text>
                  {commentsLoading ? (
                    <Skeleton active paragraph={{ rows: 6 }} title={false} />
                  ) : comments.length > 0 ? (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 14,
                          background: 'rgba(15, 23, 42, 0.03)',
                          border: '1px solid rgba(15, 23, 42, 0.06)',
                        }}
                      >
                        <Space align="start" size={12}>
                          <Avatar src={comment.user?.avatar_url}>
                            {String(comment.user?.name || 'V')
                              .charAt(0)
                              .toUpperCase()}
                          </Avatar>
                          <div style={{ minWidth: 0 }}>
                            <Text strong style={{ display: 'block' }}>
                              {comment.user?.name || 'Viewer'}
                            </Text>
                            <Text type="secondary">{comment.content}</Text>
                          </div>
                        </Space>
                      </div>
                    ))
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Chat will appear here when comments are available."
                    />
                  )}
                </Space>
              </Card>
            </div>
          </Space>
        )}
      </div>
    </PageContainer>
  );
}
