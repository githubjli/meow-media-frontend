import {
  getPublicVideoDetail,
  type PublicVideo,
} from '@/services/publicVideos';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';

const { Title, Text, Paragraph } = Typography;

export default function PublicVideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<PublicVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    getPublicVideoDetail(id)
      .then((data) => setVideo(data))
      .catch((error: any) =>
        setErrorMessage(error?.message || 'Unable to load this video.'),
      )
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '8px 0 24px' }}>
        {loading ? (
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        ) : errorMessage ? (
          <Alert type="error" showIcon message={errorMessage} />
        ) : !video ? (
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <Empty description="Video not found." />
          </Card>
        ) : (
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                alignItems: 'flex-start',
                marginBottom: 20,
              }}
            >
              <div>
                <Title level={2} style={{ marginTop: 0, marginBottom: 8 }}>
                  {video.title || `Video #${video.id}`}
                </Title>
                <Space wrap>
                  {video.category_display ? (
                    <Tag color="processing">{video.category_display}</Tag>
                  ) : null}
                  {video.created_at ? (
                    <Text type="secondary">Created {video.created_at}</Text>
                  ) : null}
                </Space>
              </div>
              <Button onClick={() => history.push('/browse')}>
                Back to browse
              </Button>
            </div>

            {video.file_url ? (
              <video
                controls
                style={{
                  width: '100%',
                  borderRadius: 16,
                  background: '#000',
                  marginBottom: 20,
                }}
                src={video.file_url}
              />
            ) : (
              <Card
                size="small"
                style={{
                  marginBottom: 20,
                  borderRadius: 16,
                  textAlign: 'center',
                }}
              >
                <Text type="secondary">
                  This video is not available for playback yet.
                </Text>
              </Card>
            )}

            <Title level={4}>Description</Title>
            <Paragraph>
              {video.description || 'No description provided.'}
            </Paragraph>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
